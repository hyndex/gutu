/** Shared helpers for `/api/mail/*` routes.
 *
 *  - `requireMail()` — mounts auth + tenant guard.
 *  - `mailFetchRecord()` — load a `mail.*` record with tenant isolation.
 *  - `errorResponse()` — uniform error shape across routes. */

import type { Context } from "hono";
import { db, nowIso } from "../../db";
import { getTenantContext } from "../../tenancy/context";
import { currentUser } from "../../middleware/auth";

export function tenantId(): string {
  return getTenantContext()?.tenantId ?? "default";
}

export function userIdOf(c: Context): string {
  const user = currentUser(c);
  return user.id ?? user.email ?? "unknown";
}

export function userEmailOf(c: Context): string {
  return currentUser(c).email ?? "unknown";
}

export function loadRecord<T = Record<string, unknown>>(resource: string, id: string): T | null {
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = ? AND id = ?`)
    .get(resource, id) as { data: string } | undefined;
  if (!row) return null;
  const rec = JSON.parse(row.data) as Record<string, unknown>;
  if (rec.tenantId && tenantId() !== "default" && rec.tenantId !== tenantId()) return null;
  if (rec.deletedAt) return null;
  return rec as T;
}

export function saveRecord(resource: string, rec: Record<string, unknown>): void {
  const id = String(rec.id);
  const now = nowIso();
  rec.updatedAt = now;
  if (!rec.createdAt) rec.createdAt = now;
  if (!rec.tenantId) rec.tenantId = tenantId();
  db.prepare(
    `INSERT INTO records (resource, id, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(resource, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(resource, id, JSON.stringify(rec), rec.createdAt as string, now);
}

export function deleteRecordHard(resource: string, id: string): boolean {
  const r = db.prepare(`DELETE FROM records WHERE resource = ? AND id = ?`).run(resource, id);
  return r.changes > 0;
}

export function softDelete(resource: string, id: string): boolean {
  const rec = loadRecord(resource, id);
  if (!rec) return false;
  rec.deletedAt = nowIso();
  saveRecord(resource, rec);
  return true;
}

export interface ErrorBody {
  error: string;
  code: string;
  details?: unknown;
}

export function errorResponse(c: Context, status: number, code: string, error: string, details?: unknown): Response {
  return c.json<ErrorBody>({ error, code, details }, status as 400 | 401 | 403 | 404 | 409 | 412 | 429 | 500 | 502 | 503 | 504);
}

export interface IdempotencyHit {
  body: unknown;
  status: number;
}

export function idempotencyGet(action: string, key: string): IdempotencyHit | null {
  const row = db
    .prepare(`SELECT result, status, expires_at FROM mail_idempotency WHERE key = ? AND action = ?`)
    .get(key, action) as { result: string; status: number; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM mail_idempotency WHERE key = ?").run(key);
    return null;
  }
  return { body: JSON.parse(row.result), status: row.status };
}

export function idempotencyPut(action: string, key: string, body: unknown, status: number, ttlMs = 24 * 60 * 60 * 1000): void {
  const now = nowIso();
  const expires = new Date(Date.now() + ttlMs).toISOString();
  db.prepare(
    `INSERT INTO mail_idempotency (key, action, result, status, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET result = excluded.result, status = excluded.status, expires_at = excluded.expires_at`,
  ).run(key, action, JSON.stringify(body), status, now, expires);
}

export function purgeExpiredIdempotency(): void {
  db.prepare("DELETE FROM mail_idempotency WHERE expires_at < ?").run(nowIso());
}
