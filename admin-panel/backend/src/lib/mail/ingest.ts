/** Per-message ingest pipeline.
 *
 *  Called from `mail-sync.ts` for every fetched message. Centralizes the
 *  defense-in-depth steps:
 *    1. Sanitize HTML server-side, route remote images through the
 *       proxy, log tracker hosts as `mail.tracking-block` rows.
 *    2. Parse Authentication-Results headers → SPF/DKIM/DMARC verdicts.
 *    3. Compute phishing score.
 *    4. Extract any text/calendar attachments into mail.ics-event rows.
 *    5. Strip raw bodyHtml → store sanitized only; keep encrypted raw
 *       in mail_body table for forensics. */

import { db, nowIso } from "../../db";
import { uuid } from "../id";
import { encryptString } from "./crypto/at-rest";
import { sanitizeHtml, htmlToPlainText } from "./mime/sanitize";
import { buildImageProxyUrl } from "./image-proxy-url";
import { parseAuthResults, phishHeuristics } from "./verification";
import { parseIcal, type IcalEvent } from "./ical";
import { enqueuePush } from "../../jobs/mail-push";
import { categorize } from "./categorize";

export interface RawMessage {
  id: string;
  threadId: string;
  connectionId: string;
  tenantId: string;
  userId: string;
  providerMessageId: string;
  providerThreadId: string;
  messageIdHeader?: string;
  inReplyTo?: string;
  references?: string[];
  from?: { name?: string; email: string };
  to: { name?: string; email: string }[];
  cc: { name?: string; email: string }[];
  bcc: { name?: string; email: string }[];
  replyTo: { name?: string; email: string }[];
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  receivedAt: string;
  sentAt?: string;
  size?: number;
  attachments: {
    providerAttachmentId: string;
    filename: string;
    contentType: string;
    size: number;
    cid?: string;
    inline: boolean;
  }[];
  /** Raw text/calendar payloads keyed by attachment id (filled by drivers
   *  that surface inline calendar parts; otherwise empty and we skip ICS
   *  extraction until the user opens an attachment). */
  calendarPayloads?: Record<string, string>;
  labelIds: string[];
  folder: string;
  isRead: boolean;
  isStarred: boolean;
  headers: Record<string, string>;
}

export interface IngestResult {
  recordId: string;
  trackerCount: number;
  imageCount: number;
  linkCount: number;
  phishScore: number;
  icsEventId?: string;
}

