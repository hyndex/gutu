/** RFC 5322 / mbox export + import helpers.
 *
 *  Export — given a stored `mail.message` record, render it back into
 *  RFC 5322 form (headers + body + attachments) suitable for download
 *  as a `.eml` or concatenation into an `.mbox` file.
 *
 *  Import — parse a `.mbox` or single `.eml` blob into ingest-ready
 *  RawMessage objects via the existing MIME parser. Designed to be
 *  invoked from the import route or from a CLI script. */

import { Buffer } from "node:buffer";
import { parseRfc822 } from "./mime/parser";
import { buildMessage, newMessageId, type OutgoingAttachment } from "./mime/builder";
import { formatAddress } from "./address";
import type { RawMessage } from "./ingest";

export interface StoredMessage {
  id: string;
  connectionId: string;
  tenantId: string;
  userId: string;
  providerMessageId: string;
  providerThreadId: string;
  threadId: string;
  messageIdHeader?: string;
  inReplyTo?: string;
  references?: string[];
  from?: { name?: string; email: string };
  to?: { name?: string; email: string }[];
  cc?: { name?: string; email: string }[];
  bcc?: { name?: string; email: string }[];
  replyTo?: { name?: string; email: string }[];
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  receivedAt: string;
  attachments?: { filename: string; contentType: string; size: number; cid?: string; inline?: boolean; bytes?: string }[];
  headers?: Record<string, string>;
}

/** Export one stored message as RFC 5322 bytes (.eml). */
export function exportEml(msg: StoredMessage): Uint8Array {
  const attachments: OutgoingAttachment[] = (msg.attachments ?? [])
    .filter((a) => !!a.bytes)
    .map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      data: new Uint8Array(Buffer.from(a.bytes ?? "", "base64")),
      cid: a.cid,
      inline: !!a.inline,
    }));
  const built = buildMessage({
    from: msg.from ?? { email: "unknown@local" },
    to: msg.to ?? [],
    cc: msg.cc,
    bcc: msg.bcc,
    replyTo: msg.replyTo,
    subject: msg.subject ?? "",
    text: msg.bodyText,
    html: msg.bodyHtml,
    inReplyTo: msg.inReplyTo,
    references: msg.references,
    messageId: msg.messageIdHeader ?? newMessageId(deriveDomain(msg.from?.email ?? "")),
    attachments,
    date: new Date(msg.receivedAt),
    headers: msg.headers,
  });
  return built.raw;
}

/** Concatenate multiple stored messages into a single mbox file.
 *  Each message is preceded by a `From <email> <date>` separator
 *  per the mboxrd convention, and lines starting with `>From ` are
 *  preserved exactly. */
export function exportMbox(msgs: StoredMessage[]): Uint8Array {
  const chunks: Buffer[] = [];
  for (const m of msgs) {
    const eml = exportEml(m);
    const sep = `From ${m.from?.email ?? "unknown@local"} ${new Date(m.receivedAt).toUTCString()}\r\n`;
    chunks.push(Buffer.from(sep, "utf8"));
    chunks.push(Buffer.from(escapeMboxLines(Buffer.from(eml).toString("utf8")), "utf8"));
    chunks.push(Buffer.from("\r\n", "utf8"));
  }
  return new Uint8Array(Buffer.concat(chunks));
}

function escapeMboxLines(s: string): string {
  // Mboxrd: prepend `>` to any line starting with `From ` or `>+From `.
  return s.replace(/^From /gm, ">From ").replace(/^(>+)From /gm, "$1>From ");
}

function deriveDomain(email: string): string {
  const at = email.indexOf("@");
  return at === -1 ? "gutu.local" : email.slice(at + 1);
}

/** Parse an mbox blob into individual RFC 5322 segments.
 *  Splits on `^From ` boundaries (mboxrd) and unescapes leading `>From `. */
export function splitMbox(blob: Uint8Array): Uint8Array[] {
  const text = Buffer.from(blob).toString("utf8");
  const lines = text.split(/\r?\n/);
  const out: string[][] = [];
  let cur: string[] | null = null;
  for (const raw of lines) {
    if (/^From /.test(raw) && (raw.includes("@") || /\d{4}/.test(raw))) {
      if (cur) out.push(cur);
      cur = [];
      continue;
    }
    if (cur) cur.push(raw.replace(/^>(>*From )/, "$1"));
  }
  if (cur && cur.length > 0) out.push(cur);
  return out.map((c) => new Uint8Array(Buffer.from(c.join("\r\n"), "utf8")));
}

/** Convert a parsed RFC 5322 blob into a RawMessage suitable for the
 *  ingest pipeline. The caller fills connection/user/tenant context. */
export function toRawMessage(
  raw: Uint8Array,
  ctx: { connectionId: string; userId: string; tenantId: string; threadId: string; providerMessageId: string },
): RawMessage {
  const parsed = parseRfc822(raw);
  return {
    id: `mm_${ctx.connectionId}_${ctx.providerMessageId}`,
    threadId: ctx.threadId,
    connectionId: ctx.connectionId,
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    providerMessageId: ctx.providerMessageId,
    providerThreadId: ctx.providerMessageId,
    messageIdHeader: parsed.messageId,
    inReplyTo: parsed.inReplyTo,
    references: parsed.references,
    from: parsed.from,
    to: parsed.to,
    cc: parsed.cc,
    bcc: parsed.bcc,
    replyTo: parsed.replyTo,
    subject: parsed.subject,
    bodyText: parsed.bodyText,
    bodyHtml: parsed.bodyHtml,
    receivedAt: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
    sentAt: parsed.date,
    size: parsed.rawSize,
    attachments: parsed.attachments.map((a, i) => ({
      providerAttachmentId: `imp:${ctx.providerMessageId}:${i}`,
      filename: a.filename,
      contentType: a.contentType,
      size: a.size,
      cid: a.cid,
      inline: a.disposition === "inline",
    })),
    labelIds: ["imported"],
    folder: "inbox",
    isRead: false,
    isStarred: false,
    headers: parsed.headers,
  };
}

void formatAddress;
