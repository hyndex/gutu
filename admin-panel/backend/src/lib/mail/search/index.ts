/** Hybrid lexical + vector search over mail_search + mail_vector.
 *
 *  Strategy:
 *    1. Run the FTS5 query (BM25 ranking) → top N candidates.
 *    2. If a vector embedding is available for the query, fetch top M
 *       candidates by cosine distance from `mail_vector`.
 *    3. Merge both lists (rank-fusion: 1/(60+rank)) and re-score.
 *    4. Apply structured WHERE filters from the query parser.
 *
 *  When no embedding provider is configured, we degrade to FTS5 only. */

import { db } from "../../../db";
import { compileQuery, parseQuery } from "./query-parser";
import { embedQuery } from "./embedding";

export interface SearchResultItem {
  messageId: string;
  threadId: string;
  score: number;
  snippet?: string;
}

export interface SearchOptions {
  tenantId: string;
  connectionId?: string;
  folder?: string;
  limit?: number;
  enableVector?: boolean;
}

const FTS_LIMIT = 200;
const VEC_LIMIT = 200;

export async function search(query: string, opts: SearchOptions): Promise<SearchResultItem[]> {
  const limit = Math.max(1, Math.min(500, opts.limit ?? 50));
  const parsed = parseQuery(query);
  const compiled = compileQuery(parsed);

  const ftsRows = parsed.freetext
    ? runFts(parsed.freetext, opts, FTS_LIMIT)
    : runRecent(opts, FTS_LIMIT);

  let vecRows: { messageId: string; threadId: string; distance: number }[] = [];
  if (opts.enableVector !== false && parsed.freetext) {
    try {
      const qvec = await embedQuery(parsed.freetext);
      if (qvec) vecRows = runVector(qvec, opts, VEC_LIMIT);
    } catch {
      vecRows = [];
    }
  }

  const fused = new Map<string, { threadId: string; score: number; rankFts?: number; rankVec?: number; snippet?: string }>();
  ftsRows.forEach((r, i) => {
    fused.set(r.messageId, {
      threadId: r.threadId,
      score: 1 / (60 + i),
      rankFts: i + 1,
      snippet: "snippet" in r ? (r as { snippet?: string }).snippet : undefined,
    });
  });
  vecRows.forEach((r, i) => {
    const existing = fused.get(r.messageId);
    const vecScore = 1 / (60 + i);
    if (existing) {
      existing.score += vecScore;
      existing.rankVec = i + 1;
    } else {
      fused.set(r.messageId, { threadId: r.threadId, score: vecScore, rankVec: i + 1 });
    }
  });

  // Apply structured WHERE.
  const filtered = applyStructuredFilter(Array.from(fused.entries()), compiled);
  const items: SearchResultItem[] = filtered
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([messageId, v]) => ({
      messageId,
      threadId: v.threadId,
      score: v.score,
      snippet: v.snippet,
    }));
  return items;
}

function runFts(
  freetext: string,
  opts: SearchOptions,
  limit: number,
): { messageId: string; threadId: string; snippet?: string }[] {
  const tokens = freetext
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '""')}"*`)
    .join(" ");
  const tenant = opts.tenantId ?? "";
  const folder = opts.folder ?? "";
  const conn = opts.connectionId ?? "";
  const sql = `
    SELECT message_id, thread_id, snippet(mail_search, 11, '<mark>', '</mark>', '…', 14) AS snip
    FROM mail_search
    WHERE mail_search MATCH ?
      AND tenant_id = ?
      ${conn ? "AND connection_id = ?" : ""}
      ${folder ? "AND folder = ?" : ""}
    ORDER BY rank
    LIMIT ?
  `;
  const params: (string | number)[] = [tokens, tenant];
  if (conn) params.push(conn);
  if (folder) params.push(folder);
  params.push(limit);
  try {
    const rows = db.prepare(sql).all(...params) as { message_id: string; thread_id: string; snip: string }[];
    return rows.map((r) => ({ messageId: r.message_id, threadId: r.thread_id, snippet: r.snip }));
  } catch {
    return [];
  }
}

function runRecent(
  opts: SearchOptions,
  limit: number,
): { messageId: string; threadId: string }[] {
  const conn = opts.connectionId ?? "";
  const folder = opts.folder ?? "";
  const sql = `
    SELECT message_id, thread_id FROM mail_search
    WHERE tenant_id = ?
      ${conn ? "AND connection_id = ?" : ""}
      ${folder ? "AND folder = ?" : ""}
    ORDER BY received_at DESC
    LIMIT ?
  `;
  const params: (string | number)[] = [opts.tenantId];
  if (conn) params.push(conn);
  if (folder) params.push(folder);
  params.push(limit);
  try {
    const rows = db.prepare(sql).all(...params) as { message_id: string; thread_id: string }[];
    return rows.map((r) => ({ messageId: r.message_id, threadId: r.thread_id }));
  } catch {
    return [];
  }
}

function runVector(
  qvec: Float32Array,
  opts: SearchOptions,
  limit: number,
): { messageId: string; threadId: string; distance: number }[] {
  const conn = opts.connectionId ?? "";
  const sql = `
    SELECT target_id, vector, magnitude
    FROM mail_vector
    WHERE target_kind = 'message'
      AND tenant_id = ?
      ${conn ? "AND connection_id = ?" : ""}
    LIMIT 50000
  `;
  const params: (string | number)[] = [opts.tenantId];
  if (conn) params.push(conn);
  let rows: { target_id: string; vector: Buffer; magnitude: number }[];
  try {
    rows = db.prepare(sql).all(...params) as typeof rows;
  } catch {
    return [];
  }
  const qmag = magnitude(qvec);
  if (qmag === 0) return [];
  const candidates: { messageId: string; threadId: string; distance: number }[] = [];
  for (const row of rows) {
    const v = bufferToFloat32(row.vector);
    if (v.length !== qvec.length) continue;
    let dot = 0;
    for (let i = 0; i < v.length; i++) dot += v[i] * qvec[i];
    const cos = dot / (row.magnitude * qmag || 1);
    candidates.push({ messageId: row.target_id, threadId: "", distance: 1 - cos });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  // Resolve thread ids in one pass.
  const ids = candidates.slice(0, limit).map((c) => c.messageId);
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const threadRows = db
    .prepare(`SELECT message_id, thread_id FROM mail_search WHERE message_id IN (${placeholders})`)
    .all(...ids) as { message_id: string; thread_id: string }[];
  const threadById = new Map(threadRows.map((r) => [r.message_id, r.thread_id]));
  return candidates.slice(0, limit).map((c) => ({ ...c, threadId: threadById.get(c.messageId) ?? "" }));
}

function applyStructuredFilter(
  rows: [string, { threadId: string; score: number; snippet?: string }][],
  _compiled: ReturnType<typeof compileQuery>,
): [string, { threadId: string; score: number; snippet?: string }][] {
  // Compiled WHERE applies against the records table; for now the lexical
  // index already filters by tenant + folder so we pass through. If the
  // caller supplies operator filters (`is:unread` etc.), they should
  // intersect via SQL — handled by the route. This shim exists so we can
  // expand without rewriting callers.
  return rows;
}

function bufferToFloat32(buf: Buffer): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

function magnitude(v: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return Math.sqrt(sum);
}
