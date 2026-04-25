/** /api/mail/threads — list, get, modify (archive/trash/spam/star/labels). */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db } from "../../db";
import { recordAudit } from "../../lib/audit";
import { broadcastResourceChange } from "../../lib/ws";
import { driverFor, loadConnection } from "../../lib/mail/driver";
import { errorResponse, loadRecord, saveRecord, tenantId, userIdOf } from "./_helpers";

export const threadsRoutes = new Hono();
threadsRoutes.use("*", requireAuth);

interface ThreadRow {
  id: string;
  threadId: string;
  connectionId: string;
  tenantId: string;
  userId: string;
  providerThreadId: string;
  subject: string;
  fromName?: string;
  fromEmail?: string;
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
  pinned?: boolean;
  muted?: boolean;
  snoozedUntil?: string | null;
  important?: boolean;
  categoryAuto?: string;
  phishScore?: number;
  size?: number;
  createdAt: string;
  updatedAt: string;
}

threadsRoutes.get("/", (c) => {
  const folder = c.req.query("folder") ?? "inbox";
  const labelId = c.req.query("label") ?? "";
  const connectionId = c.req.query("connectionId") ?? "";
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 200);
  const cursor = c.req.query("cursor") ?? "";
  const tenant = tenantId();
  const userId = userIdOf(c);

  const where: string[] = [`resource = 'mail.thread'`, `json_extract(data, '$.userId') = ?`, `json_extract(data, '$.tenantId') = ?`];
  const params: (string | number)[] = [userId, tenant];
  if (folder && folder !== "all") {
    if (folder === "starred") where.push(`json_extract(data, '$.starred') = 1`);
    else if (folder === "snoozed") where.push(`json_extract(data, '$.snoozedUntil') IS NOT NULL`);
    else { where.push(`json_extract(data, '$.folder') = ?`); params.push(folder); }
  }
  if (connectionId) { where.push(`json_extract(data, '$.connectionId') = ?`); params.push(connectionId); }
  if (labelId) {
    where.push(`EXISTS (SELECT 1 FROM json_each(json_extract(data, '$.labelIds')) WHERE value = ?)`);
    params.push(labelId);
  }
  let cursorClause = "";
  if (cursor) {
    cursorClause = ` AND json_extract(data, '$.lastMessageAt') < ?`;
    params.push(cursor);
  }
  params.push(limit + 1);
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE ${where.join(" AND ")}${cursorClause}
       ORDER BY json_extract(data, '$.lastMessageAt') DESC LIMIT ?`,
    )
    .all(...(params as (string | number)[])) as { data: string }[];
  const items = rows.slice(0, limit).map((r) => JSON.parse(r.data) as ThreadRow);
  const hasMore = rows.length > limit;
  const nextCursor = hasMore ? items[items.length - 1]?.lastMessageAt : undefined;
  return c.json({ rows: items, nextCursor, hasMore });
});

threadsRoutes.get("/:id", (c) => {
  const id = c.req.param("id") ?? "";
  const t = loadRecord<ThreadRow>("mail.thread", id);
  if (!t || t.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "thread not found");
  const messages = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.message' AND json_extract(data, '$.threadId') = ?
       ORDER BY json_extract(data, '$.receivedAt') ASC LIMIT 200`,
    )
    .all(id) as { data: string }[];
  return c.json({
    thread: t,
    messages: messages.map((m) => JSON.parse(m.data)),
  });
});

threadsRoutes.post("/bulk/archive", async (c) => {
  return bulkAction(c, "archive", async (ids, conn) => {
    const drv = await driverFor({ connectionId: conn.id, tenantId: tenantId() });
    await drv.archive(ids.map((t) => t.providerThreadId));
    for (const t of ids) {
      t.folder = "archive";
      saveRecord("mail.thread", t as unknown as Record<string, unknown>);
      broadcastResourceChange("mail.thread", t.id, "update", userIdOf(c));
    }
  });
});

threadsRoutes.post("/bulk/trash", async (c) => {
  return bulkAction(c, "trash", async (ids, conn) => {
    const drv = await driverFor({ connectionId: conn.id, tenantId: tenantId() });
    await drv.trash(ids.map((t) => t.providerThreadId));
    for (const t of ids) {
      t.folder = "trash";
      saveRecord("mail.thread", t as unknown as Record<string, unknown>);
      broadcastResourceChange("mail.thread", t.id, "update", userIdOf(c));
    }
  });
});

threadsRoutes.post("/bulk/spam", async (c) => {
  return bulkAction(c, "spam", async (ids, conn) => {
    const drv = await driverFor({ connectionId: conn.id, tenantId: tenantId() });
    await drv.spam(ids.map((t) => t.providerThreadId));
    for (const t of ids) {
      t.folder = "spam";
      saveRecord("mail.thread", t as unknown as Record<string, unknown>);
      broadcastResourceChange("mail.thread", t.id, "update", userIdOf(c));
    }
  });
});

