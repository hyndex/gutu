/** Conversation threading.
 *
 *  Implements a simplified JWZ-style algorithm:
 *
 *    1. Build a forest from each message's References + In-Reply-To.
 *    2. Group orphans by normalized subject within a 7-day window.
 *    3. Stable thread ids derived from the root Message-ID.
 *
 *  We don't need a full JWZ implementation because providers (Gmail, Graph)
 *  give us thread ids directly — this is the fallback used by IMAP and
 *  for cross-account merge views. */

import { normalizeSubject } from "./address";

export interface ThreadingInput {
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  subject?: string;
  receivedAt: string;
}

export interface ThreadingResult {
  threadKey: string;
  rootMessageId: string;
}

/** Compute a stable thread key for a message given the existing index of
 *  messages we've seen so far. The store passes a lookup function to keep
 *  this pure & testable. */
export function computeThreadKey(
  msg: ThreadingInput,
  lookupByMessageId: (id: string) => string | null,
): ThreadingResult {
  // Direct parent lookups (in-reply-to first, then most recent reference).
  const candidates = [
    msg.inReplyTo,
    ...(msg.references ?? []).slice().reverse(),
  ].filter(Boolean) as string[];

  for (const ref of candidates) {
    const tk = lookupByMessageId(ref);
    if (tk) return { threadKey: tk, rootMessageId: ref };
  }

  // Subject + window fallback. Caller is responsible for storing
  // (subject_norm, week) → thread_key elsewhere if they want exact JWZ
  // grouping; we return a derived key.
  const subj = normalizeSubject(msg.subject);
  const week = bucketWeek(msg.receivedAt);
  if (subj) {
    return {
      threadKey: `subj:${week}:${cheapHash(subj)}`,
      rootMessageId: msg.messageId ?? `${week}:${cheapHash(subj)}`,
    };
  }
  // Last resort: standalone thread for this message.
  return {
    threadKey: `msg:${msg.messageId ?? cheapHash(`${week}:${msg.receivedAt}`)}`,
    rootMessageId: msg.messageId ?? cheapHash(`${week}:${msg.receivedAt}`),
  };
}

function bucketWeek(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "epoch";
  // ISO week: y-w
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dayNum + 3);
  const firstThursday = t.getTime();
  t.setUTCMonth(0, 1);
  if (t.getUTCDay() !== 4) t.setUTCMonth(0, 1 + ((4 - t.getUTCDay()) + 7) % 7);
  const week = 1 + Math.round((firstThursday - t.getTime()) / (7 * 24 * 3600 * 1000));
  return `${d.getUTCFullYear()}w${String(week).padStart(2, "0")}`;
}

function cheapHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}
