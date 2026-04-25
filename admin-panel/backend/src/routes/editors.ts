/** Generic editor-record REST handler — production-grade.
 *
 *  Powers `/api/editors/<resource>/...` for every editor plugin:
 *    spreadsheet.workbook  → /api/editors/spreadsheet
 *    document.page         → /api/editors/document
 *    slides.deck           → /api/editors/slides
 *    collab.page           → /api/editors/page
 *    whiteboard.canvas     → /api/editors/whiteboard
 *
 *  Hardening included:
 *    - Tenant isolation: every read/write asserts the row's tenantId
 *      matches the resolved request tenant. Cross-tenant attempts return
 *      404 (avoid leaking existence).
 *    - Idempotency: POST create accepts an `Idempotency-Key` header; a
 *      replay within 24h returns the original response.
 *    - Optimistic lock: snapshot writes accept `If-Match` header; mismatch
 *      returns 412.
 *    - Size caps: per-snapshot byte cap (configurable; default 100 MiB)
 *      enforced both at body length AND post-stream.
 *    - Rate limit: per-user, per-document — at most 1 snapshot save every
 *      500 ms (sliding window). Returns 429.
 *    - Soft delete: DELETE marks status='deleted'; snapshots keep storage
 *      objects until a janitor compacts. Reads of deleted records 404.
 *    - Audit: every create/update/delete/snapshot-save records to the
 *      audit log with actor + tenant + record + adapter + size.
 *    - Structured errors: `{ error, code, ... }` matching `StorageError`.
 *    - Backpressure: storage adapter timeouts propagate via AbortSignal so
 *      a hung backend can't pile up requests.
 */

import { Hono, type Context } from "hono";
import { requireAuth, currentUser } from "../middleware/auth";
import { uuid, token as randomToken } from "../lib/id";
import { bulkInsert } from "../lib/query";
import { recordAudit } from "../lib/audit";
import { db, nowIso } from "../db";
import { broadcastResourceChange } from "../lib/ws";
import { getTenantContext } from "../tenancy/context";
import {
  accessibleRecordIds,
  effectiveRole,
  grantAcl,
  listAcl,
  purgeAclForRecord,
  revokeAcl,
  roleAtLeast,
  seedDefaultAcl,
  type Role,
  type SubjectKind,
} from "../lib/acl";
import {
  getStorageRegistry,
  ObjectNotFound,
  isStorageError,
} from "../storage";

