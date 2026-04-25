/** Generic editor-record REST handler.
 *
 *  Powers `/api/editors/<resource>/...` for every editor plugin:
 *    spreadsheet.workbook  → /api/editors/spreadsheet
 *    document.page         → /api/editors/document
 *    slides.deck           → /api/editors/slides
 *    collab.page           → /api/editors/page
 *    whiteboard.canvas     → /api/editors/whiteboard
 *
 *  Each resource has the same shape under the hood:
 *    - a metadata row in the generic `records` table (resource = …)
 *    - two storage objects (Yjs binary + native export) routed through
 *      `gutu-lib-storage` so they can live on local disk, S3, R2, etc.
 *
 *  Endpoints per resource:
 *    POST   /api/editors/:resource              — create record + reserve keys
 *    GET    /api/editors/:resource              — list (filtered by tenant)
 *    GET    /api/editors/:resource/:id          — fetch metadata
 *    DELETE /api/editors/:resource/:id          — soft delete (status=deleted)
 *    GET    /api/editors/:resource/:id/snapshot/yjs    — stream Yjs bytes
 *    POST   /api/editors/:resource/:id/snapshot/yjs    — write Yjs bytes
 *    GET    /api/editors/:resource/:id/snapshot/export — stream native export bytes
 *    POST   /api/editors/:resource/:id/snapshot/export — write native export bytes
 */

import { Hono, type Context } from "hono";
import { requireAuth, currentUser } from "../middleware/auth";
import { uuid } from "../lib/id";
import { bulkInsert } from "../lib/query";
import { recordAudit } from "../lib/audit";
import { db, nowIso } from "../db";
import { broadcastResourceChange } from "../lib/ws";
import { getTenantContext } from "../tenancy/context";
import {
  getStorageRegistry,
  ObjectNotFound,
  isStorageError,
} from "../storage";

interface EditorConfig {
  /** Resource id used in the records table — matches plugin definitions. */
  resourceId: string;
  /** Tenant-scoped object key path prefix. The trailing `/<shard>/<id>.<ext>`
   *  is appended automatically. Mirrors the plugin's services/main.service. */
  pathSegment: string;
  /** File extensions for the two snapshot kinds. */
  exportExt: string;
  yjsExt: string;
  /** Default content type to record on created files. */
  exportContentType: string;
}

