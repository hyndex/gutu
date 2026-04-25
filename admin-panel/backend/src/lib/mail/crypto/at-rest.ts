/** At-rest encryption helpers.
 *
 *  Uses Node WebCrypto AES-GCM-256 with a 96-bit nonce. The key is loaded
 *  from `MAIL_AT_REST_KEY` (base64-encoded 32-byte). On dev / test, a
 *  deterministic ephemeral key is generated and held in process so the
 *  app boots without operator setup — but a warning is logged.
 *
 *  Versioned ciphertext layout:
 *    [u8 version=1][12 bytes nonce][rest = AES-GCM(ciphertext + tag)]
 *
 *  Versioning lets us rotate the key without rewriting every column at
 *  once: old rows decrypt under v1 keys, new writes under v2.
 *
 *  Inputs are UTF-8 strings; outputs are Uint8Array buffers — callers can
 *  store as BLOB (sqlite) or BYTEA (postgres). */

import crypto from "node:crypto";

interface KeyEntry {
  version: number;
  raw: Uint8Array;
}

let keyring: KeyEntry[] | null = null;
let primaryVersion = 1;

function loadKeyring(): KeyEntry[] {
  if (keyring) return keyring;

  const primary = (process.env.MAIL_AT_REST_KEY ?? "").trim();
  const olderRaw = (process.env.MAIL_AT_REST_KEY_OLD ?? "").trim();

  const out: KeyEntry[] = [];

  if (primary) {
    const buf = decodeKeyMaterial(primary, "MAIL_AT_REST_KEY");
    out.push({ version: parseVersion(process.env.MAIL_AT_REST_KEY_VERSION) ?? 2, raw: buf });
  }
  if (olderRaw) {
    const olderBuf = decodeKeyMaterial(olderRaw, "MAIL_AT_REST_KEY_OLD");
    out.push({ version: parseVersion(process.env.MAIL_AT_REST_KEY_OLD_VERSION) ?? 1, raw: olderBuf });
  }

  if (out.length === 0) {
    // Dev fallback only. Production deployments MUST set MAIL_AT_REST_KEY
    // explicitly; otherwise restarting the process invalidates every
    // encrypted column. We warn loudly and pin a deterministic ephemeral
    // key so seed data round-trips within a single process.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[mail] MAIL_AT_REST_KEY is required in production but was not set",
      );
    }
    const fallback = crypto.createHash("sha256").update("gutu-mail-dev-fallback-key").digest();
    out.push({ version: 1, raw: new Uint8Array(fallback) });
    if (process.env.NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.warn(
        "[mail] MAIL_AT_REST_KEY not set — using dev fallback (NOT FOR PRODUCTION).",
      );
    }
  }

  // Newest version first.
  out.sort((a, b) => b.version - a.version);
  primaryVersion = out[0].version;
  keyring = out;
  return out;
}

function decodeKeyMaterial(input: string, label: string): Uint8Array {
  // Accept either base64 or 64-character hex.
  let buf: Buffer;
  if (/^[0-9a-f]{64}$/i.test(input)) {
    buf = Buffer.from(input, "hex");
  } else {
    try {
      buf = Buffer.from(input, "base64");
    } catch {
      throw new Error(`[mail] ${label} is not valid base64 or hex`);
    }
  }
  if (buf.length !== 32) {
    throw new Error(
      `[mail] ${label} must decode to 32 bytes (256 bits), got ${buf.length}`,
    );
  }
  return new Uint8Array(buf);
}

function parseVersion(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getPrimaryKeyVersion(): number {
  loadKeyring();
  return primaryVersion;
}

function findKey(version: number): Uint8Array {
  const ring = loadKeyring();
  const match = ring.find((e) => e.version === version);
  if (!match) {
    throw new Error(`[mail] no decryption key for version ${version}`);
  }
  return match.raw;
}

/** Encrypt a UTF-8 string. Returns the versioned ciphertext blob. */
export function encryptString(plaintext: string): Uint8Array {
  return encryptBytes(new TextEncoder().encode(plaintext));
}

/** Encrypt arbitrary bytes. */
export function encryptBytes(plaintext: Uint8Array): Uint8Array {
  const ring = loadKeyring();
  const entry = ring[0];
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    entry.raw,
    nonce,
    { authTagLength: 16 },
  );
  const payload = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([
    Buffer.from([entry.version & 0xff]),
    nonce,
    payload,
    authTag,
  ]);
}

/** Decrypt a versioned ciphertext blob to UTF-8. */
export function decryptString(blob: Uint8Array): string {
  return new TextDecoder().decode(decryptBytes(blob));
}

/** Decrypt to bytes. Throws on tag mismatch / wrong version. */
export function decryptBytes(blob: Uint8Array): Uint8Array {
  if (blob.length < 1 + 12 + 16) {
    throw new Error("[mail] ciphertext too short");
  }
  const version = blob[0];
  const nonce = blob.subarray(1, 13);
  const tag = blob.subarray(blob.length - 16);
  const ct = blob.subarray(13, blob.length - 16);

  const key = findKey(version);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    nonce,
    { authTagLength: 16 },
  );
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(ct), decipher.final()]);
  return new Uint8Array(out);
}

/** Best-effort decrypt: returns null on any failure (used in degraded
 *  read paths so a single corrupted row doesn't break the inbox). */
export function tryDecryptString(blob: Uint8Array | null | undefined): string | null {
  if (!blob || blob.length === 0) return null;
  try {
    return decryptString(blob);
  } catch {
    return null;
  }
}

/** Constant-time HMAC for stable ids (e.g. content-addressed keys). */
export function hmacHex(input: string, namespace = "default"): string {
  const ring = loadKeyring();
  const key = ring[ring.length - 1].raw; // any key; doesn't need rotation
  return crypto.createHmac("sha256", Buffer.concat([key, Buffer.from(namespace)]))
    .update(input)
    .digest("hex");
}
