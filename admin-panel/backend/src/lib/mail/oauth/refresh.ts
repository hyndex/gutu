/** Per-connection refresh helper.
 *
 *  Loads `mail.connection` records, decrypts the refresh token, swaps it
 *  via the provider, and writes the new access+refresh+expires back. A
 *  single in-process mutex guards against concurrent refresh storms.
 *
 *  Used by the driver layer (refreshes JIT before a call) and the cron
 *  job (proactive refresh of tokens about to expire). */

import { db, nowIso } from "../../../db";
import { encryptString, tryDecryptString } from "../crypto/at-rest";
import { ensureProviders, getProvider } from ".";
import type { TokenSet } from ".";
import { recordAudit } from "../../audit";

interface ConnectionRow {
  id: string;
  provider: string;
  email: string;
  userId: string;
  refreshTokenCipher: Uint8Array;
  accessTokenCipher: Uint8Array;
  expiresAt: string;
  status: string;
}

const inflight = new Map<string, Promise<TokenSet | null>>();

export async function refreshConnection(connectionId: string): Promise<TokenSet | null> {
  ensureProviders();
  const existing = inflight.get(connectionId);
  if (existing) return existing;
  const p = doRefresh(connectionId).finally(() => inflight.delete(connectionId));
  inflight.set(connectionId, p);
  return p;
}

async function doRefresh(connectionId: string): Promise<TokenSet | null> {
  const conn = loadConnection(connectionId);
  if (!conn) return null;
  const provider = getProvider(conn.provider);
  if (!provider) {
    markStatus(connectionId, "error", `unknown provider ${conn.provider}`);
    return null;
  }
  const refreshToken = tryDecryptString(conn.refreshTokenCipher);
  if (!refreshToken) {
    markStatus(connectionId, "auth_required", "refresh-token unreadable");
    return null;
  }
  try {
    const tokens = await provider.refresh(refreshToken);
    persistTokens(connectionId, tokens);
    recordAudit({
      actor: conn.userId,
      action: "mail.connection.refreshed",
      resource: "mail.connection",
      recordId: connectionId,
      payload: { provider: conn.provider, expiresInSec: tokens.expiresInSec },
    });
    return tokens;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    markStatus(connectionId, "auth_required", msg);
    recordAudit({
      actor: conn.userId,
      action: "mail.connection.refresh_failed",
      resource: "mail.connection",
      recordId: connectionId,
      level: "warn",
      payload: { provider: conn.provider, error: msg },
    });
    return null;
  }
}

function loadConnection(connectionId: string): ConnectionRow | null {
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = 'mail.connection' AND id = ?`)
    .get(connectionId) as { data: string } | undefined;
  if (!row) return null;
  const rec = JSON.parse(row.data) as Record<string, unknown>;
  const refreshTokenCipher = base64ToBytes(rec.refreshTokenCipher as string);
  const accessTokenCipher = base64ToBytes(rec.accessTokenCipher as string);
  if (!refreshTokenCipher) return null;
  return {
    id: connectionId,
    provider: String(rec.provider),
    email: String(rec.email ?? ""),
    userId: String(rec.userId ?? ""),
    refreshTokenCipher,
    accessTokenCipher: accessTokenCipher ?? new Uint8Array(),
    expiresAt: String(rec.tokenExpiresAt ?? ""),
    status: String(rec.status ?? "active"),
  };
}

function persistTokens(connectionId: string, tokens: TokenSet): void {
  const accessCipher = encryptString(tokens.accessToken);
  const newRefresh = tokens.refreshToken ? encryptString(tokens.refreshToken) : null;
  const expiresAt = new Date(Date.now() + (tokens.expiresInSec - 30) * 1000).toISOString();
  const existing = db
    .prepare(`SELECT data FROM records WHERE resource = 'mail.connection' AND id = ?`)
    .get(connectionId) as { data: string } | undefined;
  if (!existing) return;
  const rec = JSON.parse(existing.data) as Record<string, unknown>;
  rec.accessTokenCipher = bytesToBase64(accessCipher);
  if (newRefresh) rec.refreshTokenCipher = bytesToBase64(newRefresh);
  rec.tokenExpiresAt = expiresAt;
  rec.status = "active";
  rec.lastError = null;
  rec.updatedAt = nowIso();
  db.prepare(
    `UPDATE records SET data = ?, updated_at = ? WHERE resource = 'mail.connection' AND id = ?`,
  ).run(JSON.stringify(rec), rec.updatedAt as string, connectionId);
}

function markStatus(connectionId: string, status: string, error?: string): void {
  const existing = db
    .prepare(`SELECT data FROM records WHERE resource = 'mail.connection' AND id = ?`)
    .get(connectionId) as { data: string } | undefined;
  if (!existing) return;
  const rec = JSON.parse(existing.data) as Record<string, unknown>;
  rec.status = status;
  if (error) rec.lastError = error;
  rec.updatedAt = nowIso();
  db.prepare(
    `UPDATE records SET data = ?, updated_at = ? WHERE resource = 'mail.connection' AND id = ?`,
  ).run(JSON.stringify(rec), rec.updatedAt as string, connectionId);
}

function base64ToBytes(s: string | null | undefined): Uint8Array | null {
  if (!s || typeof s !== "string") return null;
  try { return new Uint8Array(Buffer.from(s, "base64")); } catch { return null; }
}

function bytesToBase64(b: Uint8Array): string {
  return Buffer.from(b).toString("base64");
}

export { base64ToBytes, bytesToBase64 };
