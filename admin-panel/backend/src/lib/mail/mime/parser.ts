/** Minimal RFC 2045/2046/5322 MIME parser.
 *
 *  Handles the message shapes we actually see in production: text/plain,
 *  text/html, multipart/alternative, multipart/related, multipart/mixed,
 *  attachments, content-transfer-encoding base64/quoted-printable, charset
 *  detection (UTF-8, ISO-8859-1, Latin-1, ASCII fallback).
 *
 *  Returns a normalized structure that the rest of the system uses
 *  uniformly across providers (Gmail, Microsoft, IMAP raw fetch). */

import { parseAddress, parseAddressList, decodeEncodedWords, type Address } from "../address";

export interface MimePart {
  contentType: string;
  charset?: string;
  encoding?: string;
  filename?: string;
  cid?: string;
  disposition?: "inline" | "attachment" | string;
  headers: Record<string, string>;
  body: Uint8Array;
  parts?: MimePart[];
  size: number;
}

export interface ParsedEmail {
  messageId?: string;
  inReplyTo?: string;
  references: string[];
  date?: string;
  from?: Address;
  sender?: Address;
  replyTo: Address[];
  to: Address[];
  cc: Address[];
  bcc: Address[];
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  headers: Record<string, string>;
  attachments: ParsedAttachment[];
  inlineParts: ParsedAttachment[];
  hasCalendarInvite: boolean;
  rawSize: number;
  hasArc: boolean;
  hasAuthResults: boolean;
  authResults?: string;
  listUnsubscribe?: string;
  listUnsubscribePost?: string;
  listId?: string;
  precedence?: string;
  autoSubmitted?: string;
}

export interface ParsedAttachment {
  filename: string;
  contentType: string;
  cid?: string;
  size: number;
  data: Uint8Array;
  disposition: "inline" | "attachment";
  isCalendar: boolean;
}

const HEADER_NAMES_KEEP = new Set([
  "subject", "from", "to", "cc", "bcc", "reply-to", "sender", "date",
  "message-id", "in-reply-to", "references",
  "list-id", "list-unsubscribe", "list-unsubscribe-post", "precedence",
  "auto-submitted", "x-priority", "importance",
  "authentication-results", "arc-authentication-results",
  "received-spf", "dkim-signature", "arc-message-signature",
  "x-mailer", "user-agent",
  "return-path", "delivered-to",
]);

export function parseRfc822(raw: Uint8Array | string): ParsedEmail {
  const buf = typeof raw === "string" ? new TextEncoder().encode(raw) : raw;
  const headerEnd = findHeaderBoundary(buf);
  const headerBlock = headerEnd === -1 ? bytesToLatin1(buf) : bytesToLatin1(buf.subarray(0, headerEnd));
  const bodyStart = headerEnd === -1 ? buf.length : headerEnd + 4;
  const headers = parseHeaderBlock(headerBlock);
  const filteredHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (HEADER_NAMES_KEEP.has(k)) filteredHeaders[k] = v;
  }
  const root = parsePart(headers, buf.subarray(bodyStart));

  const collected = collectBodies(root);
  const out: ParsedEmail = {
    messageId: cleanMessageId(headers["message-id"]),
    inReplyTo: cleanMessageId(headers["in-reply-to"]),
    references: parseReferences(headers["references"]),
    date: headers["date"],
    from: parseAddress(decodeEncodedWords(headers["from"] ?? "")) ?? undefined,
    sender: parseAddress(decodeEncodedWords(headers["sender"] ?? "")) ?? undefined,
    replyTo: parseAddressList(decodeEncodedWords(headers["reply-to"] ?? "")),
    to: parseAddressList(decodeEncodedWords(headers["to"] ?? "")),
    cc: parseAddressList(decodeEncodedWords(headers["cc"] ?? "")),
    bcc: parseAddressList(decodeEncodedWords(headers["bcc"] ?? "")),
    subject: headers["subject"] ? decodeEncodedWords(headers["subject"]) : undefined,
    bodyText: collected.text,
    bodyHtml: collected.html,
    headers: filteredHeaders,
    attachments: collected.attachments,
    inlineParts: collected.inline,
    hasCalendarInvite: collected.hasCalendar,
    rawSize: buf.length,
    hasArc: !!headers["arc-message-signature"],
    hasAuthResults: !!headers["authentication-results"],
    authResults: headers["authentication-results"],
    listUnsubscribe: headers["list-unsubscribe"],
    listUnsubscribePost: headers["list-unsubscribe-post"],
    listId: headers["list-id"],
    precedence: headers["precedence"],
    autoSubmitted: headers["auto-submitted"],
  };
  return out;
}

