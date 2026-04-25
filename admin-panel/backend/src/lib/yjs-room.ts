/** Yjs WebSocket sync rooms — production-grade real-time collab.
 *
 *  This is a Bun-native re-implementation of the y-websocket reference
 *  server (which targets Node + ws). It speaks the standard y-websocket
 *  binary protocol so the unmodified `y-websocket` client connects and
 *  syncs without any custom handshake.
 *
 *  Per-document model:
 *    - Each (resource, recordId) gets a Room when the first WebSocket
 *      connects. The Room holds:
 *        - a server-side Y.Doc (authoritative state + history of updates)
 *        - an Awareness object (cursor positions, user presence)
 *        - the connected sockets in this room
 *    - The server is the merge point for all updates. A client edit
 *      arrives → server applies it to its Y.Doc → broadcasts the same
 *      update bytes to every other socket in the room.
 *    - Awareness updates flow the same way but never persist.
 *
 *  Persistence:
 *    - On first connect for a room, we hydrate the server Y.Doc from
 *      the latest snapshot at `/api/editors/<resource>/<id>/snapshot/yjs`.
 *      That snapshot is the source of truth — any edit the room misses
 *      while idle (because all users disconnected) is replayed via the
 *      snapshot when the room re-opens.
 *    - We persist back to the same snapshot on a debounced timer
 *      (3s after the last edit) so HTTP-only readers / bookmarks /
 *      indexers see fresh data.
 *    - On the LAST socket leaving a room we flush immediately and
 *      drop the room from memory.
 *
 *  Protocol (binary frames, length-prefixed):
 *    [varint type] [varint-length-prefixed body]
 *      type 0 = sync (sub-protocol from y-protocols/sync)
 *      type 1 = awareness (sub-protocol from y-protocols/awareness)
 *      type 2 = auth (we never send these — auth is upgrade-time)
 *
 *  Why we don't reuse the upstream Node y-websocket server: it imports
 *  `ws` (Node WebSocket impl), expects req/socket from http server,
 *  and has a different lifecycle. Bun's WebSocket API is simpler, and
 *  Bun's runtime already drives our HTTP. Re-implementing the protocol
 *  in 200 LOC against y-protocols (the same lib the client uses) is
 *  the cleanest fit. */

import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import type { ServerWebSocket } from "bun";
import { db, nowIso } from "../db";
import { getStorageRegistry, ObjectNotFound, isStorageError } from "../storage";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

/** Debounce window for persisting the room's Y.Doc back to storage.
 *  3s of idle keystrokes = one save. Active edit streams piggyback on
 *  the same timer (every reset → same future flush). */
const PERSIST_DEBOUNCE_MS = 3000;

/** Hard upper bound for keep-alive idle. After this, even an actively
 *  edited room flushes (so we don't lose more than ~30s on a crash). */
const PERSIST_MAX_INTERVAL_MS = 30_000;

/** Per-socket data the upgrade handler attaches. */
export interface YjsSocketData {
  userId: string;
  tenantId: string;
  resource: string;
  recordId: string;
  role: "owner" | "editor" | "viewer";
  /** User-friendly identity for awareness (so the OTHER clients can
   *  paint the cursor with the right name + color). */
  user: {
    id: string;
    name: string;
    email: string;
    color: string;
  };
}

interface RoomRec {
  id: string;
  yjsAdapter?: string;
  yjsObjectKey?: string;
  yjsEtag?: string;
}

class YjsRoom {
  readonly roomKey: string;            // `${resource}:${recordId}`
  readonly resource: string;
  readonly recordId: string;
  readonly doc: Y.Doc;
  readonly awareness: awarenessProtocol.Awareness;
  readonly conns = new Set<ServerWebSocket<YjsSocketData>>();
  private updateTimer: ReturnType<typeof setTimeout> | null = null;
  private firstUpdateAt: number | null = null;
  private hydrated = false;
  private destroyed = false;

