/** Helpers for normalizing `BodyInput` into a Web `ReadableStream` and for
 *  collecting streams into `Uint8Array`. Adapters that prefer Node
 *  `Readable` can wrap via `Readable.fromWeb(webStream)`. */

import type { BodyInput } from "./types";

export function toReadableStream(body: BodyInput): ReadableStream<Uint8Array> {
  if (body instanceof ReadableStream) return body;
  if (body instanceof Uint8Array) return fromChunk(body);
  if (body instanceof ArrayBuffer) return fromChunk(new Uint8Array(body));
  if (typeof Blob !== "undefined" && body instanceof Blob) return body.stream();

  // Async iterable (covers Node Readable via Symbol.asyncIterator).
  if (typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === "function") {
    return fromAsyncIterable(body as AsyncIterable<Uint8Array>);
  }
  // Sync iterable.
  if (typeof (body as Iterable<Uint8Array>)[Symbol.iterator] === "function") {
    return fromIterable(body as Iterable<Uint8Array>);
  }
  throw new TypeError("unsupported BodyInput");
}

function fromChunk(chunk: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(chunk);
      controller.close();
    },
  });
}

function fromAsyncIterable(it: AsyncIterable<Uint8Array>): ReadableStream<Uint8Array> {
  const iter = it[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await iter.next();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    async cancel(reason) {
      if (typeof iter.return === "function") await iter.return(reason);
    },
  });
}

function fromIterable(it: Iterable<Uint8Array>): ReadableStream<Uint8Array> {
  const iter = it[Symbol.iterator]();
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const { value, done } = iter.next();
      if (done) controller.close();
      else controller.enqueue(value);
    },
  });
}

/** Accumulate a stream into a single buffer. Intended for small objects
 *  (under the adapter's single-PUT limit) — use the streaming path for
 *  anything larger. */
export async function collectStream(
  stream: ReadableStream<Uint8Array>,
  limit = 64 * 1024 * 1024,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        throw new Error(`stream exceeded limit of ${limit} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/** SHA-256 as a lowercase hex string. Uses Web Crypto which is present
 *  in Node 20+, Bun, and all browsers. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // Slice into a clean ArrayBuffer to satisfy strictest BufferSource typing
  // across Node/Bun/DOM type overlays where `Uint8Array<ArrayBufferLike>`
  // and `BufferSource` are treated as distinct.
  const buf = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const hex: string[] = [];
  const view = new Uint8Array(digest);
  for (let i = 0; i < view.length; i++) {
    const byte = view[i];
    if (byte !== undefined) hex.push(byte.toString(16).padStart(2, "0"));
  }
  return hex.join("");
}
