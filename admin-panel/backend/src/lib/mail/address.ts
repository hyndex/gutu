/** RFC 5322 address parsing/formatting helpers — minimal but correct
 *  enough for the cases we hit (display-name vs angle-addr, group syntax
 *  is reduced to a flat list, comments are stripped, encoded-word
 *  display names are decoded). */

export interface Address {
  name?: string;
  email: string;
}

const EMAIL_REGEX =
  /^[A-Za-z0-9._%+\-!#$&'*+/=?^`{|}~]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function formatAddress(addr: Address): string {
  const email = addr.email.trim();
  if (!addr.name) return email;
  if (/[",.<>@]/.test(addr.name)) return `"${addr.name.replace(/"/g, '\\"')}" <${email}>`;
  return `${addr.name} <${email}>`;
}

export function formatAddresses(addrs: readonly Address[]): string {
  return addrs.map(formatAddress).join(", ");
}

/** Parse a single address. Returns null on malformed input. */
export function parseAddress(input: string): Address | null {
  if (!input) return null;
  const stripped = stripComments(input).trim();
  // Display name + angle addr: `Name <email@host>` or `"Name" <email@host>`
  const m = stripped.match(/^(.*?)<\s*([^>]+)\s*>\s*$/);
  if (m) {
    const rawName = m[1].trim().replace(/^"(.*)"$/, "$1");
    const decoded = decodeEncodedWords(rawName);
    const email = m[2].trim();
    if (!isValidEmail(email)) return null;
    return { name: decoded || undefined, email };
  }
  // Bare addr-spec.
  if (isValidEmail(stripped)) return { email: stripped };
  return null;
}

/** Parse a comma-separated address list. Filters bad entries. */
export function parseAddressList(input: string): Address[] {
  if (!input) return [];
  const out: Address[] = [];
  for (const part of splitAddressList(input)) {
    const a = parseAddress(part);
    if (a) out.push(a);
  }
  return out;
}

function splitAddressList(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inQuote = false;
  let buf = "";
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"' && input[i - 1] !== "\\") inQuote = !inQuote;
    if (!inQuote) {
      if (c === "<") depth++;
      else if (c === ">") depth--;
      else if (c === "(") depth++;
      else if (c === ")") depth--;
      if (c === "," && depth === 0) {
        if (buf.trim()) out.push(buf);
        buf = "";
        continue;
      }
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function stripComments(input: string): string {
  let out = "";
  let depth = 0;
  let inQuote = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"' && input[i - 1] !== "\\") inQuote = !inQuote;
    if (!inQuote && c === "(") {
      depth++;
      continue;
    }
    if (!inQuote && c === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0) out += c;
  }
  return out;
}

/** Decode a single encoded-word: =?charset?B?...?= or =?charset?Q?...?= .
 *  We support utf-8 / latin-1 / iso-8859-1 charsets as those cover ~99.5%. */
export function decodeEncodedWords(input: string): string {
  return input.replace(
    /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
    (_, charsetRaw, enc, payload) => {
      const charset = charsetRaw.toLowerCase();
      try {
        let bytes: Buffer;
        if (enc.toUpperCase() === "B") {
          bytes = Buffer.from(payload, "base64");
        } else {
          // Q-encoding: _ → space, =XX → byte
          const fixed = payload.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_m: string, hex: string) =>
            String.fromCharCode(parseInt(hex, 16)),
          );
          bytes = Buffer.from(fixed, "binary");
        }
        if (charset === "utf-8" || charset === "utf8") return bytes.toString("utf8");
        if (charset === "iso-8859-1" || charset === "latin1") return bytes.toString("latin1");
        // Best effort.
        return bytes.toString("utf8");
      } catch {
        return payload;
      }
    },
  );
}

/** Hash of a participant set, used to dedupe threading and as a stable
 *  "this is the same conversation thread" signal. */
export function participantsHash(addrs: readonly Address[]): string {
  const emails = Array.from(new Set(addrs.map((a) => normalizeEmail(a.email))))
    .sort()
    .join(",");
  // Cheap, stable hash — DJB2.
  let h = 5381;
  for (let i = 0; i < emails.length; i++) {
    h = (h * 33) ^ emails.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

/** Strip the common "Re:" / "Fwd:" / locale-equivalent prefixes for
 *  threading similarity. */
export function normalizeSubject(subject: string | undefined | null): string {
  if (!subject) return "";
  let s = subject.trim();
  // Loop because "Re: Fwd: Re:" is common.
  for (let i = 0; i < 8; i++) {
    const before = s;
    s = s.replace(/^(re|fwd?|aw|sv|antw|wg|tr|odp|res|ynt|enc|odpowiedz)\s*[:：]\s*/i, "");
    s = s.replace(/^\s*\[[^\]]+\]\s*/, "");
    if (s === before) break;
  }
  return s.trim();
}