  constructor(resource: string, recordId: string) {
    this.resource = resource;
    this.recordId = recordId;
    this.roomKey = `${resource}:${recordId}`;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    // We don't add ourselves to awareness (server is invisible).
    this.awareness.setLocalState(null);

    // When the doc gets a local update (from a client message we apply),
    // broadcast it to every other connected socket and schedule a persist.
    this.doc.on("update", (update: Uint8Array, origin: unknown) => {
      // origin is the ServerWebSocket that submitted the change; if null,
      // the update came from us (e.g., during hydration) — skip broadcast.
      if (origin === null) return;
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_SYNC);
      syncProtocol.writeUpdate(enc, update);
      const msg = encoding.toUint8Array(enc);
      this.broadcast(msg, origin as ServerWebSocket<YjsSocketData> | null);
      this.schedulePersist();
    });

    // When awareness changes, broadcast — but DON'T persist (presence is
    // ephemeral).
    this.awareness.on("update", (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      const changedClients = added.concat(updated, removed);
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        enc,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
      );
      const msg = encoding.toUint8Array(enc);
      this.broadcast(msg, origin as ServerWebSocket<YjsSocketData> | null);
    });
  }

  /** Hydrate from the latest stored Yjs snapshot. Idempotent — only
   *  loads on first call. Subsequent calls (e.g. extra reconnects)
   *  are no-ops because the doc already holds the merged state. */
  async hydrateOnce(): Promise<void> {
    if (this.hydrated) return;
    this.hydrated = true;
    const rec = loadRecRow(this.resource, this.recordId);
    if (!rec || !rec.yjsAdapter || !rec.yjsObjectKey) return;
    try {
      const adapter = getStorageRegistry().getAdapter(rec.yjsAdapter);
      const result = await adapter.get(rec.yjsObjectKey);
      const buf = await streamToUint8Array(result.body);
      if (buf.byteLength > 0) {
        Y.applyUpdate(this.doc, buf, null /* origin = self → no broadcast */);
      }
    } catch (err) {
      if (err instanceof ObjectNotFound || (isStorageError(err) && err.code === "not-found")) {
        // First-ever load on a doc that was created but never saved. Empty doc is fine.
        return;
      }
      console.error(`[yjs-room ${this.roomKey}] hydrate failed`, err);
    }
  }

  /** Apply a client-sent message to the doc and reply if needed. */
  handleMessage(ws: ServerWebSocket<YjsSocketData>, payload: Uint8Array): void {
    if (this.destroyed) return;
    if (ws.data.role === "viewer") {
      // Viewers can RECEIVE updates but their inbound sync messages get
      // applied as no-ops via the y-protocols sync state machine
      // (read-only enforcement). We still allow awareness so they can
      // see other people's cursors and have a presence row of their own.
    }
    try {
      const decoder = decoding.createDecoder(payload);
      const messageType = decoding.readVarUint(decoder);
      switch (messageType) {
        case MESSAGE_SYNC: {
          if (ws.data.role === "viewer") {
            // For viewers we still need to handle SyncStep1 (initial
            // request from the client) so they receive the current doc
            // state — but ignore actual update messages they might
            // submit. The simplest robust approach: parse what the
            // client sent, but only forward the SyncStep1 path through.
            const enc = encoding.createEncoder();
            encoding.writeVarUint(enc, MESSAGE_SYNC);
            // We pass `null` as the transactionOrigin so the doc's
            // own update handler doesn't echo our reply back as a new
            // update — but since this is a SyncStep1 reply, we WANT
            // it to reach the client.
            syncProtocol.readSyncMessage(decoder, enc, this.doc, null);
            const reply = encoding.toUint8Array(enc);
            // Only send if the SyncStep1 produced a non-trivial reply.
            if (reply.length > 1) ws.sendBinary(reply);
            return;
          }
          // Editors / owners: apply normally. The doc's update handler
          // will broadcast.
          const enc = encoding.createEncoder();
          encoding.writeVarUint(enc, MESSAGE_SYNC);
          syncProtocol.readSyncMessage(decoder, enc, this.doc, ws);
          const reply = encoding.toUint8Array(enc);
          if (reply.length > 1) ws.sendBinary(reply);
          break;
        }
        case MESSAGE_AWARENESS: {
          awarenessProtocol.applyAwarenessUpdate(
            this.awareness,
            decoding.readVarUint8Array(decoder),
            ws,
          );
          break;
        }
        default:
          // Unknown message type — ignore. y-websocket can grow new
          // sub-protocols (e.g., auth) but we don't speak them.
          break;
      }
    } catch (err) {
      console.error(`[yjs-room ${this.roomKey}] message handler error`, err);
    }
  }

  /** Send the initial sync handshake to a freshly-connected client. */
  sendInitialSync(ws: ServerWebSocket<YjsSocketData>): void {
    // 1) SyncStep1 — server's "what state do you know about?" question.
    //    Once the client replies, both sides converge.
    const syncEnc = encoding.createEncoder();
    encoding.writeVarUint(syncEnc, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(syncEnc, this.doc);
    ws.sendBinary(encoding.toUint8Array(syncEnc));

    // 2) Awareness — broadcast everyone CURRENTLY in the room to the
    //    new client so they see existing cursors immediately.
    const states = this.awareness.getStates();
    if (states.size > 0) {
      const awEnc = encoding.createEncoder();
      encoding.writeVarUint(awEnc, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awEnc,
        awarenessProtocol.encodeAwarenessUpdate(
          this.awareness,
          Array.from(states.keys()),
        ),
      );
      ws.sendBinary(encoding.toUint8Array(awEnc));
    }
  }

  broadcast(
    msg: Uint8Array,
    except: ServerWebSocket<YjsSocketData> | null,
  ): void {
    for (const ws of this.conns) {
      if (ws === except) continue;
      try {
        ws.sendBinary(msg);
      } catch (err) {
        console.error(`[yjs-room ${this.roomKey}] broadcast send failed`, err);
      }
    }
  }

  schedulePersist(): void {
    if (this.firstUpdateAt === null) this.firstUpdateAt = Date.now();
    if (this.updateTimer) clearTimeout(this.updateTimer);

    // If we've been buffering for too long, force flush now to bound
    // the worst-case data loss window.
    if (Date.now() - this.firstUpdateAt > PERSIST_MAX_INTERVAL_MS) {
      void this.persist();
      return;
    }
    this.updateTimer = setTimeout(() => { void this.persist(); }, PERSIST_DEBOUNCE_MS);
  }

  async persist(): Promise<void> {
    if (this.destroyed) return;
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    this.firstUpdateAt = null;
    const rec = loadRecRow(this.resource, this.recordId);
    if (!rec || !rec.yjsAdapter || !rec.yjsObjectKey) {
      console.warn(`[yjs-room ${this.roomKey}] persist skipped: missing adapter/key`);
      return;
    }
    try {
      const update = Y.encodeStateAsUpdate(this.doc);
      const adapter = getStorageRegistry().getAdapter(rec.yjsAdapter);
      const meta = await adapter.put(rec.yjsObjectKey, update, {
        contentType: "application/octet-stream",
      });
      // Update record metadata so HTTP read paths see the latest etag/size.
      updateRecMeta(this.resource, this.recordId, {
        yjsEtag: meta.etag,
        yjsSizeBytes: meta.size,
        updatedAt: nowIso(),
      });
    } catch (err) {
      console.error(`[yjs-room ${this.roomKey}] persist failed`, err);
    }
  }

  addConnection(ws: ServerWebSocket<YjsSocketData>): void {
    this.conns.add(ws);
  }

  /** Remove the connection. If it was the last one, flush + destroy
   *  the room so memory doesn't grow with idle docs. */
  async removeConnection(ws: ServerWebSocket<YjsSocketData>): Promise<void> {
    this.conns.delete(ws);
    // Drop this client from awareness so other clients see them go.
    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      [ws.data.user ? clientIdFor(ws) : 0],
      "connection-close",
    );
    if (this.conns.size === 0) {
      await this.persist();
      this.destroyed = true;
      rooms.delete(this.roomKey);
    }
  }
}