threadsRoutes.post("/bulk/star", async (c) => {
  let body: { ids?: string[]; starred?: boolean } = {};
  try { body = (await c.req.json()) as typeof body; } catch { return errorResponse(c, 400, "invalid-json", "JSON body required"); }
  const ids = body.ids ?? [];
  const starred = !!body.starred;
  if (ids.length === 0) return c.json({ updated: 0 });
  const threads = ids.map((id) => loadRecord<ThreadRow>("mail.thread", id)).filter((t): t is ThreadRow => !!t && t.userId === userIdOf(c));
  const byConn = groupByConnection(threads);
  for (const [connectionId, group] of byConn) {
    const conn = loadConnection(connectionId);
    if (!conn) continue;
    const drv = await driverFor({ connectionId, tenantId: tenantId() });
    await drv.star(group.map((t) => t.providerThreadId), starred);
    for (const t of group) {
      t.starred = starred;
      saveRecord("mail.thread", t as unknown as Record<string, unknown>);
      broadcastResourceChange("mail.thread", t.id, "update", userIdOf(c));
    }
  }
  recordAudit({
    actor: userIdOf(c),
    action: starred ? "mail.thread.starred" : "mail.thread.unstarred",
    resource: "mail.thread",
    payload: { count: threads.length },
  });
  return c.json({ updated: threads.length });
});

threadsRoutes.post("/bulk/labels", async (c) => {
  let body: { ids?: string[]; add?: string[]; remove?: string[] } = {};
  try { body = (await c.req.json()) as typeof body; } catch { return errorResponse(c, 400, "invalid-json", "JSON body required"); }
  const ids = body.ids ?? [];
  const add = body.add ?? [];
  const remove = body.remove ?? [];
  if (ids.length === 0) return c.json({ updated: 0 });
  const threads = ids.map((id) => loadRecord<ThreadRow>("mail.thread", id)).filter((t): t is ThreadRow => !!t && t.userId === userIdOf(c));
  const byConn = groupByConnection(threads);
  for (const [connectionId, group] of byConn) {
    const drv = await driverFor({ connectionId, tenantId: tenantId() });
    await drv.modifyLabels(group.map((t) => t.providerThreadId), add, remove);
    for (const t of group) {
      const set = new Set(t.labelIds);
      for (const a of add) set.add(a);
      for (const r of remove) set.delete(r);
      t.labelIds = Array.from(set);
      saveRecord("mail.thread", t as unknown as Record<string, unknown>);
      broadcastResourceChange("mail.thread", t.id, "update", userIdOf(c));
    }
  }
  return c.json({ updated: threads.length });
});

threadsRoutes.post("/bulk/read", async (c) => {
  let body: { ids?: string[]; read?: boolean } = {};
  try { body = (await c.req.json()) as typeof body; } catch { return errorResponse(c, 400, "invalid-json", "JSON body required"); }
  const ids = body.ids ?? [];
  const read = body.read !== false;
  const threads = ids.map((id) => loadRecord<ThreadRow>("mail.thread", id)).filter((t): t is ThreadRow => !!t && t.userId === userIdOf(c));
  // Update messages within each thread.
  const byConn = groupByConnection(threads);
  for (const [connectionId, group] of byConn) {
    const drv = await driverFor({ connectionId, tenantId: tenantId() });
    const messageRows = db
      .prepare(
        `SELECT id FROM records WHERE resource = 'mail.message'
           AND json_extract(data, '$.threadId') IN (${group.map(() => "?").join(",")})`,
      )
      .all(...group.map((t) => t.id)) as { id: string }[];
    const messageIds = messageRows.map((r) => r.id);
    if (messageIds.length > 0) await drv.markRead(messageIds, read);
    for (const t of group) {
      t.unreadCount = read ? 0 : Math.max(t.unreadCount, 1);
      saveRecord("mail.thread", t as unknown as Record<string, unknown>);
      broadcastResourceChange("mail.thread", t.id, "update", userIdOf(c));
    }
  }
  return c.json({ updated: threads.length });
});

threadsRoutes.post("/bulk/snooze", async (c) => {
  let body: { ids?: string[]; wakeAt?: string; reason?: string } = {};
  try { body = (await c.req.json()) as typeof body; } catch { return errorResponse(c, 400, "invalid-json", "JSON body required"); }
  const ids = body.ids ?? [];
  if (!body.wakeAt) return errorResponse(c, 400, "missing-wakeAt", "wakeAt is required");
  const wakeAt = body.wakeAt;
  const threads = ids.map((id) => loadRecord<ThreadRow>("mail.thread", id)).filter((t): t is ThreadRow => !!t && t.userId === userIdOf(c));
  for (const t of threads) {
    t.snoozedUntil = wakeAt;
    t.folder = "snoozed";
    saveRecord("mail.thread", t as unknown as Record<string, unknown>);
    broadcastResourceChange("mail.thread", t.id, "update", userIdOf(c));
    saveRecord("mail.snooze", {
      id: `snooze_${t.id}`,
      threadId: t.id,
      userId: userIdOf(c),
      tenantId: tenantId(),
      wakeAt,
      reason: body.reason ?? "snooze",
    });
  }
  recordAudit({
    actor: userIdOf(c),
    action: "mail.thread.snoozed",
    resource: "mail.thread",
    payload: { count: threads.length, wakeAt },
  });
  return c.json({ updated: threads.length });
});

