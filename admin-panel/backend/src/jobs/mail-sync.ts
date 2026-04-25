/** mail-sync job — drains `mail_sync_intent` rows + does periodic delta. */

import { db, nowIso } from "../db";
import { driverFor, loadConnection } from "../lib/mail/driver";
import { broadcastResourceChange } from "../lib/ws";
import { computeThreadKey } from "../lib/mail/threading";
import { recordAudit } from "../lib/audit";
import { registerJob } from "./scheduler";
import { evaluate } from "../routes/mail/rules";

const TICK_MS = parseInt(process.env.MAIL_SYNC_TICK_MS ?? "30000", 10);

async function tick(): Promise<void> {
  ensureIntentTable();
  const intents = db
    .prepare(`SELECT id, connection_id FROM mail_sync_intent ORDER BY created_at ASC LIMIT 25`)
    .all() as { id: string; connection_id: string }[];
  // Periodic poll for connections that haven't been webhook-triggered.
  const periodic = db
    .prepare(
      `SELECT id FROM records WHERE resource = 'mail.connection'
       AND json_extract(data, '$.status') = 'active'
       AND (json_extract(data, '$.lastSyncAt') IS NULL OR json_extract(data, '$.lastSyncAt') < ?)
       LIMIT 25`,
    )
    .all(new Date(Date.now() - 5 * 60_000).toISOString()) as { id: string }[];

  const seen = new Set<string>();
  const todo: string[] = [];
  for (const i of intents) {
    seen.add(i.connection_id);
    todo.push(i.connection_id);
    db.prepare(`DELETE FROM mail_sync_intent WHERE id = ?`).run(i.id);
  }
  for (const r of periodic) {
    if (seen.has(r.id)) continue;
    todo.push(r.id);
    seen.add(r.id);
  }
  for (const connectionId of todo) {
    try {
      await syncConnection(connectionId);
    } catch (err) {
      console.error(`[mail-sync] connection ${connectionId} failed`, err);
    }
  }
}

async function syncConnection(connectionId: string): Promise<void> {
  const conn = loadConnection(connectionId);
  if (!conn || conn.status !== "active") return;
  const tenantRow = db
    .prepare(`SELECT data FROM records WHERE resource = 'mail.connection' AND id = ?`)
    .get(connectionId) as { data: string } | undefined;
  const tenantId = tenantRow ? (JSON.parse(tenantRow.data).tenantId as string | undefined) ?? "default" : "default";
  const driver = await driverFor({ connectionId, tenantId });
  // Pull recent threads from inbox + sent + drafts so the user sees things
  // immediately. We dedupe locally by providerThreadId.
  for (const folder of ["inbox", "sent", "drafts", "trash", "spam", "archive"] as const) {
    try {
      const list = await driver.listThreads({ folder, limit: 50 });
      for (const t of list.items) {
        upsertThread(connectionId, conn.userId, tenantId, t);
      }
    } catch (err) {
      // Provider-specific failures shouldn't block other folders.
      console.warn(`[mail-sync] ${connectionId} folder=${folder} skipped`, err);
    }
  }
  markSynced(connectionId);
}

function upsertThread(
  connectionId: string,
  userId: string,
  tenantId: string,
  t: {
    providerThreadId: string;
    providerLastMessageId?: string;
    subject: string;
    from?: { name?: string; email: string };
    participants: { name?: string; email: string }[];
    labelIds: string[];
    folder: string;
    hasAttachment: boolean;
    hasCalendarInvite: boolean;
    unreadCount: number;
    messageCount: number;
    preview: string;
    lastMessageAt: string;
    starred: boolean;
  },
): void {
  const id = `mt_${connectionId}_${t.providerThreadId}`;
  const existing = db
    .prepare(`SELECT data FROM records WHERE resource = 'mail.thread' AND id = ?`)
    .get(id) as { data: string } | undefined;
  const now = nowIso();
  const merged: Record<string, unknown> = {
    ...(existing ? JSON.parse(existing.data) : {}),
    id,
    threadId: id,
    connectionId,
    tenantId,
    userId,
    providerThreadId: t.providerThreadId,
    providerLastMessageId: t.providerLastMessageId,
    subject: t.subject,
    fromName: t.from?.name,
    fromEmail: t.from?.email,
    participants: t.participants,
    labelIds: t.labelIds,
    folder: t.folder,
    hasAttachment: t.hasAttachment,
    hasCalendarInvite: t.hasCalendarInvite,
    unreadCount: t.unreadCount,
    messageCount: t.messageCount,
    preview: t.preview,
    lastMessageAt: t.lastMessageAt,
    starred: t.starred,
    updatedAt: now,
  };
  if (!merged.createdAt) merged.createdAt = now;
  // Apply rules engine if any rules exist for this user.
  applyRules(userId, tenantId, merged);
  db.prepare(
    `INSERT INTO records (resource, id, data, created_at, updated_at) VALUES ('mail.thread', ?, ?, ?, ?)
     ON CONFLICT(resource, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(id, JSON.stringify(merged), merged.createdAt as string, now);
  broadcastResourceChange("mail.thread", id, existing ? "update" : "create", userId);
  void computeThreadKey;
}

function applyRules(userId: string, tenantId: string, thread: Record<string, unknown>): void {
  const rules = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.rule' AND json_extract(data, '$.userId') = ?
       AND json_extract(data, '$.tenantId') = ?
       AND json_extract(data, '$.enabled') = 1
       ORDER BY json_extract(data, '$.order') ASC`,
    )
    .all(userId, tenantId) as { data: string }[];
  for (const r of rules) {
    const rule = JSON.parse(r.data) as { when: { kind: "leaf" | "and" | "or" }; then: { kind: string; args?: Record<string, unknown> }[] };
    try {
      if (!evaluate(rule.when as never, thread)) continue;
      for (const action of rule.then ?? []) {
        switch (action.kind) {
          case "applyLabel":
            thread.labelIds = Array.from(new Set([...(thread.labelIds as string[] ?? []), String(action.args?.labelId ?? "")]));
            break;
          case "archive":
            thread.folder = "archive";
            break;
          case "trash":
            thread.folder = "trash";
            break;
          case "star":
            thread.starred = true;
            break;
          case "markRead":
            thread.unreadCount = 0;
            break;
          case "rewriteSubject":
            if (typeof action.args?.subject === "string") thread.subject = action.args.subject;
            break;
        }
      }
      recordAudit({ actor: userId, action: "mail.rule.fired", resource: "mail.thread", recordId: String(thread.id), payload: { ruleId: (JSON.parse(r.data) as { id: string }).id } });
    } catch (err) {
      console.warn("[mail-sync] rule eval failed", err);
    }
  }
}

function markSynced(connectionId: string): void {
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = 'mail.connection' AND id = ?`)
    .get(connectionId) as { data: string } | undefined;
  if (!row) return;
  const rec = JSON.parse(row.data) as Record<string, unknown>;
  rec.lastSyncAt = nowIso();
  rec.updatedAt = rec.lastSyncAt;
  db.prepare(`UPDATE records SET data = ?, updated_at = ? WHERE resource = 'mail.connection' AND id = ?`)
    .run(JSON.stringify(rec), rec.updatedAt as string, connectionId);
}

function ensureIntentTable(): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS mail_sync_intent (
      id TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
  );
}

export function registerMailSync(): void {
  registerJob({ id: "mail.sync", intervalMs: TICK_MS, fn: tick, runOnStart: false });
}