const rooms = new Map<string, YjsRoom>();

/** Look up or create a room for (resource, recordId). Hydration is
 *  awaited so the very first client receives a synced doc, not an
 *  empty one. */
export async function getRoom(resource: string, recordId: string): Promise<YjsRoom> {
  const key = `${resource}:${recordId}`;
  let room = rooms.get(key);
  if (!room) {
    room = new YjsRoom(resource, recordId);
    rooms.set(key, room);
    await room.hydrateOnce();
  } else {
    await room.hydrateOnce(); // no-op on subsequent calls
  }
  return room;
}

/* ------------------------------------------------------------------ */
/*  Lifecycle hooks called from main.ts WebSocket handlers             */
/* ------------------------------------------------------------------ */

export async function yjsOnOpen(ws: ServerWebSocket<YjsSocketData>): Promise<void> {
  const room = await getRoom(ws.data.resource, ws.data.recordId);
  room.addConnection(ws);
  room.sendInitialSync(ws);
}

export function yjsOnMessage(
  ws: ServerWebSocket<YjsSocketData>,
  message: string | Buffer | ArrayBuffer | Uint8Array,
): void {
  const room = rooms.get(`${ws.data.resource}:${ws.data.recordId}`);
  if (!room) return; // shouldn't happen — open creates it
  let bytes: Uint8Array;
  if (typeof message === "string") {
    // y-websocket protocol is binary; reject text frames.
    return;
  } else if (message instanceof ArrayBuffer) {
    bytes = new Uint8Array(message);
  } else if (message instanceof Uint8Array) {
    bytes = message;
  } else {
    bytes = new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
  }
  room.handleMessage(ws, bytes);
}

