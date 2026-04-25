/** Outgoing MIME builder.
 *
 *  Produces RFC 5322 / 2045 compliant messages with multipart/alternative
 *  + multipart/related + multipart/mixed when needed:
 *
 *    multipart/mixed
 *      multipart/related
 *        multipart/alternative
 *          text/plain
 *          text/html
 *        inline parts (cid)
 *      attachment parts
 *
 *  Only the layers that are actually needed are emitted. */

import { formatAddress, formatAddresses, type Address } from "../address";
import { htmlToPlainText } from "./sanitize";

export interface OutgoingAttachment {
  filename: string;
  contentType: string;
  data: Uint8Array;
  cid?: string;
  inline?: boolean;
}

export interface OutgoingMessage {
  from: Address;
  to: Address[];
  cc?: Address[];
  bcc?: Address[];
  replyTo?: Address[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: OutgoingAttachment[];
  inReplyTo?: string;
  references?: string[];
  messageId: string;
  date?: Date;
  headers?: Record<string, string>;
}

const CRLF = "\r\n";

export interface BuiltMessage {
  raw: Uint8Array;
  envelope: { from: string; to: string[]; cc: string[]; bcc: string[] };
  messageId: string;
}

export function buildMessage(msg: OutgoingMessage): BuiltMessage {
  const boundary = (prefix: string): string =>
    `--=_${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;

  const text = msg.text ?? (msg.html ? htmlToPlainText(msg.html) : "");
  const hasInline = (msg.attachments ?? []).some((a) => a.inline && a.cid);
  const hasAttachments = (msg.attachments ?? []).some((a) => !a.inline);

  const altBoundary = boundary("alt");
  const relBoundary = boundary("rel");
  const mixedBoundary = boundary("mix");

  const lines: string[] = [];
  pushHeaders(lines, msg);

  if (hasAttachments) {
    lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
    lines.push("");
    lines.push(`--${mixedBoundary}`);
    appendBodyPart(lines, msg, text, altBoundary, relBoundary, hasInline);
    for (const a of msg.attachments ?? []) {
      if (a.inline) continue;
      lines.push(`--${mixedBoundary}`);
      appendAttachment(lines, a, false);
    }
    lines.push(`--${mixedBoundary}--`);
  } else {
    appendBodyPart(lines, msg, text, altBoundary, relBoundary, hasInline);
  }

  const raw = Buffer.from(lines.join(CRLF), "utf8");
  return {
    raw: new Uint8Array(raw),
    envelope: {
      from: msg.from.email,
      to: (msg.to ?? []).map((a) => a.email),
      cc: (msg.cc ?? []).map((a) => a.email),
      bcc: (msg.bcc ?? []).map((a) => a.email),
    },
    messageId: msg.messageId,
  };
}

function pushHeaders(out: string[], msg: OutgoingMessage): void {
  out.push(`From: ${formatAddress(msg.from)}`);
  if (msg.to.length > 0) out.push(`To: ${formatAddresses(msg.to)}`);
  if (msg.cc && msg.cc.length > 0) out.push(`Cc: ${formatAddresses(msg.cc)}`);
  if (msg.bcc && msg.bcc.length > 0) out.push(`Bcc: ${formatAddresses(msg.bcc)}`);
  if (msg.replyTo && msg.replyTo.length > 0) out.push(`Reply-To: ${formatAddresses(msg.replyTo)}`);
  out.push(`Subject: ${encodeHeader(msg.subject)}`);
  out.push(`Date: ${(msg.date ?? new Date()).toUTCString()}`);
  out.push(`Message-ID: <${msg.messageId}>`);
  if (msg.inReplyTo) out.push(`In-Reply-To: <${msg.inReplyTo}>`);
  if (msg.references && msg.references.length > 0) {
    out.push(`References: ${msg.references.map((r) => `<${r}>`).join(" ")}`);
  }
  out.push("MIME-Version: 1.0");
  if (msg.headers) {
    for (const [k, v] of Object.entries(msg.headers)) {
      if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(k)) continue;
      const lower = k.toLowerCase();
      if (
        lower === "content-type" ||
        lower === "content-transfer-encoding" ||
        lower === "mime-version"
      ) continue;
      out.push(`${k}: ${v.replace(/\r?\n/g, " ")}`);
    }
  }
}

function appendBodyPart(
  out: string[],
  msg: OutgoingMessage,
  text: string,
  altBoundary: string,
  relBoundary: string,
  hasInline: boolean,
): void {
  const html = msg.html;
  if (hasInline && html) {
    out.push(`Content-Type: multipart/related; boundary="${relBoundary}"`);
    out.push("");
    out.push(`--${relBoundary}`);
    appendAlternative(out, text, html, altBoundary);
    for (const a of msg.attachments ?? []) {
      if (!a.inline || !a.cid) continue;
      out.push(`--${relBoundary}`);
      appendAttachment(out, a, true);
    }
    out.push(`--${relBoundary}--`);
    return;
  }
  if (html) {
    appendAlternative(out, text, html, altBoundary);
    return;
  }
  // Text-only.
  out.push("Content-Type: text/plain; charset=utf-8");
  out.push("Content-Transfer-Encoding: quoted-printable");
  out.push("");
  out.push(quotedPrintable(text));
}

function appendAlternative(out: string[], text: string, html: string, boundary: string): void {
  out.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
  out.push("");
  out.push(`--${boundary}`);
  out.push("Content-Type: text/plain; charset=utf-8");
  out.push("Content-Transfer-Encoding: quoted-printable");
  out.push("");
  out.push(quotedPrintable(text));
  out.push(`--${boundary}`);
  out.push("Content-Type: text/html; charset=utf-8");
  out.push("Content-Transfer-Encoding: quoted-printable");
  out.push("");
  out.push(quotedPrintable(html));
  out.push(`--${boundary}--`);
}

function appendAttachment(out: string[], a: OutgoingAttachment, inline: boolean): void {
  const safeFilename = a.filename.replace(/[\r\n"]/g, "_");
  out.push(`Content-Type: ${a.contentType}; name="${safeFilename}"`);
  out.push("Content-Transfer-Encoding: base64");
  out.push(
    `Content-Disposition: ${inline ? "inline" : "attachment"}; filename="${safeFilename}"`,
  );
  if (inline && a.cid) out.push(`Content-ID: <${a.cid}>`);
  out.push("");
  const b64 = Buffer.from(a.data).toString("base64");
  // RFC 5322 line length cap.
  for (let i = 0; i < b64.length; i += 76) out.push(b64.slice(i, i + 76));
}

function encodeHeader(value: string): string {
  // If pure ASCII, return as-is.
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  const b64 = Buffer.from(value, "utf8").toString("base64");
  // Wrap encoded-word at 75 chars per line (per RFC 2047) — we keep it simple.
  return `=?utf-8?B?${b64}?=`;
}

function quotedPrintable(input: string): string {
  // Simple QP encoder. Keeps ASCII printable + space/tab; encodes others.
  const out: string[] = [];
  let line = "";
  const flushLine = (): void => {
    out.push(line);
    line = "";
  };
  const append = (chunk: string): void => {
    if (line.length + chunk.length > 76) {
      out.push(`${line}=`);
      line = "";
    }
    line += chunk;
  };
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const code = c.charCodeAt(0);
    if (c === "\r") continue;
    if (c === "\n") {
      flushLine();
      continue;
    }
    if (c === "=" || code > 126 || (code < 32 && c !== "\t")) {
      const utf8 = Buffer.from(c, "utf8");
      for (const byte of utf8) append(`=${byte.toString(16).toUpperCase().padStart(2, "0")}`);
      continue;
    }
    if ((c === " " || c === "\t") && (input[i + 1] === "\n" || i === input.length - 1)) {
      append(`=${code.toString(16).toUpperCase().padStart(2, "0")}`);
      continue;
    }
    append(c);
  }
  if (line.length > 0) flushLine();
  return out.join("\r\n");
}

/** Generate a stable RFC-conformant Message-ID for outgoing mail. */
export function newMessageId(domain: string): string {
  const random = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${random}@${domain}`;
}
