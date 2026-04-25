/** /api/mail/search — hybrid lexical + vector with the query parser. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { search } from "../../lib/mail/search";
import { errorResponse, tenantId, userIdOf } from "./_helpers";

export const searchRoutes = new Hono();
searchRoutes.use("*", requireAuth);

searchRoutes.get("/", async (c) => {
  const q = c.req.query("q") ?? "";
  const folder = c.req.query("folder") ?? undefined;
  const connectionId = c.req.query("connectionId") ?? undefined;
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 200);
  const enableVector = c.req.query("vector") !== "0";
  if (!q.trim()) return errorResponse(c, 400, "missing-q", "q required");
  void userIdOf(c);
  const results = await search(q, { tenantId: tenantId(), folder, connectionId, limit, enableVector });
  return c.json({ q, results });
});