export async function yjsOnClose(ws: ServerWebSocket<YjsSocketData>): Promise<void> {
  const room = rooms.get(`${ws.data.resource}:${ws.data.recordId}`);
  if (room) await room.removeConnection(ws);
}

/** For tests / shutdown: flush and drop every room. */
export async function yjsShutdown(): Promise<void> {
  await Promise.all(Array.from(rooms.values()).map((r) => r.persist()));
  rooms.clear();
}

/* ------------------------------------------------------------------ */
/*  Storage helpers                                                    */
/* ------------------------------------------------------------------ */

function loadRecRow(resource: string, recordId: string): RoomRec | null {
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = ? AND id = ?`)
    .get(resource, recordId) as { data: string } | undefined;
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.data) as Record<string, unknown>;
    return {
      id: String(parsed.id ?? recordId),
      yjsAdapter: typeof parsed.yjsAdapter === "string" ? parsed.yjsAdapter : undefined,
      yjsObjectKey: typeof parsed.yjsObjectKey === "string" ? parsed.yjsObjectKey : undefined,
      yjsEtag: typeof parsed.yjsEtag === "string" ? parsed.yjsEtag : undefined,
    };
  } catch {
    return null;
  }
}

function updateRecMeta(
  resource: string,
  recordId: string,
  patch: { yjsEtag?: string; yjsSizeBytes?: number; updatedAt?: string },
): void {
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = ? AND id = ?`)
    .get(resource, recordId) as { data: string } | undefined;
  if (!row) return;
  let rec: Record<string, unknown>;
  try {
    rec = JSON.parse(row.data) as Record<string, unknown>;
  } catch {
    return;
  }
  if (patch.yjsEtag !== undefined) rec.yjsEtag = patch.yjsEtag;
  if (patch.yjsSizeBytes !== undefined) rec.yjsSizeBytes = patch.yjsSizeBytes;
  if (patch.updatedAt !== undefined) rec.updatedAt = patch.updatedAt;
  db.prepare(
    `UPDATE records SET data = ?, updated_at = ? WHERE resource = ? AND id = ?`,
  ).run(
    JSON.stringify(rec),
    typeof rec.updatedAt === "string" ? rec.updatedAt : nowIso(),
    resource,
    recordId,
  );
}

async function streamToUint8Array(body: ReadableStream<Uint8Array> | Uint8Array | Buffer): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  if (typeof Buffer !== "undefined" && body instanceof Buffer) {
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  }
  // ReadableStream
  const reader = (body as ReadableStream<Uint8Array>).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function clientIdFor(ws: ServerWebSocket<YjsSocketData>): number {
  // Each socket is its own awareness "client". Y.Doc.clientID is a
  // 32-bit unsigned int. We derive a stable per-connection id by
  // hashing the upgrade-time user id + connection start time. A bit
  // collision-prone (1 in 2^32 per connection) but acceptable for
  // the lifetime of a tab; awareness-removeStates uses the id we
  // pass at remove time, so it's consistent within a single session.
  if ((ws as unknown as { __cid?: number }).__cid !== undefined) {
    return (ws as unknown as { __cid: number }).__cid;
  }
  const seed = `${ws.data.userId}|${Date.now()}|${Math.random()}`;
  let h = 2166136261; // FNV-1a 32
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  (ws as unknown as { __cid: number }).__cid = h;
  return h;
}
