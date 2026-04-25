/** /api/mail/messages — drafts, send, schedule, undo. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db, nowIso } from "../../db";
import { uuid } from "../../lib/id";
import { recordAudit } from "../../lib/audit";
import { broadcastResourceChange } from "../../lib/ws";
import { driverFor, loadConnection } from "../../lib/mail/driver";
import { buildMessage, newMessageId, type OutgoingAttachment } from "../../lib/mail/mime/builder";
import { parseAddress, parseAddressList, isValidEmail } from "../../lib/mail/address";
import { sanitizeHtml, htmlToPlainText } from "../../lib/mail/mime/sanitize";
import { errorResponse, idempotencyGet, idempotencyPut, loadRecord, saveRecord, tenantId, userIdOf } from "./_helpers";

export const messagesRoutes = new Hono();
messagesRoutes.use("*", requireAuth);

interface DraftBody {
  id?: string;
  connectionId?: string;
  threadId?: string;
  inReplyToMessageId?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  signatureId?: string;
  templateId?: string;
  attachmentIds?: string[];
  identity?: { email: string; name?: string };
  fromIdentityId?: string;
  /** When true, request a fresh build but don't actually send. */
  dryRun?: boolean;
}

const DEFAULT_UNDO_SECONDS = parseInt(process.env.MAIL_UNDO_SECONDS ?? "10", 10);
const MAX_ATTACHMENT_SIZE = parseInt(process.env.MAIL_MAX_ATTACHMENT_BYTES ?? `${20 * 1024 * 1024}`, 10);
const TOTAL_MAX_PAYLOAD = parseInt(process.env.MAIL_MAX_TOTAL_PAYLOAD_BYTES ?? `${25 * 1024 * 1024}`, 10);

messagesRoutes.post("/drafts", async (c) => {
  let body: DraftBody = {};
  try { body = (await c.req.json()) as DraftBody; } catch { return errorResponse(c, 400, "invalid-json", "JSON body required"); }
  const draft = buildDraftRecord(body, userIdOf(c));
  saveRecord("mail.draft", draft);
  const draftId = String(draft.id);
  recordAudit({ actor: userIdOf(c), action: "mail.draft.saved", resource: "mail.draft", recordId: draftId });
  broadcastResourceChange("mail.draft", draftId, draft.createdAt === draft.updatedAt ? "create" : "update", userIdOf(c));
  return c.json(draft);
});

messagesRoutes.patch("/drafts/:id", async (c) => {
  const id = c.req.param("id") ?? "";
  const existing = loadRecord<Record<string, unknown>>("mail.draft", id);
  if (!existing || existing.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "draft not found");
  let patch: Partial<DraftBody> = {};
  try { patch = (await c.req.json()) as Partial<DraftBody>; } catch { return errorResponse(c, 400, "invalid-json", "JSON body required"); }
  const merged = { ...existing, ...patch, id, updatedAt: nowIso() } as Record<string, unknown>;
  saveRecord("mail.draft", merged);
  broadcastResourceChange("mail.draft", id, "update", userIdOf(c));
  return c.json(merged);
});

messagesRoutes.delete("/drafts/:id", (c) => {
  const id = c.req.param("id") ?? "";
  const existing = loadRecord<Record<string, unknown>>("mail.draft", id);
  if (!existing || existing.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "draft not found");
  db.prepare("DELETE FROM records WHERE resource = 'mail.draft' AND id = ?").run(id);
  recordAudit({ actor: userIdOf(c), action: "mail.draft.deleted", resource: "mail.draft", recordId: id });
  broadcastResourceChange("mail.draft", id, "delete", userIdOf(c));
  return c.json({ ok: true });
});

