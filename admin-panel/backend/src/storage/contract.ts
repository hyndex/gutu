/** The canonical `StorageAdapter` interface.
 *
 *  Every storage backend — local filesystem, AWS S3, Cloudflare R2, MinIO,
 *  Wasabi, Backblaze B2, DigitalOcean Spaces, any S3-compatible custom
 *  endpoint, or a bespoke implementation — implements exactly this shape.
 *  Consumers program against the interface, never against the adapter.
 *
 *  Contract rules every implementation MUST follow:
 *
 *  1. Keys are opaque strings. Adapters MUST reject `..` segments, NULs,
 *     CR/LF, and anything the adapter's backend can't round-trip. They
 *     SHOULD normalize leading/trailing slashes.
 *  2. `put()` returns full metadata after the object is durable. It MUST
 *     NOT return before the bytes are committed.
 *  3. `get()` streams. Adapters MUST NOT buffer the whole body in memory
 *     for objects above their `singlePutLimitBytes`.
 *  4. All methods MUST throw subclasses of `StorageError` on failure —
 *     never a bare `Error`, never a string, never a network-layer
 *     exception. The adapter is responsible for translation.
 *  5. Timeouts passed in options MUST be honored end-to-end, including
 *     socket-level timeouts.
 *  6. Cancellation via `AbortSignal` MUST propagate into the underlying
 *     HTTP / FS operation — not merely short-circuit the promise.
 */

import type {
  AdapterCapabilities,
  BodyInput,
  CopyOptions,
  GetOptions,
  GetResult,
  ListOptions,
  ListResult,
  MultipartCompleteInput,
  MultipartHandle,
  ObjectMetadata,
  PresignOptions,
  PresignedUrl,
  PutOptions,
} from "./types";

export interface StorageAdapter {
  /** Stable adapter identifier. Used by the registry and recorded in each
   *  file record so we can route reads to the adapter that wrote them. */
  readonly id: string;

  /** Human-readable name for UI. */
  readonly label: string;

  /** Declared capabilities. Callers check before offering presign/multipart. */
  readonly capabilities: AdapterCapabilities;

  /** Upload bytes at `key`. Returns final server-side metadata. */
  put(
    key: string,
    body: BodyInput,
    opts?: PutOptions,
    signal?: AbortSignal,
  ): Promise<ObjectMetadata>;

  /** Stream `key` back. Throws `ObjectNotFound` if missing. */
  get(
    key: string,
    opts?: GetOptions,
    signal?: AbortSignal,
  ): Promise<GetResult>;

  /** Metadata-only read. Same error surface as `get()` minus body. */
  head(
    key: string,
    signal?: AbortSignal,
  ): Promise<ObjectMetadata>;

  /** Delete. Idempotent — no-op on missing key, no error. */
  delete(
    key: string,
    signal?: AbortSignal,
  ): Promise<void>;

  /** List with prefix + cursor pagination. */
  list(
    opts?: ListOptions,
    signal?: AbortSignal,
  ): Promise<ListResult>;

  /** Server-side copy when supported; otherwise stream+put. */
  copy(
    sourceKey: string,
    destKey: string,
    opts?: CopyOptions,
    signal?: AbortSignal,
  ): Promise<ObjectMetadata>;

  /** Return `true` if the key exists, `false` otherwise. Does not throw on
   *  missing — only on access errors. */
  exists(
    key: string,
    signal?: AbortSignal,
  ): Promise<boolean>;

  /** Issue a presigned URL. Adapters that don't support presigning (e.g.
   *  a stub) MUST throw `Unsupported`. */
  presign(
    key: string,
    opts: PresignOptions,
    signal?: AbortSignal,
  ): Promise<PresignedUrl>;

  /** Begin a multipart upload. */
  multipartCreate(
    key: string,
    opts?: PutOptions,
    signal?: AbortSignal,
  ): Promise<MultipartHandle>;

  /** Upload one part. Returns the ETag for that part. */
  multipartPart(
    handle: MultipartHandle,
    partNumber: number,
    body: BodyInput,
    signal?: AbortSignal,
  ): Promise<{ etag: string; size: number }>;

  /** Finalize a multipart upload. */
  multipartComplete(
    input: MultipartCompleteInput,
    signal?: AbortSignal,
  ): Promise<ObjectMetadata>;

  /** Discard a multipart upload. Adapters MUST ensure allocated storage
   *  is released. */
  multipartAbort(
    handle: MultipartHandle,
    signal?: AbortSignal,
  ): Promise<void>;

  /** Round-trip test: write, read back, delete. Used by the admin
   *  "test connection" UI. */
  healthcheck(signal?: AbortSignal): Promise<{
    ok: boolean;
    latencyMs: number;
    detail?: string;
  }>;

  /** Release any resources (TCP pools, file handles, SDK clients). */
  close?(): Promise<void>;
}

/** Some adapters accept a tenant-scoped factory pattern where the same
 *  configuration can serve many tenants with per-tenant prefixing. Used
 *  by the core plugin to avoid one SDK client per tenant. */
export interface StorageAdapterFactory {
  readonly kind: string;
  create(config: unknown, tenantId: string): StorageAdapter;
  /** Zod schema or equivalent validator. Returns null if config is valid
   *  or an error message if not. */
  validateConfig(config: unknown): string | null;
}
