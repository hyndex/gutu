/** Web Push (VAPID) helpers — payload encryption + JWT signing.
 *
 *  Pure-Node implementation using `crypto` so we don't pull in a heavy
 *  push library. Implements RFC 8030 + RFC 8291 (aes128gcm content
 *  encoding) + RFC 8292 (VAPID JWT).
 *
 *  Operators provide the VAPID keypair via env:
 *    MAIL_PUSH_VAPID_PUBLIC  base64url-encoded uncompressed P-256 public key
 *    MAIL_PUSH_VAPID_PRIVATE base64url-encoded raw 32-byte private scalar
 *    MAIL_PUSH_VAPID_SUBJECT mailto:ops@example.com  (per RFC 8292)
 *
 *  When env is missing, push is a no-op (logged warning) — the rest of
 *  the system still works. */

import crypto from "node:crypto";
import { Buffer } from "node:buffer";

const PUBLIC = (process.env.MAIL_PUSH_VAPID_PUBLIC ?? "").trim();
const PRIVATE = (process.env.MAIL_PUSH_VAPID_PRIVATE ?? "").trim();
const SUBJECT = (process.env.MAIL_PUSH_VAPID_SUBJECT ?? "mailto:ops@example.com").trim();

export interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
}

export function isPushConfigured(): boolean {
  return !!PUBLIC && !!PRIVATE;
}

export function vapidPublicKey(): string {
  return PUBLIC;
}

interface SendArgs {
  subscription: PushSubscription;
  payload: string;
  ttl?: number;
  urgency?: "very-low" | "low" | "normal" | "high";
  topic?: string;
}

export interface SendResult { ok: boolean; status: number; bodyText?: string }

export async function sendPush(args: SendArgs): Promise<SendResult> {
  if (!isPushConfigured()) {
    return { ok: false, status: 0, bodyText: "VAPID not configured" };
  }
  const ttl = args.ttl ?? 60;
  const url = new URL(args.subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = signVapidJwt(audience, SUBJECT);
  const encrypted = await encryptPayload(args.subscription, args.payload);

  const headers: Record<string, string> = {
    "Authorization": `vapid t=${jwt}, k=${PUBLIC}`,
    "Content-Type": "application/octet-stream",
    "Content-Encoding": "aes128gcm",
    "TTL": String(ttl),
    "Urgency": args.urgency ?? "normal",
  };
  if (args.topic) headers["Topic"] = args.topic;

  const res = await fetch(args.subscription.endpoint, {
    method: "POST",
    headers,
    body: new Uint8Array(encrypted) as BodyInit,
  });
  const text = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, bodyText: text };
}

function b64urlToBuffer(s: string): Buffer {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function bufferToB64url(b: Buffer): string {
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function signVapidJwt(audience: string, subject: string): string {
  const header = bufferToB64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const payload = bufferToB64url(Buffer.from(JSON.stringify({ aud: audience, exp, sub: subject })));
  const data = `${header}.${payload}`;

  const privateBuf = b64urlToBuffer(PRIVATE);
  const keyObject = derivePrivateKeyObject(privateBuf);

  const sig = crypto.sign(null, Buffer.from(data), { key: keyObject, dsaEncoding: "ieee-p1363" });
  return `${data}.${bufferToB64url(sig)}`;
}

function derivePrivateKeyObject(rawScalar: Buffer): crypto.KeyObject {
  // Build a PKCS#8 DER blob from the raw 32-byte private scalar +
  // public key. We use the public key from env (uncompressed 0x04 || x || y).
  const pubBuf = b64urlToBuffer(PUBLIC);
  // The structure here is: SEQUENCE { INTEGER 0, AlgorithmIdentifier(ec, prime256v1), OCTET STRING { SEQUENCE { INTEGER 1, OCTET STRING <scalar>, [1] BIT STRING <pub> } } }.
  // Easier: build via JWK and import.
  if (pubBuf.length !== 65 || pubBuf[0] !== 0x04) {
    throw new Error("MAIL_PUSH_VAPID_PUBLIC must be uncompressed P-256 (65 bytes starting 0x04)");
  }
  const x = pubBuf.subarray(1, 33);
  const y = pubBuf.subarray(33);
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: bufferToB64url(rawScalar),
    x: bufferToB64url(x),
    y: bufferToB64url(y),
  };
  return crypto.createPrivateKey({ key: jwk, format: "jwk" });
}

/** RFC 8291 aes128gcm payload encryption.
 *  Input: subscription.keys (p256dh, auth), payload (UTF-8).
 *  Output: encrypted body. */
async function encryptPayload(sub: PushSubscription, payload: string): Promise<Buffer> {
  const ua_public = b64urlToBuffer(sub.keys.p256dh);
  const auth = b64urlToBuffer(sub.keys.auth);
  if (ua_public.length !== 65) throw new Error("subscription.keys.p256dh malformed");

  // Generate ephemeral ECDH keypair on P-256.
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  const as_public = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(ua_public);

  // PRK_key = HKDF-Extract(auth_secret, ECDH_shared_secret); 32 bytes.
  const key_info = Buffer.concat([Buffer.from("WebPush: info\0", "utf8"), ua_public, as_public]);
  const prk_key = hkdfExtract(auth, shared);
  const ikm = hkdfExpand(prk_key, key_info, 32);

  const salt = crypto.randomBytes(16);
  const prk = hkdfExtract(salt, ikm);

  const cek = hkdfExpand(prk, Buffer.concat([Buffer.from("Content-Encoding: aes128gcm\0", "utf8")]), 16);
  const nonce = hkdfExpand(prk, Buffer.concat([Buffer.from("Content-Encoding: nonce\0", "utf8")]), 12);

  // Pad payload: 0x02 || padding-zero* — minimal padding.
  const plain = Buffer.concat([Buffer.from(payload, "utf8"), Buffer.from([0x02])]);

  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Header per RFC 8188 § 2.1: salt || rs(4) || idlen(1) || keyid(idlen) || ciphertext+tag
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096, 0);
  const idLen = Buffer.alloc(1);
  idLen.writeUInt8(as_public.length, 0);
  return Buffer.concat([salt, rs, idLen, as_public, ct, tag]);
}

function hkdfExtract(salt: Buffer, ikm: Buffer): Buffer {
  return crypto.createHmac("sha256", salt).update(ikm).digest();
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number): Buffer {
  const out: Buffer[] = [];
  let prev = Buffer.alloc(0);
  let counter = 0;
  while (Buffer.concat(out).length < length) {
    counter++;
    prev = crypto.createHmac("sha256", prk).update(Buffer.concat([prev, info, Buffer.from([counter])])).digest();
    out.push(prev);
  }
  return Buffer.concat(out).subarray(0, length);
}
