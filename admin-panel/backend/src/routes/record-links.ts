/** Polymorphic record-to-record links.
 *
 *  Mirrors Twenty's `MORPH_RELATION` / `*Target` join tables: a
 *  single edge connects records of any two resource types. Same
 *  storage pattern (the `record_links` table) supports:
 *    - "this task is about that opportunity"
 *    - "this contact reports to that contact"
 *    - "this deal is the parent of that quote"
 *    - sidebar pinned-records (`from = user, to = record, kind=pin`)
 *    - "Related records" panels on detail pages
 *
 *  Routes:
 *    GET    /from/:resource/:id      list edges where this record is the source
 *    GET    /to/:resource/:id        list edges where this record is the target
 *    GET    /around/:resource/:id    BOTH directions, deduped (default for the UI)
 *    POST   /                        create edge {fromResource, fromId, toResource, toId, kind?, payload?}
 *    DELETE /:id                     remove edge
 *
 *  Reads require viewer access on AT LEAST ONE side of the edge.
 *  Writes require editor access on the SOURCE side. */
import { Hono } from "hono";
import { requireAuth, currentUser } from "../middleware/auth";
import { getTenantContext } from "../tenancy/context";
import { db, nowIso } from "../db";
import { uuid } from "./../lib/id";
import { effectiveRole, roleAtLeast } from "./../lib/acl";
import { recordAudit } from "./../lib/audit";

export const recordLinksRoutes = new Hono();
recordLinksRoutes.use("*", requireAuth);

interface LinkRow {
  id: string;
  tenant_id: string;
  from_resource: string;
  from_id: string;
  to_resource: string;
  to_id: string;
  kind: string;
  payload: string | null;
  created_by: string;
  created_at: string;
}

function rowToLink(r: LinkRow): Record<string, unknown> {
  let payload: unknown = null;
  if (r.payload) { try { payload = JSON.parse(r.payload); } catch { /* tolerate */ } }
  return {
    id: r.id,
    tenantId: r.tenant_id,
    fromResource: r.from_resource,
    fromId: r.from_id,
    toResource: r.to_resource,
    toId: r.to_id,
    kind: r.kind,
    payload,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

function tenantId(): string {
  return getTenantContext()?.tenantId ?? "default";
}

recordLinksRoutes.get("/from/:resource/:id", (c) => {
  const { resource, id } = c.req.param();
  const tid = tenantId();
  const user = currentUser(c);
  if (!effectiveRole({ resource, recordId: id, userId: user.id, tenantId: tid })) {
    return c.json({ error: "not found" }, 404);
  }
  const rows = db
    .prepare(
      `SELECT * FROM record_links
       WHERE tenant_id = ? AND from_resource = ? AND from_id = ?
       ORDER BY created_at DESC`,
    )
    .all(tid, resource, id) as LinkRow[];
  return c.json({ rows: rows.map(rowToLink) });
});

recordLinksRoutes.get("/to/:resource/:id", (c) => {
  const { resource, id } = c.req.param();
  const tid = tenantId();
  const user = currentUser(c);
  if (!effectiveRole({ resource, recordId: id, userId: user.id, tenantId: tid })) {
    return c.json({ error: "not found" }, 404);
  }
  const rows = db
    .prepare(
      `SELECT * FROM record_links
       WHERE tenant_id = ? AND to_resource = ? AND to_id = ?
       ORDER BY created_at DESC`,
    )
    .all(tid, resource, id) as LinkRow[];
  return c.json({ rows: rows.map(rowToLink) });
});

recordLinksRoutes.get("/around/:resource/:id", (c) => {
  const { resource, id } = c.req.param();
  const tid = tenantId();
  const user = currentUser(c);
  if (!effectiveRole({ resource, recordId: id, userId: user.id, tenantId: tid })) {
    return c.json({ error: "not found" }, 404);
  }
  const rows = db
    .prepare(
      `SELECT * FROM record_links
       WHERE tenant_id = ?
         AND ( (from_resource = ? AND from_id = ?)
            OR (to_resource = ? AND to_id = ?) )
       ORDER BY created_at DESC`,
    )
    .all(tid, resource, id, resource, id) as LinkRow[];
  return c.json({ rows: rows.map(rowToLink) });
});

recordLinksRoutes.post("/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    fromResource?: string; fromId?: string;
    toResource?: string; toId?: string;
    kind?: string; payload?: unknown;
  };
  if (!body.fromResource || !body.fromId || !body.toResource || !body.toId) {
    return c.json({ error: "fromResource, fromId, toResource, toId required" }, 400);
  }
  const user = currentUser(c);
  const tid = tenantId();
  const fromRole = effectiveRole({
    resource: body.fromResource,
    recordId: body.fromId,
    userId: user.id,
    tenantId: tid,
  });
  if (!fromRole || !roleAtLeast(fromRole, "editor")) {
    return c.json({ error: "requires editor role on source record", code: "access-denied" }, 403);
  }
  // Target side just needs READ access. Otherwise an editor on a
  // contact could link it to a private record they shouldn't know
  // about.
  const toRole = effectiveRole({
    resource: body.toResource,
    recordId: body.toId,
    userId: user.id,
    tenantId: tid,
  });
  if (!toRole) {
    return c.json({ error: "target record not found", code: "not-found" }, 404);
  }
  const id = uuid();
  const now = nowIso();
  db.prepare(
    `INSERT INTO record_links
       (id, tenant_id, from_resource, from_id, to_resource, to_id, kind, payload, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, tid,
    body.fromResource, body.fromId,
    body.toResource, body.toId,
    body.kind ?? "related",
    body.payload ? JSON.stringify(body.payload) : null,
    user.email, now,
  );
  recordAudit({
    actor: user.email,
    action: "record-link.created",
    resource: "record-link",
    recordId: id,
    payload: body,
  });
  const row = db.prepare(`SELECT * FROM record_links WHERE id = ?`).get(id) as LinkRow;
  return c.json(rowToLink(row), 201);
});

recordLinksRoutes.delete("/:id", (c) => {
  const id = c.req.param("id");
  const tid = tenantId();
  const user = currentUser(c);
  const row = db
    .prepare(`SELECT * FROM record_links WHERE id = ? AND tenant_id = ?`)
    .get(id, tid) as LinkRow | undefined;
  if (!row) return c.json({ error: "not found" }, 404);
  // Same rule as create — editor on source.
  const fromRole = effectiveRole({
    resource: row.from_resource,
    recordId: row.from_id,
    userId: user.id,
    tenantId: tid,
  });
  if (!fromRole || !roleAtLeast(fromRole, "editor")) {
    return c.json({ error: "requires editor role on source record", code: "access-denied" }, 403);
  }
  db.prepare(`DELETE FROM record_links WHERE id = ?`).run(id);
  recordAudit({
    actor: user.email,
    action: "record-link.deleted",
    resource: "record-link",
    recordId: id,
  });
  return c.json({ ok: true });
});
