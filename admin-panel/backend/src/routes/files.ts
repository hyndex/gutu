import { Hono } from "hono";
import path from "node:path";
import { requireAuth, currentUser } from "../middleware/auth";
import { uuid } from "../lib/id";
import { bulkInsert } from "../lib/query";
import { recordAudit } from "../lib/audit";
import { db, nowIso } from "../db";
import { broadcastResourceChange } from "../lib/ws";
import { getTenantContext } from "../tenancy/context";
import {
  getStorageRegistry,
  LocalStorageAdapter,
  ObjectNotFound,
  isStorageError,
  collectStream,
  percentEncodeKey,
} from "../storage";

/** Sanitize a filename for Content-Disposition. Strips CR/LF/quote which
 *  would otherwise enable header injection, plus non-printable bytes. */
function sanitizeForHeader(name: string): string {
  return name.replace(/[\r\n"\\]/g, "").replace(/[\x00-\x1f\x7f]/g, "");
}

/** Build the per-tenant storage key used under the adapter's tenant prefix.
 *  Every file gets a UUID-based key so uploads from different users can't
 *  collide even if they pick the same filename. */
function makeObjectKey(id: string, filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return `files/${id.slice(0, 2)}/${id.slice(2, 4)}/${id}${ext}`;
}

export const filesRoutes = new Hono();
filesRoutes.use("*", requireAuth);

/** POST /api/files — multipart upload. Streams through the storage adapter
 *  declared as default (local, S3, R2, MinIO, Wasabi, ... — whichever was
 *  configured at boot). Metadata goes in the `files.file` resource. */
filesRoutes.post("/", async (c) => {
  const form = await c.req.formData().catch(() => null);
  if (!form) return c.json({ error: "expected multipart/form-data" }, 400);
  const file = form.get("file");
  if (!(file instanceof File)) return c.json({ error: "no file" }, 400);

  const ownerResource = String(form.get("resource") ?? "");
  const ownerId = String(form.get("recordId") ?? "");
  const backendSlug = String(form.get("backend") ?? "") || null;
  const user = currentUser(c);
  const tenant = getTenantContext();

  // Resolve adapter. Explicit backend wins, otherwise the registry default.
  const registry = getStorageRegistry();
  const slug = backendSlug ?? registry.getDefaultId();
  if (!slug) return c.json({ error: "no storage backend configured" }, 500);
  let adapter;
  try {
    adapter = registry.getAdapter(slug);
  } catch (err) {
    return c.json(
      { error: `unknown storage backend "${slug}": ${(err as Error).message}` },
      400,
    );
  }

  const id = uuid();
  const objectKey = makeObjectKey(id, file.name);

  try {
    const metadata = await adapter.put(objectKey, file.stream(), {
      contentType: file.type || "application/octet-stream",
      contentLength: file.size,
      custom: {
        "original-filename": file.name,
        "uploaded-by": user.email,
        ...(ownerResource && { "owner-resource": ownerResource }),
        ...(ownerId && { "owner-record-id": ownerId }),
      },
    });

    const now = nowIso();
    const record = {
      id,
      name: file.name,
      mimeType: metadata.contentType,
      sizeBytes: metadata.size,
      owner: user.email,
      uploadedAt: now,
      // Storage routing columns — every read uses these.
      storageAdapter: slug,
      objectKey,
      etag: metadata.etag,
      sha256: metadata.sha256,
      url: `/api/files/${id}/content`,
      resource: ownerResource || undefined,
      recordId: ownerId || undefined,
      tenantId: tenant?.tenantId,
    };
    bulkInsert("files.file", [record]);
    recordAudit({
      actor: user.email,
      action: "files.file.uploaded",
      resource: "files.file",
      recordId: id,
      payload: { name: file.name, size: file.size, adapter: slug },
    });
    broadcastResourceChange("files.file", id, "create", user.email);
    return c.json(record, 201);
  } catch (err) {
    if (isStorageError(err)) {
      return c.json(
        { error: err.message, code: err.code, adapter: err.adapter },
        err.code === "payload-too-large" ? 413 : 500,
      );
    }
    throw err;
  }
});

/** POST /api/files/presign — direct-to-cloud upload URL.
 *  Client uses this to upload huge files straight to S3/R2/Wasabi without
 *  the bytes ever touching this backend. Returns the URL + the key the
 *  client must POST back after the upload succeeds so we can persist the
 *  `files.file` record. */
filesRoutes.post("/presign", async (c) => {
  const body = await c.req.json().catch(() => null) as
    | {
        filename?: string;
        contentType?: string;
        backend?: string;
        resource?: string;
        recordId?: string;
        maxBytes?: number;
      }
    | null;
  if (!body?.filename) return c.json({ error: "filename required" }, 400);

  const registry = getStorageRegistry();
  const slug = body.backend ?? registry.getDefaultId();
  if (!slug) return c.json({ error: "no storage backend configured" }, 500);
  const adapter = registry.getAdapter(slug);
  if (!adapter.capabilities.presignPut) {
    return c.json(
      {
        error: `backend "${slug}" does not support presigned PUT. Upload via POST /api/files instead.`,
      },
      400,
    );
  }

  const id = uuid();
  const objectKey = makeObjectKey(id, body.filename);
  const presigned = await adapter.presign(objectKey, {
    operation: "put",
    expiresInSec: 900,
    ...(body.contentType !== undefined && { contentType: body.contentType }),
    ...(body.maxBytes !== undefined && {
      contentLengthRange: { min: 1, max: body.maxBytes },
    }),
  });

  // The client must POST /api/files/presign/commit after the upload
  // completes so we persist the record.
  return c.json({
    id,
    objectKey,
    backend: slug,
    upload: presigned,
  });
});

/** POST /api/files/presign/commit — persist a file record after a
 *  successful direct-to-cloud upload. The backend HEADs the object to
 *  confirm bytes are durable before writing the row. */
filesRoutes.post("/presign/commit", async (c) => {
  const body = (await c.req.json().catch(() => null)) as
    | {
        id?: string;
        objectKey?: string;
        backend?: string;
        filename?: string;
        resource?: string;
        recordId?: string;
      }
    | null;
  if (!body?.id || !body.objectKey || !body.backend || !body.filename) {
    return c.json({ error: "id, objectKey, backend, filename required" }, 400);
  }
  const user = currentUser(c);
  const tenant = getTenantContext();
  const registry = getStorageRegistry();
  const adapter = registry.getAdapter(body.backend);

  let meta;
  try {
    meta = await adapter.head(body.objectKey);
  } catch (err) {
    if (err instanceof ObjectNotFound) {
      return c.json({ error: "object not found — upload did not complete" }, 400);
    }
    throw err;
  }

  const now = nowIso();
  const record = {
    id: body.id,
    name: body.filename,
    mimeType: meta.contentType,
    sizeBytes: meta.size,
    owner: user.email,
    uploadedAt: now,
    storageAdapter: body.backend,
    objectKey: body.objectKey,
    etag: meta.etag,
    sha256: meta.sha256,
    url: `/api/files/${body.id}/content`,
    resource: body.resource || undefined,
    recordId: body.recordId || undefined,
    tenantId: tenant?.tenantId,
  };
  bulkInsert("files.file", [record]);
  recordAudit({
    actor: user.email,
    action: "files.file.uploaded",
    resource: "files.file",
    recordId: body.id,
    payload: {
      name: body.filename,
      size: meta.size,
      adapter: body.backend,
      flow: "presigned",
    },
  });
  broadcastResourceChange("files.file", body.id, "create", user.email);
  return c.json(record, 201);
});

/** GET /api/files/:id/content — read a file.
 *
 *  If the adapter supports presigned GET (S3 + compatible), we redirect the
 *  client to the cloud directly. Otherwise we stream through this process.
 *  `?redirect=0` forces the proxy path (useful for local dev and when
 *  the browser's CORS posture rejects direct cloud URLs). */
filesRoutes.get("/:id/content", async (c) => {
  const id = c.req.param("id");
  const row = db
    .prepare("SELECT data FROM records WHERE resource = 'files.file' AND id = ?")
    .get(id) as { data: string } | undefined;
  if (!row) return c.json({ error: "not found" }, 404);

  const rec = JSON.parse(row.data) as {
    storageAdapter?: string;
    objectKey?: string;
    // Legacy fields from pre-registry rows:
    storageName?: string;
    mimeType: string;
    name: string;
    tenantId?: string;
  };

  // Cross-tenant access refusal.
  const tenant = getTenantContext();
  if (rec.tenantId && tenant?.tenantId && rec.tenantId !== tenant.tenantId) {
    return c.json({ error: "not found" }, 404);
  }

  const registry = getStorageRegistry();
  const slug = rec.storageAdapter ?? registry.getDefaultId();
  if (!slug) return c.json({ error: "file has no adapter and no default is configured" }, 500);
  const adapter = registry.getAdapter(slug);

  // Legacy rows (pre-registry): synthesize objectKey from storageName.
  const objectKey = rec.objectKey ?? `legacy/${rec.storageName ?? id}`;

  const wantRedirect = c.req.query("redirect") !== "0";
  if (wantRedirect && adapter.capabilities.presignGet && adapter.id !== "local") {
    try {
      const presigned = await adapter.presign(objectKey, {
        operation: "get",
        expiresInSec: 300,
        responseContentDisposition: `inline; filename="${sanitizeForHeader(rec.name)}"`,
      });
      return c.redirect(presigned.url, 302);
    } catch {
      // Fall through to proxy.
    }
  }

  try {
    const { body, metadata } = await adapter.get(objectKey);
    const safeName = sanitizeForHeader(rec.name);
    return new Response(body, {
      headers: {
        "Content-Type": metadata.contentType,
        "Content-Length": String(metadata.size),
        "Content-Disposition": `inline; filename="${safeName}"`,
        ETag: metadata.etag,
      },
    });
  } catch (err) {
    if (err instanceof ObjectNotFound) {
      return c.json({ error: "missing on storage" }, 404);
    }
    if (isStorageError(err)) {
      return c.json(
        { error: err.message, code: err.code, adapter: err.adapter },
        500,
      );
    }
    throw err;
  }
});

/** GET /api/files/_signed/:key — HMAC-signed local-backend download.
 *  Called by presigned URLs issued by the LocalStorageAdapter. The adapter
 *  computes the signature; this handler verifies it, streams the bytes.
 *
 *  All S3-family backends bypass this path entirely — their presigned URLs
 *  point at the cloud. */
filesRoutes.get("/_signed/:key", async (c) => {
  const registry = getStorageRegistry();
  // We need the LocalStorageAdapter instance to verify. Only local-kind
  // backends can verify these URLs.
  const rawKey = decodeURIComponent(c.req.param("key"));
  const op = c.req.query("op") ?? "get";
  const exp = c.req.query("exp") ?? "";
  const sig = c.req.query("sig") ?? "";
  const contentType = c.req.query("ct") ?? undefined;
  const maxBytes = c.req.query("max") ?? undefined;
  const cd = c.req.query("cd") ?? undefined;

  // Find any local adapter that validates this signature. Admins can run
  // multiple local backends simultaneously (e.g. hot + cold); the first one
  // that accepts the signature is the one that issued it.
  for (const backend of registry.listBackends()) {
    if (backend.kind !== "local") continue;
    const adapter = registry.getAdapter(backend.id);
    if (!(adapter instanceof LocalStorageAdapter)) continue;
    const ok = adapter.verifyPresign({
      op,
      key: rawKey,
      exp,
      sig,
      ...(contentType !== undefined && { contentType }),
      ...(maxBytes !== undefined && { maxBytes }),
    });
    if (ok !== null) continue;

    if (op !== "get") {
      return c.json({ error: "only presigned GET is served by this endpoint" }, 400);
    }
    try {
      const { body, metadata } = await adapter.get(rawKey);
      return new Response(body, {
        headers: {
          "Content-Type": metadata.contentType,
          "Content-Length": String(metadata.size),
          ...(cd && { "Content-Disposition": cd }),
          ETag: metadata.etag,
        },
      });
    } catch (err) {
      if (err instanceof ObjectNotFound) {
        return c.json({ error: "not found" }, 404);
      }
      throw err;
    }
  }
  return c.json({ error: "signature invalid or expired" }, 403);
});

/** GET /api/files?resource=&recordId= — list attachments for a record. */
filesRoutes.get("/", (c) => {
  const url = new URL(c.req.url);
  const resource = url.searchParams.get("resource");
  const recordId = url.searchParams.get("recordId");
  if (!resource || !recordId)
    return c.json({ error: "resource + recordId query params required" }, 400);
  const tenant = getTenantContext();
  const tenantId = tenant?.tenantId ?? null;
  const rows = db
    .prepare(
      `SELECT data FROM records
        WHERE resource = 'files.file'
          AND json_extract(data, '$.resource') = ?
          AND json_extract(data, '$.recordId') = ?
        ORDER BY updated_at DESC`,
    )
    .all(resource, recordId) as { data: string }[];
  const parsed = rows.map((r) => JSON.parse(r.data) as { tenantId?: string });
  const filtered = tenantId
    ? parsed.filter((p) => !p.tenantId || p.tenantId === tenantId)
    : parsed;
  return c.json({ rows: filtered, total: filtered.length });
});

// Silence unused-import warning when collectStream/percentEncodeKey are
// present for future streaming + key-encoding use cases.
void collectStream;
void percentEncodeKey;