const CONFIG: Record<string, EditorConfig> = {
  spreadsheet: {
    resourceId: "spreadsheet.workbook",
    pathSegment: "spreadsheets",
    exportExt: "xlsx",
    yjsExt: "yjs",
    exportContentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  document: {
    resourceId: "document.page",
    pathSegment: "documents",
    exportExt: "docx",
    yjsExt: "yjs",
    exportContentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  slides: {
    resourceId: "slides.deck",
    pathSegment: "slides",
    exportExt: "pptx",
    yjsExt: "yjs",
    exportContentType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
  page: {
    resourceId: "collab.page",
    pathSegment: "pages",
    exportExt: "html",
    yjsExt: "yjs",
    exportContentType: "text/html",
  },
  whiteboard: {
    resourceId: "whiteboard.canvas",
    pathSegment: "whiteboards",
    exportExt: "png",
    yjsExt: "yjs",
    exportContentType: "image/png",
  },
};

function objectKey(
  tenantId: string,
  pathSegment: string,
  id: string,
  ext: string,
): string {
  return `tenants/${tenantId}/${pathSegment}/${id.slice(0, 2)}/${id.slice(2, 4)}/${id}.${ext}`;
}

function configFor(c: { req: { param: (k: string) => string } }):
  | { ok: true; cfg: EditorConfig }
  | { ok: false; status: 400; error: string } {
  const slug = c.req.param("resource");
  const cfg = CONFIG[slug];
  if (!cfg) return { ok: false, status: 400, error: `unknown editor resource "${slug}"` };
  return { ok: true, cfg };
}

export const editorRoutes = new Hono();
editorRoutes.use("*", requireAuth);

/** POST /api/editors/:resource — create a new editor record. */
editorRoutes.post("/:resource", async (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  const cfg = r.cfg;
  const body = (await c.req.json().catch(() => null)) as
    | { title?: string; folder?: string; slug?: string; parentId?: string }
    | null;
  const user = currentUser(c);
  const tenant = getTenantContext();
  const tenantId = tenant?.tenantId ?? "default";

  const id = uuid();
  const exportObjectKey = objectKey(tenantId, cfg.pathSegment, id, cfg.exportExt);
  const yjsObjectKey = objectKey(tenantId, cfg.pathSegment, id, cfg.yjsExt);

  const registry = getStorageRegistry();
  const defaultId = registry.getDefaultId();
  if (!defaultId) return c.json({ error: "no storage backend configured" }, 500);

  const now = nowIso();
  const record = {
    id,
    tenantId,
    title: body?.title ?? "Untitled",
    folder: body?.folder ?? "",
    ...(body?.slug !== undefined && { slug: body.slug }),
    ...(body?.parentId !== undefined && { parentId: body.parentId }),
    createdBy: user.email,
    status: "active",
    exportAdapter: defaultId,
    exportObjectKey,
    yjsAdapter: defaultId,
    yjsObjectKey,
    summary: {},
    exportSizeBytes: 0,
    yjsSizeBytes: 0,
    createdAt: now,
    updatedAt: now,
  };
  bulkInsert(cfg.resourceId, [record]);
  recordAudit({
    actor: user.email,
    action: `${cfg.resourceId}.created`,
    resource: cfg.resourceId,
    recordId: id,
    payload: { title: record.title },
  });
  broadcastResourceChange(cfg.resourceId, id, "create", user.email);
  return c.json(record, 201);
});

/** GET /api/editors/:resource — list. */
editorRoutes.get("/:resource", (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  const tenant = getTenantContext();
  const tenantId = tenant?.tenantId ?? null;
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = ? ORDER BY updated_at DESC LIMIT 200`,
    )
    .all(r.cfg.resourceId) as { data: string }[];
  const parsed = rows.map((row) => JSON.parse(row.data) as { tenantId?: string; status?: string });
  const filtered = parsed.filter(
    (p) =>
      p.status !== "deleted" &&
      (!tenantId || !p.tenantId || p.tenantId === tenantId),
  );
  return c.json({ rows: filtered, total: filtered.length });
});

/** GET /api/editors/:resource/:id — fetch metadata. */
editorRoutes.get("/:resource/:id", (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  const id = c.req.param("id") ?? "";
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = ? AND id = ?`)
    .get(r.cfg.resourceId, id) as { data: string } | undefined;
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(JSON.parse(row.data));
});

/** DELETE /api/editors/:resource/:id — soft delete. */
editorRoutes.delete("/:resource/:id", async (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  const id = c.req.param("id");
  const user = currentUser(c);
  db.prepare(`DELETE FROM records WHERE resource = ? AND id = ?`).run(r.cfg.resourceId, id);
  recordAudit({
    actor: user.email,
    action: `${r.cfg.resourceId}.deleted`,
    resource: r.cfg.resourceId,
    recordId: id,
    payload: {},
  });
  broadcastResourceChange(r.cfg.resourceId, id, "delete", user.email);
  return c.json({ ok: true });
});

/* ---------------- snapshots (yjs / export) ---------------- */

type SnapshotKind = "yjs" | "export";

async function streamSnapshot(
  c: Context,
  cfg: EditorConfig,
  kind: SnapshotKind,
): Promise<Response> {
  const id = c.req.param("id") ?? "";
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = ? AND id = ?`)
    .get(cfg.resourceId, id) as { data: string } | undefined;
  if (!row) return c.json({ error: "not found" }, 404);
  const rec = JSON.parse(row.data) as {
    yjsAdapter?: string;
    yjsObjectKey?: string;
    exportAdapter?: string;
    exportObjectKey?: string;
    htmlAdapter?: string;
    htmlObjectKey?: string;
    thumbnailAdapter?: string;
    thumbnailObjectKey?: string;
  };

  const isYjs = kind === "yjs";
  const adapterSlug = isYjs
    ? rec.yjsAdapter
    : rec.exportAdapter ?? rec.htmlAdapter ?? rec.thumbnailAdapter;
  const objectKeyVal = isYjs
    ? rec.yjsObjectKey
    : rec.exportObjectKey ?? rec.htmlObjectKey ?? rec.thumbnailObjectKey;
  if (!adapterSlug || !objectKeyVal) {
    return c.json({ error: "snapshot keys missing on record" }, 500);
  }
  const adapter = getStorageRegistry().getAdapter(adapterSlug);
  try {
    const { body, metadata } = await adapter.get(objectKeyVal);
    return new Response(body, {
      headers: {
        "Content-Type": isYjs ? "application/octet-stream" : metadata.contentType,
        "Content-Length": String(metadata.size),
        ETag: metadata.etag,
      },
    });
  } catch (err) {
    if (err instanceof ObjectNotFound) {
      // Snapshots are optional — return 204 so editors initialize blank.
      return new Response(null, { status: 204 });
    }
    if (isStorageError(err)) {
      return c.json({ error: err.message, code: err.code }, 500);
    }
    throw err;
  }
}

editorRoutes.get("/:resource/:id/snapshot/yjs", async (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  return streamSnapshot(c, r.cfg, "yjs");
});

editorRoutes.get("/:resource/:id/snapshot/export", async (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  return streamSnapshot(c, r.cfg, "export");
});

async function writeSnapshot(
  c: Context,
  cfg: EditorConfig,
  kind: SnapshotKind,
): Promise<Response> {
  const id = c.req.param("id") ?? "";
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = ? AND id = ?`)
    .get(cfg.resourceId, id) as { data: string } | undefined;
  if (!row) return c.json({ error: "not found" }, 404);
  const rec = JSON.parse(row.data) as Record<string, unknown> & {
    yjsAdapter?: string;
    yjsObjectKey?: string;
    exportAdapter?: string;
    exportObjectKey?: string;
    htmlAdapter?: string;
    htmlObjectKey?: string;
    thumbnailAdapter?: string;
    thumbnailObjectKey?: string;
  };

  const isYjs = kind === "yjs";
  const adapterSlug = isYjs
    ? rec.yjsAdapter
    : rec.exportAdapter ?? rec.htmlAdapter ?? rec.thumbnailAdapter;
  const objectKeyVal = isYjs
    ? rec.yjsObjectKey
    : rec.exportObjectKey ?? rec.htmlObjectKey ?? rec.thumbnailObjectKey;
  if (!adapterSlug || !objectKeyVal) {
    return c.json({ error: "snapshot keys missing on record" }, 500);
  }

  const contentType = c.req.header("content-type") ?? "application/octet-stream";
  const stream = c.req.raw.body;
  if (!stream) return c.json({ error: "no body" }, 400);

  const adapter = getStorageRegistry().getAdapter(adapterSlug);
  try {
    const meta = await adapter.put(objectKeyVal, stream, {
      contentType: isYjs ? "application/octet-stream" : contentType,
    });
    // Update the size column so the list view stays accurate.
    const sizeKey = isYjs ? "yjsSizeBytes" : `${kind}SizeBytes`;
    rec[sizeKey] = meta.size;
    rec.updatedAt = nowIso();
    db.prepare(`UPDATE records SET data = ?, updated_at = ? WHERE resource = ? AND id = ?`).run(
      JSON.stringify(rec),
      rec.updatedAt as string,
      cfg.resourceId,
      id,
    );
    const user = currentUser(c);
    broadcastResourceChange(cfg.resourceId, id, "update", user.email);
    return c.json({ ok: true, size: meta.size, etag: meta.etag });
  } catch (err) {
    if (isStorageError(err)) {
      return c.json({ error: err.message, code: err.code }, 500);
    }
    throw err;
  }
}

editorRoutes.post("/:resource/:id/snapshot/yjs", async (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  return writeSnapshot(c, r.cfg, "yjs");
});

editorRoutes.post("/:resource/:id/snapshot/export", async (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  return writeSnapshot(c, r.cfg, "export");
});