interface EditorConfig {
  resourceId: string;
  pathSegment: string;
  exportExt: string;
  yjsExt: string;
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

/** Per-snapshot byte cap. 100 MiB is enough for very large workbooks /
 *  whiteboards while still small enough to keep request latency bounded.
 *  Override via `EDITORS_SNAPSHOT_LIMIT_BYTES` env. */
const SNAPSHOT_LIMIT_BYTES = (() => {
  const v = process.env.EDITORS_SNAPSHOT_LIMIT_BYTES;
  if (!v) return 100 * 1024 * 1024;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 100 * 1024 * 1024;
})();

/** Per-user-per-document save cooldown. 500 ms is well under any normal
 *  typing cadence (auto-save itself is 1.5 s). Override via
 *  `EDITORS_SAVE_COOLDOWN_MS`. */
const SAVE_COOLDOWN_MS = (() => {
  const v = process.env.EDITORS_SAVE_COOLDOWN_MS;
  if (!v) return 500;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 500;
})();

/** Global storage operation timeout. Adapter calls that exceed this
 *  return 504 to the caller. */
const STORAGE_OP_TIMEOUT_MS = (() => {
  const v = process.env.EDITORS_STORAGE_TIMEOUT_MS;
  if (!v) return 30_000;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 30_000;
})();

/** Idempotency cache TTL. 24h matches the user-facing expectation that
 *  re-clicking "Create" within a day returns the same record. */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/* ---------------- in-memory throttles + idempotency ---------------- */

const lastSaveAt = new Map<string, number>();
function saveKey(userId: string, resource: string, recordId: string): string {
  return `${userId}:${resource}:${recordId}`;
}

interface IdempotencyEntry {
  expiresAt: number;
  body: unknown;
  status: number;
}
const idempotencyCache = new Map<string, IdempotencyEntry>();

function purgeExpiredIdempotency(): void {
  const now = Date.now();
  for (const [k, v] of idempotencyCache) {
    if (v.expiresAt < now) idempotencyCache.delete(k);
  }
}

/* ---------------- helpers ---------------- */

function objectKey(
  tenantId: string,
  pathSegment: string,
  id: string,
  ext: string,
): string {
  return `tenants/${tenantId}/${pathSegment}/${id.slice(0, 2)}/${id.slice(2, 4)}/${id}.${ext}`;
}

function configFor(c: Context):
  | { ok: true; cfg: EditorConfig }
  | { ok: false; status: 400; error: string } {
  const slug = c.req.param("resource");
  if (!slug) return { ok: false, status: 400, error: "missing resource" };
  const cfg = CONFIG[slug];
  if (!cfg) return { ok: false, status: 400, error: `unknown editor resource "${slug}"` };
  return { ok: true, cfg };
}

function tenantFromCtx(): string | null {
  const t = getTenantContext();
  return t?.tenantId ?? null;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout(${label}) after ${ms}ms`)), ms);
  });
  return Promise.race([p.finally(() => clearTimeout(timer)), timeoutPromise]);
}

interface EditorRecord {
  id: string;
  tenantId?: string;
  status?: string;
  exportAdapter?: string;
  exportObjectKey?: string;
  yjsAdapter?: string;
  yjsObjectKey?: string;
  htmlAdapter?: string;
  htmlObjectKey?: string;
  thumbnailAdapter?: string;
  thumbnailObjectKey?: string;
  yjsSizeBytes?: number;
  exportSizeBytes?: number;
  yjsEtag?: string;
  exportEtag?: string;
  updatedAt?: string;
  [k: string]: unknown;
}

function loadRecord(
  resource: string,
  id: string,
  tenantId: string | null,
): EditorRecord | null {
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = ? AND id = ?`)
    .get(resource, id) as { data: string } | undefined;
  if (!row) return null;
  const rec = JSON.parse(row.data) as EditorRecord;
  // Tenant isolation: pretend the record doesn't exist if it belongs to
  // a different tenant. Avoids leaking the existence of cross-tenant ids.
  if (rec.tenantId && tenantId && rec.tenantId !== tenantId) return null;
  if (rec.status === "deleted") return null;
  return rec;
}

/** Check the current user has at least `need` role on the record.
 *  Returns the loaded record + effective role on success, or a 403/404
 *  Response on failure. We return 404 for missing-access (not 403) to
 *  avoid leaking the existence of records the user shouldn't know about. */
function requireRole(
  c: Context,
  resource: string,
  id: string,
  need: Role,
): { ok: true; rec: EditorRecord; role: Role } | { ok: false; res: Response } {
  const user = currentUser(c);
  const tenantId = tenantFromCtx();
  const rec = loadRecord(resource, id, tenantId);
  if (!rec) return { ok: false, res: c.json({ error: "not found", code: "not-found" }, 404) };
  const role = effectiveRole({ resource, recordId: id, userId: user.id, tenantId });
  if (!role) return { ok: false, res: c.json({ error: "not found", code: "not-found" }, 404) };
  if (!roleAtLeast(role, need)) {
    return {
      ok: false,
      res: c.json(
        { error: `requires ${need} role (have ${role})`, code: "access-denied" },
        403,
      ),
    };
  }
  return { ok: true, rec, role };
}

function saveRecord(resource: string, rec: EditorRecord): void {
  rec.updatedAt = nowIso();
  db.prepare(
    `UPDATE records SET data = ?, updated_at = ? WHERE resource = ? AND id = ?`,
  ).run(JSON.stringify(rec), rec.updatedAt, resource, rec.id);
}

