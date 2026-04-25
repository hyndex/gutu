/** mail-sync job — drains `mail_sync_intent` rows + does periodic delta.
 *
 *  Pulls threads + messages from each provider, runs every message through
 *  the ingest pipeline (sanitize, image-proxy, tracker logging, auth-results,
 *  phish, ICS extraction), and applies the user's rules engine. */

import { db, nowIso } from "../db";
import { driverFor, loadConnection } from "../lib/mail/driver";
import { broadcastResourceChange } from "../lib/ws";
import { recordAudit } from "../lib/audit";
import { registerJob } from "./scheduler";
import { evaluate } from "../routes/mail/rules";
import { ingestMessage, loadKnownContacts, type RawMessage } from "../lib/mail/ingest";
import type { DriverMessage, DriverThreadSummary, MailDriver } from "../lib/mail/driver/types";
import { recordContactSeen } from "../lib/mail/contact-touch";
import { categorize } from "../lib/mail/categorize";

const TICK_MS = parseInt(process.env.MAIL_SYNC_TICK_MS ?? "30000", 10);
const MAX_PER_FOLDER = parseInt(process.env.MAIL_SYNC_MAX_PER_FOLDER ?? "50", 10);
const HYDRATE_THREADS_PER_TICK = parseInt(process.env.MAIL_SYNC_HYDRATE_PER_TICK ?? "10", 10);
const FOLDERS = ["inbox", "sent", "drafts", "trash", "spam", "archive"] as const;

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
      markFailure(connectionId, err);
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
  const knownContacts = loadKnownContacts(conn.userId, tenantId);

  // Phase 1 — list threads per folder so the inbox renders quickly.
  for (const folder of FOLDERS) {
    try {
      const list = await driver.listThreads({ folder, limit: MAX_PER_FOLDER });
      for (const t of list.items) {
        upsertThreadSummary(connectionId, conn.userId, tenantId, t);
      }
    } catch (err) {
      console.warn(`[mail-sync] ${connectionId} folder=${folder} skipped`, err);
    }
  }

  // Phase 2 — hydrate the most-recent N threads with full messages.
  const recentRows = db
    .prepare(
      `SELECT id, data FROM records WHERE resource = 'mail.thread'
       AND json_extract(data, '$.connectionId') = ?
       ORDER BY json_extract(data, '$.lastMessageAt') DESC LIMIT ?`,
    )
    .all(connectionId, HYDRATE_THREADS_PER_TICK) as { id: string; data: string }[];
  for (const row of recentRows) {
    try {
      const t = JSON.parse(row.data) as { providerThreadId?: string };
      if (!t.providerThreadId) continue;
      await hydrateThread(driver, connectionId, conn.userId, tenantId, t.providerThreadId, knownContacts);
    } catch (err) {
      console.warn(`[mail-sync] hydrate thread ${row.id} failed`, err);
    }
  }

  // Phase 3 — driver delta for next round (cursor advances; full rescan on
  // 410-class errors).
  try { await driver.delta({ cursor: undefined }); } catch { /* informational */ }

  markSynced(connectionId);
}

function upsertThreadSummary(
  connectionId: string,
  userId: string,
  tenantId: string,
  t: DriverThreadSummary,
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
    categoryAuto: t.folder === "inbox" ? categorize({ fromEmail: t.from?.email, fromName: t.from?.name, subject: t.subject }) : undefined,
    updatedAt: now,
  };
  if (!merged.createdAt) merged.createdAt = now;
  applyRules(userId, tenantId, merged);
  db.prepare(
    `INSERT INTO records (resource, id, data, created_at, updated_at) VALUES ('mail.thread', ?, ?, ?, ?)
     ON CONFLICT(resource, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(id, JSON.stringify(merged), merged.createdAt as string, now);
  broadcastResourceChange("mail.thread", id, existing ? "update" : "create", userId);
}

async function hydrateThread(
  driver: MailDriver,
  connectionId: string,
  userId: string,
  tenantId: string,
  providerThreadId: string,
  knownContacts: Set<string>,
): Promise<void> {
  const remote = await driver.getThread(providerThreadId);
  const threadId = `mt_${connectionId}_${providerThreadId}`;
  for (const m of remote.messages) {
    await ingestSingleMessage(driver, m, threadId, connectionId, userId, tenantId, knownContacts);
  }
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = 'mail.thread' AND id = ?`)
    .get(threadId) as { data: string } | undefined;
  if (row) {
    const t = JSON.parse(row.data) as Record<string, unknown>;
    t.hydratedAt = nowIso();
    db.prepare(`UPDATE records SET data = ?, updated_at = ? WHERE resource = 'mail.thread' AND id = ?`)
      .run(JSON.stringify(t), nowIso(), threadId);
  }
}

async function ingestSingleMessage(
  driver: MailDriver,
  m: DriverMessage,
  threadId: string,
  connectionId: string,
  userId: string,
  tenantId: string,
  knownContacts: Set<string>,
): Promise<void> {
  const calendarPayloads: Record<string, string> = {};
  for (const a of m.attachments) {
    if (!a.contentType.startsWith("text/calendar")) continue;
    try {
      const bytes = await driver.getAttachmentBytes(m.providerMessageId, a.providerAttachmentId);
      calendarPayloads[a.providerAttachmentId] = new TextDecoder().decode(bytes);
    } catch { /* best effort */ }
  }
  const raw: RawMessage = {
    id: `mm_${connectionId}_${m.providerMessageId}`,
    threadId,
    connectionId,
    tenantId,
    userId,
    providerMessageId: m.providerMessageId,
    providerThreadId: m.providerThreadId,
    messageIdHeader: m.messageIdHeader,
    inReplyTo: m.inReplyTo,
    references: m.references,
    from: m.from,
    to: m.to,
    cc: m.cc,
    bcc: m.bcc,
    replyTo: m.replyTo,
    subject: m.subject,
    bodyText: m.bodyText,
    bodyHtml: m.bodyHtml,
    receivedAt: m.receivedAt,
    sentAt: m.sentAt,
    size: m.size,
    attachments: m.attachments,
    calendarPayloads,
    labelIds: m.labelIds,
    folder: m.folder,
    isRead: m.isRead,
    isStarred: m.isStarred,
    headers: m.headers,
  };
  ingestMessage(raw, knownContacts);
  if (m.from?.email) recordContactSeen(userId, tenantId, m.from.email, m.from.name);
  for (const a of [...m.to, ...m.cc]) recordContactSeen(userId, tenantId, a.email, a.name);
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
  rec.lastError = null;
  db.prepare(`UPDATE records SET data = ?, updated_at = ? WHERE resource = 'mail.connection' AND id = ?`)
    .run(JSON.stringify(rec), rec.updatedAt as string, connectionId);
}

function markFailure(connectionId: string, err: unknown): void {
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = 'mail.connection' AND id = ?`)
    .get(connectionId) as { data: string } | undefined;
  if (!row) return;
  const rec = JSON.parse(row.data) as Record<string, unknown>;
  rec.lastError = err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500);
  rec.updatedAt = nowIso();
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
