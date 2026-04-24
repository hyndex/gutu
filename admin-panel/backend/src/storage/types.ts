/** Shared data types for the storage contract. Nothing in here is
 *  adapter-specific; every adapter must speak in these terms so consumers
 *  can swap local for S3 for R2 without touching their code. */

/** A `ReadableStream<Uint8Array>` (Web Streams) or a Node `Readable`. Adapters
 *  accept either and normalize internally. */
export type BodyInput =
  | Uint8Array
  | ArrayBuffer
  | Blob
  | ReadableStream<Uint8Array>
  | AsyncIterable<Uint8Array>
  | Iterable<Uint8Array>;

/** Access level semantics. Adapters translate to their native model
 *  (S3 ACL, local FS permissions, signed URL policy). */
export type Visibility = "private" | "tenant-shared" | "public";

/** Server-side encryption options.
 *  - `none`: no SSE
 *  - `sse-s3`: S3-managed keys (AES-256)
 *  - `sse-kms`: KMS-managed keys (must supply `kmsKeyId`)
 *  - `sse-c`: customer-provided key (supply `customerKey` base64)
 *
 *  Non-S3 adapters silently ignore these hints unless they implement an
 *  equivalent; they SHOULD surface `unsupported` if the request would be
 *  a no-op that weakens the caller's security posture. */
export type EncryptionOption =
  | { kind: "none" }
  | { kind: "sse-s3" }
  | { kind: "sse-kms"; kmsKeyId: string }
  | { kind: "sse-c"; algorithm: "AES256"; keyBase64: string; keyMd5Base64: string };

export type StorageClass =
  | "standard"
  | "infrequent-access"
  | "archive"
  | "deep-archive"
  | "intelligent-tiering";

/** Canonical metadata returned by `head()`, `put()`, `list()`. */
export interface ObjectMetadata {
  key: string;
  size: number;
  contentType: string;
  /** Opaque server-side ETag. SHOULD be an MD5 for single-part S3 / local,
   *  a multipart composite for multipart S3. Consumers MUST NOT rely on its
   *  format beyond using it as an opaque token for conditional writes. */
  etag: string;
  /** UTC ISO timestamp, server-authoritative. */
  lastModified: string;
  /** Optional hex SHA-256 if the adapter computed it. Local adapter always
   *  computes; S3 adapter only if `x-amz-checksum-sha256` is set. */
  sha256?: string;
  /** Adapter-native content disposition. Absent on local unless user set it. */
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  storageClass?: StorageClass;
  /** Caller-controlled custom metadata. Keys MUST be lowercase ASCII; values
   *  UTF-8. Adapters prefix natively (`x-amz-meta-*` on S3, sidecar file on
   *  local). */
  custom?: Record<string, string>;
}

export interface PutOptions {
  contentType?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  visibility?: Visibility;
  /** Expected size in bytes. Adapters use this for multipart thresholds
   *  and early rejection of oversize payloads. */
  contentLength?: number;
  /** Hex SHA-256 to verify server-side. If the adapter can't verify natively,
   *  it hashes the stream locally. */
  sha256?: string;
  encryption?: EncryptionOption;
  storageClass?: StorageClass;
  custom?: Record<string, string>;
  /** Conditional writes. `ifNoneMatch: "*"` = create-only, refuse overwrite. */
  ifMatch?: string;
  ifNoneMatch?: string;
  /** Abort after N ms for the entire upload. */
  timeoutMs?: number;
}

export interface GetOptions {
  /** Inclusive byte range. Undefined for whole object. */
  range?: { start: number; end?: number };
  ifMatch?: string;
  ifNoneMatch?: string;
  ifModifiedSince?: string;
  timeoutMs?: number;
}

export interface GetResult {
  body: ReadableStream<Uint8Array>;
  metadata: ObjectMetadata;
}

export interface ListOptions {
  prefix?: string;
  /** Max keys to return. Adapters clamp to their server-side limit (1000 for S3). */
  limit?: number;
  /** Continuation token from a previous `list()` call. */
  cursor?: string;
  /** If set, collapse keys sharing the given delimiter into `commonPrefixes`. */
  delimiter?: string;
}

export interface ListResult {
  objects: ObjectMetadata[];
  commonPrefixes: string[];
  nextCursor?: string;
}

export interface CopyOptions {
  /** If cross-adapter copy needs to go via memory/disk, the implementer
   *  decides. Single-adapter copies SHOULD be server-side. */
  destContentType?: string;
  destVisibility?: Visibility;
  encryption?: EncryptionOption;
  ifMatch?: string;
}

/** HTTP operation a presigned URL authorizes. */
export type PresignOperation = "get" | "put" | "delete";

export interface PresignOptions {
  operation: PresignOperation;
  /** TTL in seconds. Adapters SHOULD clamp to their server limit (7 days for S3). */
  expiresInSec: number;
  /** When the pre-signed URL is used to upload, enforce these on the server
   *  side. Ignored for `get`. */
  contentType?: string;
  contentLengthRange?: { min: number; max: number };
  visibility?: Visibility;
  /** Custom response headers applied when the URL is fetched. */
  responseContentDisposition?: string;
  responseContentType?: string;
}

export interface PresignedUrl {
  /** The URL to send the HTTP request to. */
  url: string;
  /** HTTP method the caller must use. */
  method: "GET" | "PUT" | "DELETE";
  /** Headers that MUST be present on the caller's request for the signature
   *  to validate. */
  requiredHeaders: Record<string, string>;
  /** UTC ISO timestamp at which the signature expires. */
  expiresAt: string;
}

/** Multipart upload handle. Returned from `multipartCreate()`, passed to
 *  `multipartPart()` / `multipartComplete()` / `multipartAbort()`. */
export interface MultipartHandle {
  key: string;
  uploadId: string;
  adapter: string;
  /** Adapter-specific creation timestamp. */
  createdAt: string;
}

export interface MultipartPart {
  partNumber: number;
  etag: string;
  size: number;
}

export interface MultipartCompleteInput {
  handle: MultipartHandle;
  parts: MultipartPart[];
}

/** Reports on an adapter's capabilities so callers can decide whether to
 *  offer multipart / presigned flows in the UI. */
export interface AdapterCapabilities {
  presignGet: boolean;
  presignPut: boolean;
  multipart: boolean;
  copy: boolean;
  serverSideEncryption: boolean;
  conditionalWrites: boolean;
  streamingReads: boolean;
  streamingWrites: boolean;
  /** Max single-PUT size in bytes. Anything above MUST use multipart. */
  singlePutLimitBytes: number;
}