messagesRoutes.get("/drafts", (c) => {
  const userId = userIdOf(c);
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.draft'
       AND json_extract(data, '$.userId') = ?
       AND json_extract(data, '$.tenantId') = ?
       ORDER BY updated_at DESC LIMIT 200`,
    )
    .all(userId, tenantId()) as { data: string }[];
  return c.json({ rows: rows.map((r) => JSON.parse(r.data)) });
});

messagesRoutes.post("/send", async (c) => {
  const idemKey = c.req.header("idempotency-key");
  if (idemKey) {
    const hit = idempotencyGet("mail.send", idemKey);
    if (hit) return c.json(hit.body as Record<string, unknown>, hit.status as 200 | 201);
  }
  let body: DraftBody & { undoSeconds?: number; sendAt?: string } = {};
  try { body = (await c.req.json()) as typeof body; } catch { return errorResponse(c, 400, "invalid-json", "JSON body required"); }
  const draft = body.id ? loadRecord<DraftBody & { userId: string; tenantId: string; createdAt: string }>("mail.draft", body.id) : null;
  const merged: DraftBody = draft ? { ...draft, ...body } : body;
  const validation = validate(merged);
  if (validation.error) return errorResponse(c, 400, "invalid-message", validation.error);
  if (!merged.connectionId) return errorResponse(c, 400, "missing-connection", "connectionId required");
  const conn = loadConnection(merged.connectionId);
  if (!conn || conn.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "connection not found");

  const attachments = await loadAttachments(merged.attachmentIds ?? []);
  const totalSize = attachments.reduce((a, b) => a + b.data.length, 0);
  if (totalSize > TOTAL_MAX_PAYLOAD) return errorResponse(c, 413, "payload-too-large", `attachments exceed ${TOTAL_MAX_PAYLOAD} bytes`);

  const messageId = newMessageId(deriveDomain(conn.email));
  const fromAddress = parseAddress(`${conn.email}`);
  if (!fromAddress) return errorResponse(c, 400, "bad-from", "could not derive sender");

  const built = buildMessage({
    from: fromAddress,
    to: parseAddressList(merged.to ?? ""),
    cc: parseAddressList(merged.cc ?? ""),
    bcc: parseAddressList(merged.bcc ?? ""),
    subject: merged.subject ?? "",
    html: merged.bodyHtml ? sanitizeHtml(merged.bodyHtml).html : undefined,
    text: merged.bodyText ?? (merged.bodyHtml ? htmlToPlainText(merged.bodyHtml) : ""),
    attachments,
    messageId,
  });

  const sendAt = body.sendAt ? new Date(body.sendAt) : null;
  const undoSeconds = sendAt ? 0 : (body.undoSeconds ?? DEFAULT_UNDO_SECONDS);
  const releaseAt = sendAt ?? new Date(Date.now() + undoSeconds * 1000);
  const id = `ms_${uuid()}`;
  const idempotencyKeyDb = idemKey ?? `${id}:${messageId}`;
  const kind: "undo" | "scheduled" = sendAt ? "scheduled" : "undo";

  db.prepare(
    `INSERT INTO mail_send_queue
       (id, tenant_id, user_id, connection_id, draft_snapshot, mime_blob,
        release_at, status, attempts, max_attempts, idempotency_key, kind,
        thread_id, in_reply_to, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 0, 5, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    tenantId(),
    userIdOf(c),
    merged.connectionId,
    JSON.stringify({
      to: merged.to, cc: merged.cc, bcc: merged.bcc, subject: merged.subject,
      hasHtml: !!merged.bodyHtml, hasText: !!merged.bodyText, attachmentIds: merged.attachmentIds,
    }),
    Buffer.from(built.raw),
    releaseAt.toISOString(),
    idempotencyKeyDb,
    kind,
    merged.threadId ?? null,
    merged.inReplyToMessageId ?? null,
    nowIso(),
    nowIso(),
  );

  recordAudit({
    actor: userIdOf(c),
    action: kind === "scheduled" ? "mail.message.scheduled" : "mail.message.queued",
    resource: "mail.message",
    recordId: id,
    payload: { to: merged.to, subject: merged.subject, releaseAt: releaseAt.toISOString(), kind },
  });

  if (merged.id) {
    // Once queued, drop the draft.
    db.prepare("DELETE FROM records WHERE resource = 'mail.draft' AND id = ?").run(merged.id);
  }
  const result = {
    id,
    status: "queued",
    kind,
    releaseAt: releaseAt.toISOString(),
    undoableUntil: kind === "undo" ? releaseAt.toISOString() : null,
  };
  if (idemKey) idempotencyPut("mail.send", idemKey, result, 200);
  return c.json(result);
});