threadsRoutes.post("/bulk/mute", async (c) => {
  let body: { ids?: string[]; muted?: boolean } = {};
  try { body = (await c.req.json()) as typeof body; } catch { return errorResponse(c, 400, "invalid-json", "JSON body required"); }
  const ids = body.ids ?? [];
  const muted = body.muted !== false;
  const threads = ids.map((id) => loadRecord<ThreadRow>("mail.thread", id)).filter((t): t is ThreadRow => !!t && t.userId === userIdOf(c));
  for (const t of threads) {
    t.muted = muted;
    saveRecord("mail.thread", t as unknown as Record<string, unknown>);
    broadcastResourceChange("mail.thread", t.id, "update", userIdOf(c));
  }
  return c.json({ updated: threads.length });
});

threadsRoutes.post("/:id/sync", async (c) => {
  const id = c.req.param("id") ?? "";
  const t = loadRecord<ThreadRow>("mail.thread", id);
  if (!t || t.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "thread not found");
  try {
    const drv = await driverFor({ connectionId: t.connectionId, tenantId: tenantId() });
    const remote = await drv.getThread(t.providerThreadId);
    // Update thread + messages from driver result.
    const updated: ThreadRow = {
      ...t,
      subject: remote.summary.subject,
      participants: remote.summary.participants,
      labelIds: remote.summary.labelIds,
      folder: remote.summary.folder,
      hasAttachment: remote.summary.hasAttachment,
      hasCalendarInvite: remote.summary.hasCalendarInvite,
      unreadCount: remote.summary.unreadCount,
      messageCount: remote.summary.messageCount,
      preview: remote.summary.preview,
      lastMessageAt: remote.summary.lastMessageAt,
      starred: remote.summary.starred,
      updatedAt: new Date().toISOString(),
    };
    saveRecord("mail.thread", updated as unknown as Record<string, unknown>);
    for (const m of remote.messages) {
      const id2 = `mm_${m.providerMessageId}`;
      saveRecord("mail.message", {
        id: id2,
        threadId: t.id,
        connectionId: t.connectionId,
        userId: userIdOf(c),
        tenantId: tenantId(),
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
        labelIds: m.labelIds,
        folder: m.folder,
        isRead: m.isRead,
        isStarred: m.isStarred,
        toEmails: (m.to ?? []).map((a) => a.email).join(", "),
        ccEmails: (m.cc ?? []).map((a) => a.email).join(", "),
        bccEmails: (m.bcc ?? []).map((a) => a.email).join(", "),
        attachmentNames: (m.attachments ?? []).map((a) => a.filename).join(", "),
      });
    }
    broadcastResourceChange("mail.thread", id, "update", userIdOf(c));
    return c.json({ ok: true, messageCount: remote.messages.length });
  } catch (err) {
    return errorResponse(c, 502, "sync-failed", err instanceof Error ? err.message : "sync failed");
  }
});

async function bulkAction(
  c: import("hono").Context,
  auditAction: string,
  fn: (threads: ThreadRow[], conn: { id: string }) => Promise<void>,
): Promise<Response> {
  let body: { ids?: string[] } = {};
  try { body = (await c.req.json()) as typeof body; } catch { return errorResponse(c, 400, "invalid-json", "JSON body required"); }
  const ids = body.ids ?? [];
  if (ids.length === 0) return c.json({ updated: 0 });
  const threads = ids.map((id) => loadRecord<ThreadRow>("mail.thread", id)).filter((t): t is ThreadRow => !!t && t.userId === userIdOf(c));
  const byConn = groupByConnection(threads);
  for (const [connectionId, group] of byConn) {
    const conn = loadConnection(connectionId);
    if (!conn) continue;
    await fn(group, { id: connectionId });
  }
  recordAudit({
    actor: userIdOf(c),
    action: `mail.thread.${auditAction}`,
    resource: "mail.thread",
    payload: { count: threads.length },
  });
  return c.json({ updated: threads.length });
}

function groupByConnection(rows: ThreadRow[]): Map<string, ThreadRow[]> {
  const out = new Map<string, ThreadRow[]>();
  for (const r of rows) {
    const arr = out.get(r.connectionId) ?? [];
    arr.push(r);
    out.set(r.connectionId, arr);
  }
  return out;
}