/* ---------------- error mapping ---------------- */

function errorToResponse(c: Context, err: unknown): Response {
  if (err instanceof ObjectNotFound) {
    return c.json({ error: "not found", code: "not-found" }, 404);
  }
  if (isStorageError(err)) {
    const status =
      err.code === "payload-too-large" ? 413 :
      err.code === "rate-limited" ? 429 :
      err.code === "access-denied" ? 403 :
      err.code === "precondition-failed" ? 412 :
      err.code === "checksum-mismatch" ? 422 :
      err.code === "timeout" ? 504 :
      err.code === "invalid-key" || err.code === "invalid-argument" ? 400 :
      500;
    return c.json(
      { error: err.message, code: err.code, adapter: err.adapter },
      status,
    );
  }
  const msg = err instanceof Error ? err.message : "unknown error";
  if (msg.startsWith("timeout(")) {
    return c.json({ error: msg, code: "timeout" }, 504);
  }
  return c.json({ error: msg, code: "internal-error" }, 500);
}

/* ---------------- routes ---------------- */

export const editorRoutes = new Hono();
editorRoutes.use("*", requireAuth);

/** POST /api/editors/:resource — create a new editor record. */
editorRoutes.post("/:resource", async (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  const cfg = r.cfg;

  const idemKey = c.req.header("idempotency-key")?.trim();
  if (idemKey) {
    purgeExpiredIdempotency();
    const cached = idempotencyCache.get(`${cfg.resourceId}:${idemKey}`);
    if (cached) {
      return c.json(cached.body as Record<string, unknown>, cached.status as 200 | 201);
    }
  }

  let body: { title?: string; folder?: string; slug?: string; parentId?: string } | null;
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    body = null;
  }

  const user = currentUser(c);
  const tenantId = tenantFromCtx() ?? "default";

  // Validate title length up front (matches the plugin services).
  const title = (body?.title ?? "Untitled").slice(0, 256);
  if (title.length === 0) {
    return c.json({ error: "title required", code: "invalid-argument" }, 400);
  }
  const folder = (body?.folder ?? "").slice(0, 256);
  if (folder.split("/").some((seg) => seg === "..")) {
    return c.json({ error: "folder cannot traverse", code: "invalid-argument" }, 400);
  }

  const id = uuid();
  const exportObjectKey = objectKey(tenantId, cfg.pathSegment, id, cfg.exportExt);
  const yjsObjectKey = objectKey(tenantId, cfg.pathSegment, id, cfg.yjsExt);

  const registry = getStorageRegistry();
  const defaultId = registry.getDefaultId();
  if (!defaultId) {
    return c.json(
      { error: "no storage backend configured", code: "internal-error" },
      500,
    );
  }

  const now = nowIso();
  const record: EditorRecord = {
    id,
    tenantId,
    title,
    folder,
    ...(body?.slug !== undefined && { slug: String(body.slug).slice(0, 256) }),
    ...(body?.parentId !== undefined && { parentId: String(body.parentId) }),
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
  bulkInsert(cfg.resourceId, [record as unknown as Record<string, unknown>]);
  // Seed default ACL: creator owns the doc, every member of the tenant
  // gets editor access by default. This preserves the existing UX
  // (every tenant member sees every doc) while making it possible to
  // remove the tenant grant for sensitive docs.
  seedDefaultAcl({
    resource: cfg.resourceId,
    recordId: id,
    ownerUserId: user.id,
    ownerEmail: user.email,
    tenantId,
  });
  recordAudit({
    actor: user.email,
    action: `${cfg.resourceId}.created`,
    resource: cfg.resourceId,
    recordId: id,
    payload: { title, folder, tenantId },
  });
  broadcastResourceChange(cfg.resourceId, id, "create", user.email);

  if (idemKey) {
    idempotencyCache.set(`${cfg.resourceId}:${idemKey}`, {
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
      body: record,
      status: 201,
    });
  }
  return c.json(record, 201);
});

