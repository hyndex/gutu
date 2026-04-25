/** Read-only API for per-record timeline events.
 *  GET /api/timeline/:resource/:id — paginated activity feed for a record.
 *
 *  Requires viewer access on the record (delegated to the same ACL
 *  helper the resources route uses). */
import { Hono } from "hono";
import { requireAuth, currentUser } from "../middleware/auth";
import { getTenantContext } from "../tenancy/context";
import { effectiveRole } from "./../lib/acl";
import { readTimeline } from "./../lib/timeline";

export const timelineRoutes = new Hono();
timelineRoutes.use("*", requireAuth);

timelineRoutes.get("/:resource/:id", (c) => {
  const { resource, id } = c.req.param();
  const user = currentUser(c);
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const role = effectiveRole({
    resource,
    recordId: id,
    userId: user.id,
    tenantId,
  });
  if (!role) return c.json({ error: "not found" }, 404);
  const limit = Math.min(500, Math.max(1, Number(c.req.query("limit") ?? 50)));
  return c.json({ rows: readTimeline(tenantId, resource, id, limit) });
});