function bytesToLatin1(buf: Uint8Array): string {
  let s = "";
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return s;
}

function findHeaderBoundary(buf: Uint8Array): number {
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === 13 && buf[i + 1] === 10 && buf[i + 2] === 13 && buf[i + 3] === 10) return i;
    if (buf[i] === 10 && buf[i + 1] === 10) return i;
  }
  return -1;
}

function parseHeaderBlock(headerStr: string): Record<string, string> {
  const lines = headerStr.replace(/\r/g, "").split("\n");
  const out: Record<string, string> = {};
  let currentKey: string | null = null;
  let currentVal = "";
  const flush = () => {
    if (!currentKey) return;
    if (out[currentKey]) out[currentKey] += `, ${currentVal.trim()}`;
    else out[currentKey] = currentVal.trim();
  };
  for (const line of lines) {
    if (!line) continue;
    if (/^[ \t]/.test(line) && currentKey) {
      currentVal += ` ${line.trim()}`;
      continue;
    }
    flush();
    const idx = line.indexOf(":");
    if (idx === -1) {
      currentKey = null;
      currentVal = "";
      continue;
    }
    currentKey = line.slice(0, idx).toLowerCase().trim();
    currentVal = line.slice(idx + 1);
  }
  flush();
  return out;
}

function parseHeaderParameters(value: string | undefined): { value: string; params: Record<string, string> } {
  if (!value) return { value: "", params: {} };
  const parts = value.split(/;(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  const main = (parts[0] ?? "").trim().toLowerCase();
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const name = p.slice(0, eq).trim().toLowerCase();
    let v = p.slice(eq + 1).trim();
    v = v.replace(/^"(.*)"$/, "$1");
    params[name] = v;
  }
  return { value: main, params };
}

interface PartContext {
  contentType: string;
  charset?: string;
  encoding?: string;
  filename?: string;
  cid?: string;
  disposition?: string;
  headers: Record<string, string>;
}

function partContext(headers: Record<string, string>): PartContext {
  const ct = parseHeaderParameters(headers["content-type"]);
  const cd = parseHeaderParameters(headers["content-disposition"]);
  return {
    contentType: ct.value || "text/plain",
    charset: ct.params.charset,
    encoding: (headers["content-transfer-encoding"] ?? "").toLowerCase().trim() || "7bit",
    filename: ct.params.name ?? cd.params.filename,
    cid: cleanMessageId(headers["content-id"]),
    disposition: cd.value || (cid(headers) ? "inline" : undefined),
    headers,
  };
}

function cid(headers: Record<string, string>): string | undefined {
  return cleanMessageId(headers["content-id"]);
}

function parsePart(headers: Record<string, string>, body: Uint8Array): MimePart {
  const ctx = partContext(headers);
  if (ctx.contentType.startsWith("multipart/")) {
    const boundaryRaw = parseHeaderParameters(headers["content-type"]).params.boundary;
    if (!boundaryRaw) {
      return { ...ctx, body, size: body.length, parts: [] };
    }
    const parts = splitMultipart(body, boundaryRaw).map((slice) => {
      const innerHeaderEnd = findHeaderBoundary(slice);
      const headerStr = innerHeaderEnd === -1 ? "" : bytesToLatin1(slice.subarray(0, innerHeaderEnd));
      const innerHeaders = parseHeaderBlock(headerStr);
      const start = innerHeaderEnd === -1 ? 0 : innerHeaderEnd + (slice[innerHeaderEnd + 2] === 13 ? 4 : 2);
      return parsePart(innerHeaders, slice.subarray(start));
    });
    return { ...ctx, body: new Uint8Array(0), size: 0, parts };
  }
  const decoded = decodePartBody(body, ctx.encoding);
  return { ...ctx, body: decoded, size: decoded.length };
}

function splitMultipart(body: Uint8Array, boundary: string): Uint8Array[] {
  const delim = `--${boundary}`;
  const closeDelim = `${delim}--`;
  const text = bytesToLatin1(body);
  const parts: Uint8Array[] = [];
  let i = text.indexOf(delim);
  if (i === -1) return [];
  i += delim.length;
  while (i < text.length) {
    const next = text.indexOf(delim, i);
    if (next === -1) break;
    const partRaw = text.slice(i, next).replace(/\r?\n$/, "").replace(/^\r?\n/, "");
    parts.push(latin1ToBytes(partRaw));
    if (text.startsWith(closeDelim, next)) break;
    i = next + delim.length;
  }
  return parts;
}

function latin1ToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function decodePartBody(body: Uint8Array, encoding: string | undefined): Uint8Array {
  switch ((encoding ?? "").toLowerCase()) {
    case "base64": {
      const text = bytesToLatin1(body).replace(/[^A-Za-z0-9+/=]/g, "");
      try { return new Uint8Array(Buffer.from(text, "base64")); }
      catch { return body; }
    }
    case "quoted-printable":
      return decodeQuotedPrintable(body);
    case "7bit":
    case "8bit":
    case "binary":
    default:
      return body;
  }
}

function decodeQuotedPrintable(body: Uint8Array): Uint8Array {
  const text = bytesToLatin1(body);
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "=") {
      const next = text.slice(i + 1, i + 3);
      if (next === "\r\n" || next === "\n") {
        i += next.length;
        continue;
      }
      if (/^[0-9A-Fa-f]{2}$/.test(next)) {
        out.push(parseInt(next, 16));
        i += 2;
        continue;
      }
    }
    out.push(c.charCodeAt(0));
  }
  return new Uint8Array(out);
}