messagesRoutes.post("/undo/:id", (c) => {
  const id = c.req.param("id") ?? "";
  const row = db
    .prepare(`SELECT * FROM mail_send_queue WHERE id = ?`)
    .get(id) as { id: string; user_id: string; status: string; release_at: string; kind: string } | undefined;
  if (!row) return errorResponse(c, 404, "not-found", "send not found");
  if (row.user_id !== userIdOf(c)) return errorResponse(c, 403, "forbidden", "cannot undo other user's send");
  if (row.status !== "queued") return errorResponse(c, 409, "too-late", `cannot undo, status=${row.status}`);
  if (new Date(row.release_at).getTime() < Date.now()) {
    return errorResponse(c, 409, "too-late", "release window already elapsed");
  }
  db.prepare(`UPDATE mail_send_queue SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(nowIso(), id);
  recordAudit({ actor: userIdOf(c), action: "mail.message.undo", resource: "mail.message", recordId: id });
  return c.json({ ok: true });
});

messagesRoutes.post("/scheduled/:id/cancel", (c) => {
  const id = c.req.param("id") ?? "";
  const row = db
    .prepare(`SELECT * FROM mail_send_queue WHERE id = ?`)
    .get(id) as { id: string; user_id: string; status: string; kind: string } | undefined;
  if (!row || row.user_id !== userIdOf(c)) return errorResponse(c, 404, "not-found", "scheduled send not found");
  if (row.kind !== "scheduled") return errorResponse(c, 400, "not-scheduled", "only scheduled sends are cancellable here");
  if (row.status !== "queued") return errorResponse(c, 409, "too-late", `cannot cancel, status=${row.status}`);
  db.prepare(`UPDATE mail_send_queue SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(nowIso(), id);
  recordAudit({ actor: userIdOf(c), action: "mail.message.scheduled.cancelled", resource: "mail.message", recordId: id });
  return c.json({ ok: true });
});

messagesRoutes.get("/scheduled", (c) => {
  const userId = userIdOf(c);
  const rows = db
    .prepare(
      `SELECT id, release_at AS releaseAt, kind, status, attempts, last_error AS lastError,
              created_at AS createdAt, sent_at AS sentAt, draft_snapshot AS snapshot
       FROM mail_send_queue WHERE user_id = ? AND tenant_id = ? AND kind = 'scheduled' AND status IN ('queued','sending','failed')
       ORDER BY release_at ASC LIMIT 200`,
    )
    .all(userId, tenantId()) as { id: string; releaseAt: string; kind: string; status: string; attempts: number; lastError: string | null; createdAt: string; sentAt: string | null; snapshot: string }[];
  return c.json({
    rows: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      status: r.status,
      releaseAt: r.releaseAt,
      attempts: r.attempts,
      lastError: r.lastError,
      createdAt: r.createdAt,
      sentAt: r.sentAt,
      snapshot: JSON.parse(r.snapshot),
    })),
  });
});

/* -------- helpers -------- */

function buildDraftRecord(body: DraftBody, userId: string): Record<string, unknown> {
  const id = body.id ?? `md_${uuid()}`;
  const existing = body.id ? loadRecord<Record<string, unknown>>("mail.draft", id) : null;
  return {
    ...(existing ?? {}),
    id,
    userId,
    tenantId: tenantId(),
    connectionId: body.connectionId,
    threadId: body.threadId,
    inReplyToMessageId: body.inReplyToMessageId,
    to: body.to,
    cc: body.cc,
    bcc: body.bcc,
    subject: body.subject ?? "",
    bodyHtml: body.bodyHtml ?? "",
    bodyText: body.bodyText ?? "",
    signatureId: body.signatureId,
    templateId: body.templateId,
    attachmentIds: body.attachmentIds ?? [],
    fromIdentityId: body.fromIdentityId,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    lastSavedAt: nowIso(),
    dirty: false,
  };
}

function validate(d: DraftBody): { error?: string } {
  const recipients = [d.to, d.cc, d.bcc].filter(Boolean).join(",");
  if (!recipients.trim()) return { error: "no recipients" };
  for (const a of parseAddressList(recipients)) {
    if (!isValidEmail(a.email)) return { error: `invalid recipient: ${a.email}` };
  }
  if (!d.subject || d.subject.trim() === "") return { error: "subject required (use a placeholder if empty)" };
  if (!d.bodyHtml && !d.bodyText) return { error: "body required" };
  return {};
}

interface AttachmentRow {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  data: Uint8Array;
  cid?: string;
  inline?: boolean;
}

async function loadAttachments(attachmentIds: string[]): Promise<OutgoingAttachment[]> {
  if (attachmentIds.length === 0) return [];
  const out: OutgoingAttachment[] = [];
  for (const id of attachmentIds) {
    const row = db
      .prepare(`SELECT data FROM records WHERE resource = 'mail.attachment' AND id = ?`)
      .get(id) as { data: string } | undefined;
    if (!row) continue;
    const a = JSON.parse(row.data) as AttachmentRow & { fileId?: string; bytes?: string };
    let bytes: Uint8Array | null = null;
    if (a.bytes) bytes = new Uint8Array(Buffer.from(a.bytes, "base64"));
    else if (a.fileId) bytes = await loadFileBytes(a.fileId);
    if (!bytes) continue;
    if (bytes.length > MAX_ATTACHMENT_SIZE) {
      throw new Error(`attachment ${a.filename} exceeds size limit`);
    }
    out.push({
      filename: a.filename,
      contentType: a.contentType,
      data: bytes,
      cid: a.cid,
      inline: !!a.inline,
    });
  }
  return out;
}

async function loadFileBytes(fileId: string): Promise<Uint8Array | null> {
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = 'files.file' AND id = ?`)
    .get(fileId) as { data: string } | undefined;
  if (!row) return null;
  const f = JSON.parse(row.data) as { storageAdapter?: string; objectKey?: string; bytes?: string };
  if (f.bytes) return new Uint8Array(Buffer.from(f.bytes, "base64"));
  // Adapter-based fetch — left as future work; current draft-only attachments
  // route bytes inline.
  return null;
}

function deriveDomain(email: string): string {
  const at = email.indexOf("@");
  if (at === -1) return "gutu.local";
  return email.slice(at + 1);
}
