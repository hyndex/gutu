/** Object-key sanitization shared by all adapters.
 *
 *  Rules enforced:
 *   - Reject NULs, CR, LF.
 *   - Reject `..` path segments (would escape tenant prefix on local FS,
 *     and S3 accepts them but then breaks some tooling).
 *   - Reject leading `/` — keys are relative.
 *   - Reject keys longer than 1024 bytes (S3 limit).
 *   - Allow `[A-Za-z0-9!_.*'()/-]` verbatim; other bytes are percent-encoded
 *     to produce a round-trippable representation the backend tolerates.
 *
 *  We keep encoding conservative: consumers pass human-intended keys
 *  (`tenant/acme/invoices/2026-04.pdf`), adapters store and return the same
 *  string. Multi-byte UTF-8 is allowed.
 */

import { InvalidKey } from "./errors";

const MAX_KEY_BYTES = 1024;

/** Safe characters that never need encoding across any S3-compatible store
 *  and on any POSIX / Windows filesystem. */
const UNRESERVED = /[A-Za-z0-9._\-/]/;

export function validateObjectKey(adapter: string, key: string): void {
  if (key.length === 0) throw new InvalidKey(adapter, key, "empty");
  if (key.startsWith("/")) throw new InvalidKey(adapter, key, "leading slash not allowed");
  if (key.includes("\0")) throw new InvalidKey(adapter, key, "NUL byte not allowed");
  if (key.includes("\r") || key.includes("\n"))
    throw new InvalidKey(adapter, key, "CR/LF not allowed");

  const bytes = new TextEncoder().encode(key).byteLength;
  if (bytes > MAX_KEY_BYTES)
    throw new InvalidKey(
      adapter,
      key,
      `encoded key is ${bytes} bytes, max ${MAX_KEY_BYTES}`,
    );

  // Disallow `..` segments.
  const segments = key.split("/");
  for (const seg of segments) {
    if (seg === "..") throw new InvalidKey(adapter, key, "parent-dir segment not allowed");
  }
}

/** Join a tenant-scope prefix with a caller-supplied key, guaranteeing the
 *  result can never escape the prefix. Used by the local adapter (where
 *  escape would mean writing outside `filesRoot`) and optionally by S3
 *  adapters for per-tenant prefix enforcement.
 *
 *  Lenient on leading/trailing slashes — both prefix and key are normalized
 *  before joining — but STRICT on `..` segments and other invalid content. */
export function joinTenantKey(prefix: string, key: string): string {
  const p = prefix.replace(/^\/+|\/+$/g, "");
  const k = key.replace(/^\/+/, "");
  // Validate the normalized key so `joinTenantKey("t", "/x")` works, but
  // `joinTenantKey("t", "../x")` still throws.
  validateObjectKey("join", k);
  return p ? `${p}/${k}` : k;
}

/** For display / filesystems that disallow some characters. */
export function percentEncodeKey(key: string): string {
  let out = "";
  for (const ch of key) {
    if (ch === "/" || UNRESERVED.test(ch)) {
      out += ch;
    } else {
      for (const byte of new TextEncoder().encode(ch)) {
        out += "%" + byte.toString(16).toUpperCase().padStart(2, "0");
      }
    }
  }
  return out;
}