function decodeBytes(buf: Uint8Array, charset: string | undefined): string {
  const cs = (charset ?? "utf-8").toLowerCase();
  try {
    if (cs === "utf-8" || cs === "utf8" || cs === "us-ascii" || cs === "ascii") {
      return new TextDecoder("utf-8", { fatal: false }).decode(buf);
    }
    return new TextDecoder(cs, { fatal: false }).decode(buf);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  }
}

interface CollectedBodies {
  text?: string;
  html?: string;
  attachments: ParsedAttachment[];
  inline: ParsedAttachment[];
  hasCalendar: boolean;
}

function collectBodies(root: MimePart): CollectedBodies {
  const out: CollectedBodies = { attachments: [], inline: [], hasCalendar: false };
  const walk = (p: MimePart): void => {
    if (p.contentType.startsWith("multipart/") && p.parts) {
      if (p.contentType === "multipart/alternative") {
        // Prefer html when available; remember text for fallback.
        const text = p.parts.find((q) => q.contentType.startsWith("text/plain"));
        const html = p.parts.find((q) => q.contentType.startsWith("text/html"));
        if (text && !out.text) out.text = decodeBytes(text.body, text.charset);
        if (html && !out.html) out.html = decodeBytes(html.body, html.charset);
        for (const child of p.parts) {
          if (child === text || child === html) continue;
          walk(child);
        }
        return;
      }
      for (const child of p.parts) walk(child);
      return;
    }
    if (p.contentType.startsWith("text/plain") && (p.disposition !== "attachment")) {
      if (!out.text) out.text = decodeBytes(p.body, p.charset);
      return;
    }
    if (p.contentType.startsWith("text/html") && (p.disposition !== "attachment")) {
      if (!out.html) out.html = decodeBytes(p.body, p.charset);
      return;
    }
    if (p.contentType.startsWith("text/calendar")) {
      out.hasCalendar = true;
      out.attachments.push(toAttachment(p, "attachment"));
      return;
    }
    if (p.disposition === "attachment" || p.filename) {
      out.attachments.push(toAttachment(p, "attachment"));
      return;
    }
    if (p.cid) {
      out.inline.push(toAttachment(p, "inline"));
      return;
    }
    // Anything else, treat as attachment.
    out.attachments.push(toAttachment(p, "attachment"));
  };
  walk(root);
  return out;
}

function toAttachment(p: MimePart, fallbackDisposition: "inline" | "attachment"): ParsedAttachment {
  return {
    filename: p.filename ?? "attachment.bin",
    contentType: p.contentType,
    cid: p.cid,
    size: p.size,
    data: p.body,
    disposition: (p.disposition === "inline" ? "inline" : p.disposition === "attachment" ? "attachment" : fallbackDisposition),
    isCalendar: p.contentType.startsWith("text/calendar"),
  };
}

function cleanMessageId(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  const m = input.match(/<([^>]+)>/);
  return (m ? m[1] : input).trim() || undefined;
}

function parseReferences(input: string | undefined): string[] {
  if (!input) return [];
  const out: string[] = [];
  const re = /<([^>]+)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) out.push(m[1]);
  return out;
}