/** GET /api/editors/:resource — list (filtered by ACL).
 *
 *  Returns only documents the current user has at least viewer access
 *  to: docs they own, docs explicitly shared with them, and docs the
 *  tenant has access to (via the auto-seeded tenant grant).
 *
 *  Rows are also annotated with the user's effective role on that doc
 *  so the frontend can render UI affordances (only show "Share" /
 *  "Delete" for owners, etc.). */
editorRoutes.get("/:resource", (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  const tenantId = tenantFromCtx();
  const user = currentUser(c);
  const limitParam = Number.parseInt(c.req.query("limit") ?? "200", 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 1000) : 200;

  const accessible = accessibleRecordIds({
    resource: r.cfg.resourceId,
    userId: user.id,
    tenantId,
  });

  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = ? ORDER BY updated_at DESC LIMIT ?`,
    )
    .all(r.cfg.resourceId, limit) as { data: string }[];
  const parsed = rows.map((row) => JSON.parse(row.data) as EditorRecord);
  const filtered = parsed
    .filter((p) =>
      p.status !== "deleted" &&
      (!tenantId || !p.tenantId || p.tenantId === tenantId) &&
      accessible.has(p.id),
    )
    .map((p) => {
      const role = effectiveRole({
        resource: r.cfg.resourceId,
        recordId: p.id,
        userId: user.id,
        tenantId,
      });
      return { ...p, role: role ?? "viewer" };
    });
  return c.json({ rows: filtered, total: filtered.length });
});

/** GET /api/editors/:resource/:id — fetch metadata. Requires viewer. */
editorRoutes.get("/:resource/:id", (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  const id = c.req.param("id") ?? "";
  const guard = requireRole(c, r.cfg.resourceId, id, "viewer");
  if (!guard.ok) return guard.res;
  return c.json({ ...guard.rec, role: guard.role });
});

/** PATCH /api/editors/:resource/:id — update title/folder/slug/parentId.
 *  Soft-restorable: changing status='deleted' is rejected here (use DELETE). */
editorRoutes.patch("/:resource/:id", async (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  const id = c.req.param("id") ?? "";
  // Editing metadata (title/folder/etc.) requires editor role; status
  // changes (archive) also require editor — we don't gate finer than
  // that since the existing UI ties them together.
  const guard = requireRole(c, r.cfg.resourceId, id, "editor");
  if (!guard.ok) return guard.res;
  const rec = guard.rec;

  let body: Record<string, unknown> | null;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: "expected JSON body", code: "invalid-argument" }, 400);
  }
  if (body && typeof body === "object") {
    if (typeof body.title === "string" && body.title.length > 0 && body.title.length <= 256) {
      rec.title = body.title;
    }
    if (typeof body.folder === "string" && body.folder.length <= 256 && !body.folder.split("/").includes("..")) {
      rec.folder = body.folder;
    }
    if (typeof body.slug === "string" && body.slug.length <= 256) {
      rec.slug = body.slug;
    }
    if (body.parentId === null || (typeof body.parentId === "string" && body.parentId.length === 0)) {
      delete rec.parentId;
    } else if (typeof body.parentId === "string") {
      rec.parentId = body.parentId;
    }
    if (body.status === "active" || body.status === "archived" || body.status === "template") {
      rec.status = body.status as string;
    }
  }
  saveRecord(r.cfg.resourceId, rec);
  const user = currentUser(c);
  recordAudit({
    actor: user.email,
    action: `${r.cfg.resourceId}.updated`,
    resource: r.cfg.resourceId,
    recordId: id,
    payload: { title: rec.title, folder: rec.folder, status: rec.status },
  });
  broadcastResourceChange(r.cfg.resourceId, id, "update", user.email);
  return c.json(rec);
});

/** DELETE /api/editors/:resource/:id — soft delete (status=deleted).
 *  Storage objects remain until the janitor compacts them. Only owners
 *  can delete a doc — editors can edit but not destroy. */
editorRoutes.delete("/:resource/:id", async (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  const id = c.req.param("id") ?? "";
  const guard = requireRole(c, r.cfg.resourceId, id, "owner");
  if (!guard.ok) return guard.res;
  const rec = guard.rec;

  rec.status = "deleted";
  saveRecord(r.cfg.resourceId, rec);
  // Purge ACL rows so they don't accumulate as ghost grants on a
  // record nobody can see anymore.
  purgeAclForRecord(r.cfg.resourceId, id);
  const user = currentUser(c);
  recordAudit({
    actor: user.email,
    action: `${r.cfg.resourceId}.deleted`,
    resource: r.cfg.resourceId,
    recordId: id,
    payload: { title: rec.title, hardDelete: false },
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
  const guard = requireRole(c, cfg.resourceId, id, "viewer");
  if (!guard.ok) return guard.res;
  const rec = guard.rec;

  const isYjs = kind === "yjs";
  const adapterSlug = isYjs
    ? rec.yjsAdapter
    : rec.exportAdapter ?? rec.htmlAdapter ?? rec.thumbnailAdapter;
  const objectKeyVal = isYjs
    ? rec.yjsObjectKey
    : rec.exportObjectKey ?? rec.htmlObjectKey ?? rec.thumbnailObjectKey;
  if (!adapterSlug || !objectKeyVal) {
    return c.json(
      { error: "snapshot keys missing on record", code: "internal-error" },
      500,
    );
  }
  let adapter;
  try {
    adapter = getStorageRegistry().getAdapter(adapterSlug);
  } catch (err) {
    return errorToResponse(c, err);
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), STORAGE_OP_TIMEOUT_MS);
    let result;
    try {
      result = await adapter.get(objectKeyVal, undefined, ctrl.signal);
    } finally {
      clearTimeout(t);
    }
    const { body, metadata } = result;
    const headers: Record<string, string> = {
      "Content-Type": isYjs ? "application/octet-stream" : metadata.contentType,
      "Content-Length": String(metadata.size),
      ETag: metadata.etag,
      "Cache-Control": "private, no-cache",
    };
    return new Response(body, { headers });
  } catch (err) {
    if (err instanceof ObjectNotFound) {
      // Snapshots are optional — return 204 so editors initialize blank.
      return new Response(null, { status: 204 });
    }
    return errorToResponse(c, err);
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
  const user = currentUser(c);
  const tenantId = tenantFromCtx();
  const guard = requireRole(c, cfg.resourceId, id, "editor");
  if (!guard.ok) return guard.res;
  const rec = guard.rec;

  // Per-user-per-doc rate limit (sliding window — single value compared to
  // last-save). For finer-grained limits, swap in token-bucket. The hard
  // cap is intentional: in normal collab flow the editor debounces saves
  // server-side, so any client over this rate is misbehaving.
  const k = saveKey(user.email, cfg.resourceId, id);
  const lastAt = lastSaveAt.get(k) ?? 0;
  const now = Date.now();
  if (now - lastAt < SAVE_COOLDOWN_MS) {
    c.header("Retry-After", String(Math.ceil((SAVE_COOLDOWN_MS - (now - lastAt)) / 1000)));
    return c.json({ error: "save rate limit exceeded", code: "rate-limited" }, 429);
  }
  lastSaveAt.set(k, now);

  // Optimistic lock: if the client supplies If-Match, must equal the
  // currently-recorded ETag for that snapshot kind.
  const ifMatch = c.req.header("if-match")?.trim();
  if (ifMatch) {
    const recordedEtag = kind === "yjs" ? rec.yjsEtag : rec.exportEtag;
    if (recordedEtag && recordedEtag !== ifMatch) {
      return c.json(
        { error: "etag mismatch", code: "precondition-failed", current: recordedEtag },
        412,
      );
    }
  }

  const isYjs = kind === "yjs";
  const adapterSlug = isYjs
    ? rec.yjsAdapter
    : rec.exportAdapter ?? rec.htmlAdapter ?? rec.thumbnailAdapter;
  const objectKeyVal = isYjs
    ? rec.yjsObjectKey
    : rec.exportObjectKey ?? rec.htmlObjectKey ?? rec.thumbnailObjectKey;
  if (!adapterSlug || !objectKeyVal) {
    return c.json(
      { error: "snapshot keys missing on record", code: "internal-error" },
      500,
    );
  }

  // Reject obviously oversized requests up front based on the
  // Content-Length header. The streaming path also enforces the limit so
  // a client that lies about CL still gets cut off mid-stream.
  const contentLengthHeader = c.req.header("content-length");
  const declaredLength = contentLengthHeader
    ? Number.parseInt(contentLengthHeader, 10)
    : null;
  if (declaredLength !== null && Number.isFinite(declaredLength) && declaredLength > SNAPSHOT_LIMIT_BYTES) {
    return c.json(
      { error: `snapshot exceeds limit ${SNAPSHOT_LIMIT_BYTES}`, code: "payload-too-large" },
      413,
    );
  }

  const contentType = c.req.header("content-type") ?? "application/octet-stream";
  const stream = c.req.raw.body;
  if (!stream) {
    return c.json({ error: "no body", code: "invalid-argument" }, 400);
  }

  // Wrap the stream in a counting + capping transform so we abort if we
  // exceed the byte cap.
  const boundedStream = capStream(stream, SNAPSHOT_LIMIT_BYTES);

  let adapter;
  try {
    adapter = getStorageRegistry().getAdapter(adapterSlug);
  } catch (err) {
    return errorToResponse(c, err);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), STORAGE_OP_TIMEOUT_MS);
  try {
    const meta = await adapter.put(
      objectKeyVal,
      boundedStream,
      { contentType: isYjs ? "application/octet-stream" : contentType },
      ctrl.signal,
    );
    clearTimeout(timer);

    // Persist size + etag for next optimistic-lock check.
    if (isYjs) {
      rec.yjsSizeBytes = meta.size;
      rec.yjsEtag = meta.etag;
    } else {
      rec.exportSizeBytes = meta.size;
      rec.exportEtag = meta.etag;
    }
    saveRecord(cfg.resourceId, rec);

    recordAudit({
      actor: user.email,
      action: `${cfg.resourceId}.snapshot.${kind}`,
      resource: cfg.resourceId,
      recordId: id,
      payload: {
        adapter: adapterSlug,
        size: meta.size,
        etag: meta.etag,
        tenantId,
      },
    });
    broadcastResourceChange(cfg.resourceId, id, "update", user.email);
    return c.json({ ok: true, size: meta.size, etag: meta.etag });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.message === "snapshot-too-large") {
      return c.json(
        { error: `snapshot exceeds limit ${SNAPSHOT_LIMIT_BYTES}`, code: "payload-too-large" },
        413,
      );
    }
    return errorToResponse(c, err);
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

/* ---------------- helpers ---------------- */

/** Wrap an upload stream in a transform that throws after `limit` bytes.
 *  Defends against clients that lie about Content-Length. */
function capStream(stream: ReadableStream<Uint8Array>, limit: number): ReadableStream<Uint8Array> {
  let total = 0;
  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        total += chunk.byteLength;
        if (total > limit) {
          controller.error(new Error("snapshot-too-large"));
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );
}

/* ---------------- ACL endpoints ----------------
 *
 *  Sharing surface for the office editor stack. Routes:
 *    GET    /:resource/:id/acl                  list all grants on a doc
 *    POST   /:resource/:id/acl                  grant role to a subject
 *    DELETE /:resource/:id/acl/:kind/:subject   revoke a grant
 *    POST   /:resource/:id/share                bulk-share by email
 *    POST   /:resource/:id/public-link          create a public-link token
 *
 *  Owners can grant/revoke any role; editors can only view ACL.
 *  All routes are tenant- and ACL-isolated through `requireRole`. */

interface UserRow {
  id: string;
  email: string;
  name: string;
}

editorRoutes.get("/:resource/:id/acl", (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  const id = c.req.param("id") ?? "";
  // Anyone with viewer access can SEE who has access (helps users
  // understand "who else is in this doc" without giving them control).
  const guard = requireRole(c, r.cfg.resourceId, id, "viewer");
  if (!guard.ok) return guard.res;
  const acl = listAcl(r.cfg.resourceId, id);
  // Resolve user IDs to emails/names for display. Tenant rows show
  // tenant name, public-link rows show shortened token.
  const userIds = acl
    .filter((a) => a.subjectKind === "user")
    .map((a) => a.subjectId);
  const userRows =
    userIds.length === 0
      ? []
      : (db
          .prepare(
            `SELECT id, email, name FROM users
             WHERE id IN (${userIds.map(() => "?").join(",")})`,
          )
          .all(...userIds) as UserRow[]);
  const usersById = new Map(userRows.map((u) => [u.id, u]));
  return c.json({
    rows: acl.map((a) => {
      if (a.subjectKind === "user") {
        const u = usersById.get(a.subjectId);
        return { ...a, displayName: u?.name ?? a.subjectId, email: u?.email ?? null };
      }
      if (a.subjectKind === "public-link") {
        return { ...a, displayName: `Link: ${a.subjectId.slice(0, 8)}…`, email: null };
      }
      if (a.subjectKind === "tenant") {
        return { ...a, displayName: "Everyone in this workspace", email: null };
      }
      return { ...a, displayName: "Anyone with the URL", email: null };
    }),
    selfRole: guard.role,
  });
});

editorRoutes.post("/:resource/:id/acl", async (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  const id = c.req.param("id") ?? "";
  const guard = requireRole(c, r.cfg.resourceId, id, "owner");
  if (!guard.ok) return guard.res;

  let body: { subjectKind?: string; subjectId?: string; role?: string } | null;
  try { body = (await c.req.json()) as typeof body; } catch { body = null; }
  const kind = body?.subjectKind as SubjectKind | undefined;
  const subjectId = body?.subjectId;
  const role = body?.role as Role | undefined;
  if (!kind || !subjectId || !role) {
    return c.json({ error: "subjectKind, subjectId, role required", code: "invalid-argument" }, 400);
  }
  if (!["user", "tenant", "public-link", "public"].includes(kind)) {
    return c.json({ error: `invalid subjectKind ${kind}`, code: "invalid-argument" }, 400);
  }
  if (!["owner", "editor", "viewer"].includes(role)) {
    return c.json({ error: `invalid role ${role}`, code: "invalid-argument" }, 400);
  }
  const user = currentUser(c);
  grantAcl({
    resource: r.cfg.resourceId,
    recordId: id,
    subjectKind: kind,
    subjectId,
    role,
    grantedBy: user.email,
  });
  recordAudit({
    actor: user.email,
    action: `${r.cfg.resourceId}.shared`,
    resource: r.cfg.resourceId,
    recordId: id,
    payload: { subjectKind: kind, subjectId, role },
  });
  return c.json({ ok: true });
});

editorRoutes.delete("/:resource/:id/acl/:kind/:subject", (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  const id = c.req.param("id") ?? "";
  const guard = requireRole(c, r.cfg.resourceId, id, "owner");
  if (!guard.ok) return guard.res;
  const kind = c.req.param("kind") as SubjectKind;
  const subjectId = c.req.param("subject") ?? "";
  if (!kind || !subjectId) {
    return c.json({ error: "kind/subject required", code: "invalid-argument" }, 400);
  }
  // Defence in depth: refuse to revoke the last owner grant — leaves
  // the doc unrecoverable. UI should also guard this but we enforce
  // server-side as the source of truth.
  if (kind === "user" && guard.rec.id) {
    const rows = listAcl(r.cfg.resourceId, id);
    const owners = rows.filter((row) => row.role === "owner" && row.subjectKind === "user");
    if (owners.length <= 1 && owners[0]?.subjectId === subjectId) {
      return c.json(
        { error: "cannot revoke the last owner", code: "invalid-argument" },
        400,
      );
    }
  }
  revokeAcl({
    resource: r.cfg.resourceId,
    recordId: id,
    subjectKind: kind,
    subjectId,
  });
  const user = currentUser(c);
  recordAudit({
    actor: user.email,
    action: `${r.cfg.resourceId}.unshared`,
    resource: r.cfg.resourceId,
    recordId: id,
    payload: { subjectKind: kind, subjectId },
  });
  return c.json({ ok: true });
});

editorRoutes.post("/:resource/:id/share", async (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  const id = c.req.param("id") ?? "";
  const guard = requireRole(c, r.cfg.resourceId, id, "owner");
  if (!guard.ok) return guard.res;

  let body: { emails?: string[]; role?: string } | null;
  try { body = (await c.req.json()) as typeof body; } catch { body = null; }
  const emails = (body?.emails ?? [])
    .filter((e) => typeof e === "string")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  const role = (body?.role as Role | undefined) ?? "editor";
  if (emails.length === 0) {
    return c.json({ error: "emails[] required", code: "invalid-argument" }, 400);
  }
  if (!["owner", "editor", "viewer"].includes(role)) {
    return c.json({ error: `invalid role ${role}`, code: "invalid-argument" }, 400);
  }
  // Resolve emails to user ids. Unknown emails are reported back so the
  // client can show "user X not found" inline.
  const placeholders = emails.map(() => "?").join(",");
  const userRows = db
    .prepare(
      `SELECT id, email FROM users WHERE LOWER(email) IN (${placeholders})`,
    )
    .all(...emails) as { id: string; email: string }[];
  const found = new Map(userRows.map((u) => [u.email.toLowerCase(), u]));
  const granted: Array<{ email: string; userId: string; role: Role }> = [];
  const notFound: string[] = [];
  const user = currentUser(c);
  for (const e of emails) {
    const u = found.get(e);
    if (!u) {
      notFound.push(e);
      continue;
    }
    grantAcl({
      resource: r.cfg.resourceId,
      recordId: id,
      subjectKind: "user",
      subjectId: u.id,
      role,
      grantedBy: user.email,
    });
    granted.push({ email: u.email, userId: u.id, role });
  }
  if (granted.length > 0) {
    recordAudit({
      actor: user.email,
      action: `${r.cfg.resourceId}.shared`,
      resource: r.cfg.resourceId,
      recordId: id,
      payload: { granted, role },
    });
  }
  return c.json({ granted, notFound });
});

editorRoutes.post("/:resource/:id/public-link", async (c) => {
  const r = configFor(c);
  if (!r.ok) return c.json({ error: r.error }, r.status);
  const id = c.req.param("id") ?? "";
  const guard = requireRole(c, r.cfg.resourceId, id, "owner");
  if (!guard.ok) return guard.res;

  let body: { role?: string } | null;
  try { body = (await c.req.json()) as typeof body; } catch { body = null; }
  const role = (body?.role as Role | undefined) ?? "viewer";
  if (!["editor", "viewer"].includes(role)) {
    return c.json({ error: `invalid role ${role} for public link`, code: "invalid-argument" }, 400);
  }
  const link = randomToken();
  const user = currentUser(c);
  grantAcl({
    resource: r.cfg.resourceId,
    recordId: id,
    subjectKind: "public-link",
    subjectId: link,
    role,
    grantedBy: user.email,
  });
  recordAudit({
    actor: user.email,
    action: `${r.cfg.resourceId}.public_link.created`,
    resource: r.cfg.resourceId,
    recordId: id,
    payload: { role, token: link.slice(0, 8) },
  });
  return c.json({ token: link, role });
});

/* ---------------- testing exports ---------------- */

export const __test__ = {
  CONFIG,
  SNAPSHOT_LIMIT_BYTES,
  SAVE_COOLDOWN_MS,
  resetThrottles(): void {
    lastSaveAt.clear();
    idempotencyCache.clear();
  },
};
