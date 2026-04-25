/** User favorites + sidebar pins.
 *
 *  A simple key-value list per (tenant, user) for the sidebar
 *  Favorites section. Item kinds:
 *    - 'view'    target_id is a saved view id; sidebar opens the list
 *                with that view applied
 *    - 'record'  target_id is "<resource>:<recordId>"; sidebar opens
 *                the record's detail page
 *    - 'page'    target_id is a custom page id (Twenty-style standalone)
 *    - 'link'    target_id is an absolute URL
 *
 *  Routes:
 *    GET    /                list current user's favorites
 *    POST   /                add: { kind, targetId, label?, icon?, folder?, position? }
 *    PATCH  /:targetId       reorder / move into a folder
 *    DELETE /:kind/:targetId remove */
import { Hono } from "hono";
import { requireAuth, currentUser } from "../middleware/auth";
import { getTenantContext } from "../tenancy/context";
import { db, nowIso } from "../db";

export const favoritesRoutes = new Hono();
favoritesRoutes.use("*", requireAuth);

interface FavoriteRow {
  tenant_id: string;
  user_id: string;
  kind: string;
  target_id: string;
  label: string | null;
  icon: string | null;
  folder: string | null;
  position: number;
  created_at: string;
}

function rowToFav(r: FavoriteRow): Record<string, unknown> {
  return {
    tenantId: r.tenant_id,
    userId: r.user_id,
    kind: r.kind,
    targetId: r.target_id,
    label: r.label,
    icon: r.icon,
    folder: r.folder,
    position: r.position,
    createdAt: r.created_at,
  };
}

function tenantId(): string {
  return getTenantContext()?.tenantId ?? "default";
}

favoritesRoutes.get("/", (c) => {
  const user = currentUser(c);
  const rows = db
    .prepare(
      `SELECT * FROM user_favorites
       WHERE tenant_id = ? AND user_id = ?
       ORDER BY folder, position ASC, created_at ASC`,
    )
    .all(tenantId(), user.id) as FavoriteRow[];
  return c.json({ rows: rows.map(rowToFav) });
});

favoritesRoutes.post("/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    kind?: string; targetId?: string;
    label?: string; icon?: string; folder?: string; position?: number;
  };
  if (!body.kind || !body.targetId) {
    return c.json({ error: "kind, targetId required" }, 400);
  }
  if (!["view", "record", "page", "link"].includes(body.kind)) {
    return c.json({ error: `invalid kind ${body.kind}` }, 400);
  }
  const user = currentUser(c);
  // Idempotent — INSERT OR IGNORE on the composite PK so re-favoriting
  // doesn't error.
  db.prepare(
    `INSERT OR IGNORE INTO user_favorites
       (tenant_id, user_id, kind, target_id, label, icon, folder, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    tenantId(),
    user.id,
    body.kind,
    body.targetId,
    body.label ?? null,
    body.icon ?? null,
    body.folder ?? null,
    body.position ?? 0,
    nowIso(),
  );
  return c.json({ ok: true });
});

favoritesRoutes.patch("/:kind/:targetId", async (c) => {
  const { kind, targetId } = c.req.param();
  const patch = (await c.req.json().catch(() => ({}))) as {
    folder?: string | null; position?: number; label?: string; icon?: string;
  };
  const user = currentUser(c);
  const fields: string[] = [];
  const args: unknown[] = [];
  if (patch.folder !== undefined) { fields.push("folder = ?"); args.push(patch.folder); }
  if (patch.position !== undefined) { fields.push("position = ?"); args.push(patch.position); }
  if (patch.label !== undefined) { fields.push("label = ?"); args.push(patch.label); }
  if (patch.icon !== undefined) { fields.push("icon = ?"); args.push(patch.icon); }
  if (fields.length === 0) return c.json({ ok: true });
  args.push(tenantId(), user.id, kind, targetId);
  db.prepare(
    `UPDATE user_favorites SET ${fields.join(", ")}
     WHERE tenant_id = ? AND user_id = ? AND kind = ? AND target_id = ?`,
  ).run(...args);
  return c.json({ ok: true });
});

favoritesRoutes.delete("/:kind/:targetId", (c) => {
  const { kind, targetId } = c.req.param();
  const user = currentUser(c);
  db.prepare(
    `DELETE FROM user_favorites
     WHERE tenant_id = ? AND user_id = ? AND kind = ? AND target_id = ?`,
  ).run(tenantId(), user.id, kind, targetId);
  return c.json({ ok: true });
});
