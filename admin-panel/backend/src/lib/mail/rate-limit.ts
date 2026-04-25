/** Token-bucket rate limiter.
 *
 *  Keyed by `bucket_key` in `mail_rate_state`. Refills at `refill_per_s`,
 *  capped at `max_tokens`. Each `take()` removes one token if available.
 *
 *  Used for:
 *   - Per-connection driver call rate (Gmail 250 rps/user, Graph 4 rps/user,
 *     IMAP per-connection 1 rps).
 *   - Send caps per user (default 100/day).
 *   - AI calls per user/tenant.
 *   - Image proxy fetches (per remote host, per user).
 *
 *  We persist state to SQL so caps survive restarts. The local in-memory
 *  cache fronts SQL to avoid a write per request — flushed on shutdown
 *  + every N seconds. */

import { db, nowIso } from "../../db";

export interface RateLimitPolicy {
  maxTokens: number;
  refillPerS: number;
  /** Max wait in ms before deciding the call is blocked. */
  maxWaitMs?: number;
}

interface BucketState {
  tokens: number;
  lastRefillAt: number;
  policy: RateLimitPolicy;
  dirty: boolean;
}

const cache = new Map<string, BucketState>();
const FLUSH_INTERVAL_MS = 5_000;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function ensureFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flushAll, FLUSH_INTERVAL_MS);
  // Bun-compatible best-effort no-throw if `unref` missing.
  (flushTimer as unknown as { unref?: () => void }).unref?.();
  process.on("exit", () => flushAll());
}

function load(key: string, policy: RateLimitPolicy): BucketState {
  const cached = cache.get(key);
  if (cached) {
    cached.policy = policy;
    return cached;
  }
  const row = db
    .prepare(
      `SELECT tokens, last_refill_at, max_tokens, refill_per_s
       FROM mail_rate_state WHERE bucket_key = ?`,
    )
    .get(key) as
    | { tokens: number; last_refill_at: string; max_tokens: number; refill_per_s: number }
    | undefined;
  let state: BucketState;
  if (!row) {
    state = {
      tokens: policy.maxTokens,
      lastRefillAt: Date.now(),
      policy,
      dirty: true,
    };
  } else {
    state = {
      tokens: Math.min(row.tokens, policy.maxTokens),
      lastRefillAt: new Date(row.last_refill_at).getTime() || Date.now(),
      policy,
      dirty: false,
    };
  }
  cache.set(key, state);
  ensureFlushTimer();
  return state;
}

function refill(state: BucketState, now: number): void {
  if (now <= state.lastRefillAt) return;
  const seconds = (now - state.lastRefillAt) / 1000;
  const added = seconds * state.policy.refillPerS;
  state.tokens = Math.min(state.tokens + added, state.policy.maxTokens);
  state.lastRefillAt = now;
  state.dirty = true;
}

export interface RateDecision {
  allowed: boolean;
  /** ms until you can retry. */
  retryAfterMs: number;
  remainingTokens: number;
}

/** Try to consume one token. Returns immediate decision; caller chooses to
 *  wait, drop, or 429. */
export function takeToken(key: string, policy: RateLimitPolicy): RateDecision {
  const state = load(key, policy);
  const now = Date.now();
  refill(state, now);
  if (state.tokens >= 1) {
    state.tokens -= 1;
    state.dirty = true;
    return { allowed: true, retryAfterMs: 0, remainingTokens: state.tokens };
  }
  const deficit = 1 - state.tokens;
  const wait = Math.ceil((deficit / state.policy.refillPerS) * 1000);
  return { allowed: false, retryAfterMs: wait, remainingTokens: state.tokens };
}

/** Wait-and-take. Returns whether we got a token within `maxWait`. */
export async function awaitToken(
  key: string,
  policy: RateLimitPolicy,
  maxWaitMs = policy.maxWaitMs ?? 30_000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const dec = takeToken(key, policy);
    if (dec.allowed) return true;
    const wait = Math.min(dec.retryAfterMs, maxWaitMs - (Date.now() - start));
    if (wait <= 0) return false;
    await new Promise((r) => setTimeout(r, wait));
  }
  return false;
}

export function flushAll(): void {
  const stmt = db.prepare(
    `INSERT INTO mail_rate_state (bucket_key, tokens, last_refill_at, max_tokens, refill_per_s)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(bucket_key) DO UPDATE SET
       tokens = excluded.tokens,
       last_refill_at = excluded.last_refill_at,
       max_tokens = excluded.max_tokens,
       refill_per_s = excluded.refill_per_s`,
  );
  const tx = db.transaction((entries: [string, BucketState][]) => {
    for (const [key, s] of entries) {
      if (!s.dirty) continue;
      stmt.run(key, s.tokens, new Date(s.lastRefillAt).toISOString(), s.policy.maxTokens, s.policy.refillPerS);
      s.dirty = false;
    }
  });
  tx(Array.from(cache.entries()));
  void nowIso;
}

/** Curated default policies. Override in code or via env at boot. */
export const POLICIES: Record<string, RateLimitPolicy> = {
  driverGoogle: { maxTokens: 100, refillPerS: 50, maxWaitMs: 5000 },
  driverMicrosoft: { maxTokens: 30, refillPerS: 4, maxWaitMs: 5000 },
  driverImap: { maxTokens: 5, refillPerS: 1, maxWaitMs: 10_000 },
  imageProxy: { maxTokens: 30, refillPerS: 5, maxWaitMs: 0 },
  sendUserDay: { maxTokens: 100, refillPerS: 100 / 86_400 },
  aiUserDay: { maxTokens: 200, refillPerS: 200 / 86_400 },
  aiTenantDay: { maxTokens: 5000, refillPerS: 5000 / 86_400 },
  webhook: { maxTokens: 200, refillPerS: 50, maxWaitMs: 0 },
};
