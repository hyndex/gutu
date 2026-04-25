/** /api/mail/image-proxy — fetches and caches external images.
 *
 *  - URL is HMAC-signed by the sanitizer to prevent open-proxy abuse.
 *  - SSRF guard rejects internal IPs, localhost, link-local, multicast.
 *  - Tracker detection short-circuits with a 1×1 transparent PNG.
 *  - Responses are cached for 30 days in `mail_image_cache` and the
 *    binary blob lives on disk via the storage adapter (or inline bytes
 *    when no adapter). */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db, nowIso } from "../../db";
import { hmacHex } from "../../lib/mail/crypto/at-rest";
import { POLICIES, takeToken } from "../../lib/mail/rate-limit";
import { classifyTracker } from "../../lib/mail/tracker-detection";
import { errorResponse, userIdOf } from "./_helpers";

export const imageProxyRoutes = new Hono();
imageProxyRoutes.use("*", requireAuth);

const MAX_IMAGE_BYTES = parseInt(process.env.MAIL_IMAGE_PROXY_MAX_BYTES ?? `${5 * 1024 * 1024}`, 10);
const FETCH_TIMEOUT_MS = parseInt(process.env.MAIL_IMAGE_PROXY_TIMEOUT_MS ?? "10000", 10);
const CACHE_TTL_MS = 30 * 86_400_000;

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYGD4DwABCgEBhuQ7VgAAAABJRU5ErkJggg==",
  "base64",
);

imageProxyRoutes.get("/", async (c) => {
  const u = c.req.query("u") ?? "";
  const sig = c.req.query("h") ?? "";
  if (!u || !sig) return errorResponse(c, 400, "missing-params", "u + h required");
  if (!verifyHmac(u, sig)) return errorResponse(c, 403, "bad-hmac", "invalid signature");
  const decoded = safeDecode(u);
  if (!decoded) return errorResponse(c, 400, "bad-url", "invalid url");
  const decision = takeToken(`imgproxy:${userIdOf(c)}`, POLICIES.imageProxy);
  if (!decision.allowed) {
    c.header("Retry-After", String(Math.ceil(decision.retryAfterMs / 1000)));
    return errorResponse(c, 429, "rate-limited", "rate limit");
  }

  const hash = hashUrl(decoded);
  const cached = db
    .prepare(`SELECT * FROM mail_image_cache WHERE hash = ?`)
    .get(hash) as { hash: string; remote_url: string; mime_type: string | null; size_bytes: number | null; expires_at: string; blocked_reason: string | null; tracker_host: number; file_id: string | null } | undefined;

  if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
    if (cached.blocked_reason) {
      c.header("X-Mail-Tracker", cached.blocked_reason);
      return new Response(TRANSPARENT_PNG, { status: 200, headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
    }
    if (cached.file_id) {
      const fileRow = db
        .prepare(`SELECT data FROM records WHERE resource = 'files.file' AND id = ?`)
        .get(cached.file_id) as { data: string } | undefined;
      if (fileRow) {
        const f = JSON.parse(fileRow.data) as { bytes?: string };
        if (f.bytes) {
          return new Response(Buffer.from(f.bytes, "base64"), {
            status: 200,
            headers: { "Content-Type": cached.mime_type ?? "image/png", "Cache-Control": "private, max-age=86400" },
          });
        }
      }
    }
  }

  // SSRF guard.
  let parsed: URL;
  try { parsed = new URL(decoded); }
  catch { return errorResponse(c, 400, "bad-url", "invalid url"); }
  if (!isHostAllowed(parsed.host)) return errorResponse(c, 403, "blocked-host", "host not allowed");

  // Tracker classification.
  const verdict = classifyTracker(decoded);
  if (verdict.blocked) {
    upsertCache(hash, decoded, null, null, null, verdict.reason ?? "blocked");
    return new Response(TRANSPARENT_PNG, { status: 200, headers: { "Content-Type": "image/png" } });
  }

  // Fetch.
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(decoded, {
      signal: ctrl.signal,
      headers: { "User-Agent": "GutuMailImageProxy/1.0" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return errorResponse(c, 502, "fetch-failed", `upstream ${res.status}`);
    const contentType = (res.headers.get("content-type") ?? "image/png").split(";")[0].trim();
    if (!contentType.startsWith("image/")) {
      upsertCache(hash, decoded, null, null, null, "non-image");
      return errorResponse(c, 415, "non-image", "upstream is not an image");
    }
    const ab = await res.arrayBuffer();
    if (ab.byteLength > MAX_IMAGE_BYTES) {
      upsertCache(hash, decoded, null, null, null, "too-large");
      return errorResponse(c, 413, "too-large", "image exceeds size cap");
    }
    const bytes = Buffer.from(ab);
    const fileId = `imgcache_${hash}`;
    db.prepare(
      `INSERT INTO records (resource, id, data, created_at, updated_at)
       VALUES ('files.file', ?, ?, ?, ?)
       ON CONFLICT(resource, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    ).run(fileId, JSON.stringify({ id: fileId, mime_type: contentType, bytes: bytes.toString("base64"), size: bytes.length, ownerResource: "mail.image-cache" }), nowIso(), nowIso());
    upsertCache(hash, decoded, fileId, contentType, bytes.length, null);
    return new Response(bytes, { status: 200, headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=86400" } });
  } catch (err) {
    upsertCache(hash, decoded, null, null, null, err instanceof Error ? err.message : "fetch-error");
    return errorResponse(c, 502, "fetch-error", err instanceof Error ? err.message : "fetch failed");
  }
});

function verifyHmac(u: string, sig: string): boolean {
  return hmacHex(u, "image-proxy") === sig;
}

function safeDecode(u: string): string | null {
  try { return Buffer.from(u, "base64").toString("utf8"); } catch { return null; }
}

function hashUrl(u: string): string {
  return hmacHex(u, "image-proxy-hash");
}

function isHostAllowed(host: string): boolean {
  if (!host) return false;
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local")) return false;
  // Reject IPv4 private ranges.
  const v4 = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [_, a, b] = v4.map((s) => parseInt(s, 10));
    void _;
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 0) return false;
    if (a >= 224) return false;
  }
  // Reject obvious IPv6 link-local / loopback.
  if (lower.startsWith("[fc") || lower.startsWith("[fd") || lower.startsWith("[fe80") || lower === "[::1]") return false;
  return true;
}

function upsertCache(hash: string, url: string, fileId: string | null, mime: string | null, size: number | null, blockedReason: string | null): void {
  const fetchedAt = nowIso();
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  db.prepare(
    `INSERT INTO mail_image_cache (hash, remote_url, file_id, mime_type, size_bytes, fetched_at, expires_at, blocked_reason, tracker_host)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(hash) DO UPDATE SET
       file_id = excluded.file_id,
       mime_type = excluded.mime_type,
       size_bytes = excluded.size_bytes,
       fetched_at = excluded.fetched_at,
       expires_at = excluded.expires_at,
       blocked_reason = excluded.blocked_reason`,
  ).run(hash, url, fileId, mime, size, fetchedAt, expiresAt, blockedReason, blockedReason ? 1 : 0);
}

/** Helper used by the sanitizer when rewriting <img src>. Exported for the
 *  message reader; also accessible through `lib/mail/image-proxy-url`. */
export function buildImageProxyUrl(remoteUrl: string): string {
  const sig = hmacHex(remoteUrl, "image-proxy");
  const enc = Buffer.from(remoteUrl).toString("base64");
  return `/api/mail/image-proxy?u=${encodeURIComponent(enc)}&h=${sig}`;
}