export function ingestMessage(msg: RawMessage, knownContactEmails: Set<string>): IngestResult {
  const recordId = `mm_${msg.connectionId}_${msg.providerMessageId}`;
  const now = nowIso();

  /* ---- 1. Sanitize HTML + image proxy + tracker logging ---- */
  const trackerLog: string[] = [];
  const sanitized = msg.bodyHtml
    ? sanitizeHtml(msg.bodyHtml, {
        imageProxy: buildImageProxyUrl,
        cidMap: cidMapFromAttachments(msg.attachments),
        trackerLog,
      })
    : { html: "", text: "", imageCount: 0, linkCount: 0, externalImages: [], trackers: [], inlineImages: [] };

  if (trackerLog.length > 0) {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO records (resource, id, data, created_at, updated_at)
       VALUES ('mail.tracking-block', ?, ?, ?, ?)`,
    );
    const tx = db.transaction(() => {
      for (const url of trackerLog) {
        let host = "unknown";
        try { host = new URL(url).host; } catch { /* keep unknown */ }
        const id = `tb_${recordId}_${cheapHash(url)}`;
        const row = JSON.stringify({
          id,
          messageId: recordId,
          host,
          pixelHash: cheapHash(url),
          blocked: true,
          reason: "ingest-tracker",
          tenantId: msg.tenantId,
          at: now,
        });
        stmt.run(id, row, now, now);
      }
    });
    tx();
  }

  /* ---- 2. Parse authentication-results ---- */
  const verification = parseAuthResults(msg.headers ?? {});

  /* ---- 3. Phish heuristics ---- */
  const fromEmail = (msg.from?.email ?? "").toLowerCase();
  const known = !!fromEmail && knownContactEmails.has(fromEmail);
  const phish = phishHeuristics(
    fromEmail,
    msg.from?.name,
    msg.subject,
    sanitized.text || msg.bodyText,
    verification,
    known,
  );

  /* ---- 4. ICS extraction ---- */
  let icsEventId: string | undefined;
  for (const [attId, payload] of Object.entries(msg.calendarPayloads ?? {})) {
    const event = parseIcal(payload);
    if (!event) continue;
    icsEventId = persistIcsEvent(event, msg.tenantId);
    void attId;
    break;
  }

  /* ---- 5. Persist message + encrypted raw body for forensics ---- */
  const bodyText = sanitized.text || msg.bodyText || "";
  const bodyHtml = sanitized.html;
  const previewText = previewFrom(bodyText, 240);

  const record: Record<string, unknown> = {
    id: recordId,
    threadId: msg.threadId,
    connectionId: msg.connectionId,
    userId: msg.userId,
    tenantId: msg.tenantId,
    providerMessageId: msg.providerMessageId,
    providerThreadId: msg.providerThreadId,
    messageIdHeader: msg.messageIdHeader,
    inReplyTo: msg.inReplyTo,
    references: msg.references ?? [],
    from: msg.from,
    to: msg.to,
    cc: msg.cc,
    bcc: msg.bcc,
    replyTo: msg.replyTo,
    subject: msg.subject,
    bodyText,
    bodyHtml,
    receivedAt: msg.receivedAt,
    sentAt: msg.sentAt,
    size: msg.size ?? 0,
    attachments: msg.attachments,
    labelIds: msg.labelIds,
    folder: msg.folder,
    isRead: msg.isRead,
    isStarred: msg.isStarred,
    headers: msg.headers,
    toEmails: msg.to.map((a) => a.email).join(", "),
    ccEmails: msg.cc.map((a) => a.email).join(", "),
    bccEmails: msg.bcc.map((a) => a.email).join(", "),
    attachmentNames: msg.attachments.map((a) => a.filename).join(", "),
    preview: previewText,
    imageCount: sanitized.imageCount,
    linkCount: sanitized.linkCount,
    trackerCount: trackerLog.length,
    verifiedSpf: verification.spf,
    verifiedDkim: verification.dkim,
    verifiedDmarc: verification.dmarc,
    bimiLogoUrl: verification.bimi?.logoUrl,
    phishScore: phish.score,
    phishReasons: phish.reasons,
    icsEventId,
    indexedAt: null,
    categoryAuto: categorize({
      fromEmail: msg.from?.email,
      fromName: msg.from?.name,
      subject: msg.subject,
      bodyText: bodyText,
      headers: msg.headers,
    }),
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `INSERT INTO records (resource, id, data, created_at, updated_at)
     VALUES ('mail.message', ?, ?, ?, ?)
     ON CONFLICT(resource, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(recordId, JSON.stringify(record), now, now);

  /* ---- Encrypted raw body for forensics + key rotation ---- */
  if (msg.bodyHtml || msg.bodyText) {
    const cipher = encryptString(JSON.stringify({ html: msg.bodyHtml ?? "", text: msg.bodyText ?? "" }));
    db.prepare(
      `INSERT INTO mail_body (message_id, tenant_id, cipher, nonce, key_version, sanitized_html_len, text_len, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
       ON CONFLICT(message_id) DO UPDATE SET cipher = excluded.cipher, sanitized_html_len = excluded.sanitized_html_len, text_len = excluded.text_len, updated_at = excluded.updated_at`,
    ).run(
      recordId,
      msg.tenantId,
      cipher,
      cipher.subarray(1, 13),
      bodyHtml.length,
      bodyText.length,
      now,
      now,
    );
  }

  // Enqueue web push notification only for new unread inbox messages.
  if (!msg.isRead && msg.folder === "inbox") {
    const existing = db
      .prepare(`SELECT 1 FROM records WHERE resource = 'mail.message' AND id = ? AND created_at < ? LIMIT 1`)
      .get(recordId, now);
    if (!existing) {
      try {
        enqueuePush(msg.userId, msg.tenantId, {
          title: msg.from?.name || msg.from?.email || "New mail",
          body: msg.subject ? `${msg.subject}` : previewText.slice(0, 120),
          tag: msg.threadId,
          url: `/#/mail/thread/${msg.threadId}`,
        });
      } catch { /* push failures are non-fatal */ }
    }
  }

  return {
    recordId,
    trackerCount: trackerLog.length,
    imageCount: sanitized.imageCount,
    linkCount: sanitized.linkCount,
    phishScore: phish.score,
    icsEventId,
  };
}

function cidMapFromAttachments(attachments: { cid?: string; inline?: boolean; providerAttachmentId: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of attachments) {
    if (a.cid && a.inline) {
      out[a.cid] = `/api/mail/messages/attachments/inline/${encodeURIComponent(a.providerAttachmentId)}`;
    }
  }
  return out;
}

function persistIcsEvent(event: IcalEvent, tenantId: string): string {
  const id = `ics_${event.uid}_${event.sequence ?? 0}`;
  const now = nowIso();
  const data = JSON.stringify({ id, ...event, tenantId, createdAt: now, updatedAt: now });
  db.prepare(
    `INSERT INTO records (resource, id, data, created_at, updated_at)
     VALUES ('mail.ics-event', ?, ?, ?, ?)
     ON CONFLICT(resource, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(id, data, now, now);
  return id;
}

function previewFrom(text: string, max: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

function cheapHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

/** Cache of contact emails so phishing heuristic doesn't false-positive on
 *  known correspondents. Refreshed on every sync tick. */
export function loadKnownContacts(userId: string, tenantId: string): Set<string> {
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.contact'
       AND json_extract(data, '$.userId') = ?
       AND json_extract(data, '$.tenantId') = ?`,
    )
    .all(userId, tenantId) as { data: string }[];
  const out = new Set<string>();
  for (const r of rows) {
    try {
      const c = JSON.parse(r.data) as { email?: string };
      if (c.email) out.add(c.email.toLowerCase());
    } catch { /* skip bad rows */ }
  }
  return out;
}

void uuid;
