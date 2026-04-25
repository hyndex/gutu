/** /api/mail/settings — per-user + per-tenant settings (signatures,
 *  identities, vacation, privacy, notifications, AI). */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db, nowIso } from "../../db";
import { recordAudit } from "../../lib/audit";
import { broadcastResourceChange } from "../../lib/ws";
import { errorResponse, loadRecord, saveRecord, tenantId, userIdOf } from "./_helpers";

export const settingsRoutes = new Hono();
settingsRoutes.use("*", requireAuth);

interface UserSettings {
  id: string;
  userId: string;
  tenantId: string;
  appearance?: { theme?: "light" | "dark" | "system"; density?: "comfortable" | "compact" };
  notifications?: { push?: boolean; inApp?: boolean; emailDigest?: "off" | "daily" | "weekly" };
  privacy?: { blockTrackers?: boolean; imageProxy?: "always" | "on-trust" | "never"; allowReadReceipts?: boolean };
  shortcuts?: Record<string, string[]>;
  ai?: { model?: string; customPrompt?: string; redactPII?: boolean; retentionDays?: number };
  vacation?: { enabled?: boolean; subject?: string; body?: string; from?: string; to?: string; onlyContacts?: boolean };
  forwarding?: { enabled?: boolean; to?: string; keepCopy?: boolean };
  defaultConnectionId?: string;
  composeShortcut?: string;
  undoSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

settingsRoutes.get("/", (c) => {
  const userId = userIdOf(c);
  const id = `ms_${userId}_${tenantId()}`;
  const existing = loadRecord<UserSettings>("mail.settings", id);
  return c.json(existing ?? defaults(userId));
});

settingsRoutes.put("/", async (c) => {
  const userId = userIdOf(c);
  const id = `ms_${userId}_${tenantId()}`;
  let body: Partial<UserSettings> = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  const existing = loadRecord<UserSettings>("mail.settings", id) ?? defaults(userId);
  const merged: UserSettings = {
    ...existing,
    ...body,
    id,
    userId,
    tenantId: tenantId(),
    updatedAt: nowIso(),
  };
  saveRecord("mail.settings", merged as unknown as Record<string, unknown>);
  recordAudit({ actor: userId, action: "mail.settings.updated", resource: "mail.settings", recordId: id });
  broadcastResourceChange("mail.settings", id, "update", userId);
  return c.json(merged);
});

/* -------- tenant policy (admin-only ideally) -------- */

interface TenantSettings {
  id: string;
  tenantId: string;
  aiAllowed?: boolean;
  defaultRetentionDays?: number;
  requireMfa?: boolean;
  allowedProviders?: string[];
  requireDkim?: boolean;
  imageProxyEnforced?: boolean;
  vacationGloballyOff?: boolean;
  maxConnectionsPerUser?: number;
  updatedAt: string;
}

settingsRoutes.get("/tenant", (c) => {
  const id = `mt_${tenantId()}`;
  const existing = loadRecord<TenantSettings>("mail.tenant-settings", id);
  return c.json(existing ?? tenantDefaults());
});

settingsRoutes.put("/tenant", async (c) => {
  const id = `mt_${tenantId()}`;
  let body: Partial<TenantSettings> = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  const existing = loadRecord<TenantSettings>("mail.tenant-settings", id) ?? tenantDefaults();
  const merged: TenantSettings = { ...existing, ...body, id, tenantId: tenantId(), updatedAt: nowIso() };
  saveRecord("mail.tenant-settings", merged as unknown as Record<string, unknown>);
  recordAudit({ actor: userIdOf(c), action: "mail.tenant-settings.updated", resource: "mail.tenant-settings", recordId: id });
  broadcastResourceChange("mail.tenant-settings", id, "update", userIdOf(c));
  return c.json(merged);
});

/* -------- signatures -------- */

settingsRoutes.get("/signatures", (c) => {
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.signature' AND json_extract(data, '$.userId') = ? AND json_extract(data, '$.tenantId') = ?
       ORDER BY json_extract(data, '$.default') DESC, updated_at DESC`,
    )
    .all(userIdOf(c), tenantId()) as { data: string }[];
  return c.json({ rows: rows.map((r) => JSON.parse(r.data)) });
});

settingsRoutes.post("/signatures", async (c) => {
  let body: Record<string, unknown> = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  const id = `sig_${(body.id as string) || crypto.randomUUID()}`;
  const sig = {
    id,
    userId: userIdOf(c),
    tenantId: tenantId(),
    name: String(body.name ?? "Default"),
    bodyHtml: String(body.bodyHtml ?? ""),
    default: !!body.default,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  if (sig.default) {
    const existing = db
      .prepare(`SELECT id, data FROM records WHERE resource = 'mail.signature' AND json_extract(data, '$.userId') = ?`)
      .all(userIdOf(c)) as { id: string; data: string }[];
    for (const r of existing) {
      const e = JSON.parse(r.data);
      if (e.default) {
        e.default = false;
        saveRecord("mail.signature", e);
      }
    }
  }
  saveRecord("mail.signature", sig);
  broadcastResourceChange("mail.signature", id, "create", userIdOf(c));
  return c.json(sig);
});

settingsRoutes.delete("/signatures/:id", (c) => {
  const id = c.req.param("id") ?? "";
  const sig = loadRecord<Record<string, unknown>>("mail.signature", id);
  if (!sig || sig.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "signature not found");
  db.prepare("DELETE FROM records WHERE resource = 'mail.signature' AND id = ?").run(id);
  broadcastResourceChange("mail.signature", id, "delete", userIdOf(c));
  return c.json({ ok: true });
});

/* -------- helpers -------- */

function defaults(userId: string): UserSettings {
  const now = nowIso();
  return {
    id: `ms_${userId}_${tenantId()}`,
    userId,
    tenantId: tenantId(),
    appearance: { theme: "system", density: "comfortable" },
    notifications: { push: true, inApp: true, emailDigest: "off" },
    privacy: { blockTrackers: true, imageProxy: "always", allowReadReceipts: false },
    shortcuts: {},
    ai: { redactPII: true, retentionDays: 90 },
    vacation: { enabled: false, subject: "", body: "" },
    forwarding: { enabled: false },
    undoSeconds: 10,
    createdAt: now,
    updatedAt: now,
  };
}

function tenantDefaults(): TenantSettings {
  return {
    id: `mt_${tenantId()}`,
    tenantId: tenantId(),
    aiAllowed: true,
    defaultRetentionDays: 0,
    requireMfa: false,
    allowedProviders: ["google", "microsoft", "imap"],
    requireDkim: false,
    imageProxyEnforced: true,
    vacationGloballyOff: false,
    maxConnectionsPerUser: 5,
    updatedAt: nowIso(),
  };
}
