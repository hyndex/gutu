/** S3-compatible storage adapter.
 *
 *  Backs every S3-API-shaped store: AWS S3, Cloudflare R2, MinIO, Wasabi,
 *  Backblaze B2 (S3 API), DigitalOcean Spaces, Scaleway Object Storage,
 *  Oracle Cloud Object Storage, IBM Cloud Object Storage, Linode Object
 *  Storage, Vultr Object Storage, and any self-hosted or bespoke endpoint
 *  that speaks the S3 API.
 *
 *  The adapter is deliberately SDK-thin: we rely on `@aws-sdk/client-s3` +
 *  `@aws-sdk/s3-request-presigner` for all signing, TLS, retry policy, and
 *  wire-format concerns. Our job is to translate our stable contract into
 *  S3 commands, normalize metadata, classify errors, and refuse anything
 *  the contract forbids.
 *
 *  Provider-specific quirks (MinIO wants path-style; R2 uses SHA-256 not
 *  MD5 ETags; Wasabi has stricter key limits) are captured in
 *  `providers/*` presets. Users can opt into a preset or build a raw
 *  config by hand — nothing is magic.
 */

import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
  type S3ClientConfig,
  type ServerSideEncryption,
  type StorageClass as S3StorageClass,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import {
  type AdapterCapabilities,
  type BodyInput,
  type CopyOptions,
  type EncryptionOption,
  type GetOptions,
  type GetResult,
  type ListOptions,
  type ListResult,
  type MultipartCompleteInput,
  type MultipartHandle,
  type ObjectMetadata,
  type PresignOptions,
  type PresignedUrl,
  type PutOptions,
  type StorageAdapter,
  type StorageClass,
  AccessDenied,
  ObjectNotFound,
  StorageError,
  Unsupported,
  joinTenantKey,
  toReadableStream,
  validateObjectKey,
} from "../index";

export type S3Provider =
  | "aws"
  | "cloudflare-r2"
  | "minio"
  | "wasabi"
  | "backblaze-b2"
  | "digitalocean-spaces"
  | "scaleway"
  | "linode"
  | "vultr"
  | "oracle-cloud"
  | "ibm-cloud"
  | "custom";

export interface S3AdapterConfig {
  /** Convenience preset. `custom` leaves everything to the manual fields. */
  provider?: S3Provider;
  /** Bucket name. Always required. */
  bucket: string;
  /** AWS region, or "auto" for R2, or "us-east-1" sentinel for MinIO. */
  region: string;
  /** Custom endpoint URL — required for every non-AWS provider and for
   *  any local/self-hosted S3 (MinIO, garage, SeaweedFS, etc.). */
  endpoint?: string;
  /** Path-style addressing (required by MinIO, default some other providers). */
  forcePathStyle?: boolean;
  /** Credentials — static or from env. Omitting falls back to the default
   *  AWS SDK credential chain (env vars, instance profile, SSO, etc.). */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  /** Per-tenant prefix. Optional but recommended. */
  tenantPrefixTemplate?: string;
  /** Max single-PUT size. Above this, writes auto-upgrade to multipart. */
  singlePutLimitBytes?: number;
  /** Multipart part size in bytes. S3 minimum is 5 MiB (except last part). */
  multipartPartBytes?: number;
  /** Default server-side encryption for new writes if caller didn't specify. */
  defaultEncryption?: EncryptionOption;
  /** Request signing region override. Most providers ignore; R2 requires `auto`. */
  signingRegion?: string;
}

const DEFAULT_SINGLE_PUT = 100 * 1024 * 1024;
const DEFAULT_PART_BYTES = 16 * 1024 * 1024;

export class S3StorageAdapter implements StorageAdapter {
  readonly id = "s3";
  readonly label: string;
  readonly capabilities: AdapterCapabilities;

  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly tenantPrefix: string;
  private readonly cfg: Required<
    Pick<S3AdapterConfig, "singlePutLimitBytes" | "multipartPartBytes">
  > & Pick<S3AdapterConfig, "defaultEncryption">;

  constructor(config: S3AdapterConfig, tenantId: string) {
    this.bucket = config.bucket;
    const clientCfg: S3ClientConfig = {
      region: config.region,
      ...(config.endpoint !== undefined && { endpoint: config.endpoint }),
      ...(config.forcePathStyle !== undefined && {
        forcePathStyle: config.forcePathStyle,
      }),
      ...(config.credentials !== undefined && {
        credentials: config.credentials,
      }),
    };
    this.client = new S3Client(clientCfg);
    this.tenantPrefix = renderPrefix(
      config.tenantPrefixTemplate ?? "tenants/{tenantId}",
      tenantId,
    );
    this.cfg = {
      singlePutLimitBytes: config.singlePutLimitBytes ?? DEFAULT_SINGLE_PUT,
      multipartPartBytes: Math.max(
        config.multipartPartBytes ?? DEFAULT_PART_BYTES,
        5 * 1024 * 1024,
      ),
      ...(config.defaultEncryption !== undefined && {
        defaultEncryption: config.defaultEncryption,
      }),
    };
    const label = config.provider ?? "s3";
    this.label = config.endpoint
      ? `S3 (${label}) @ ${config.endpoint}/${config.bucket}`
      : `S3 (${label}) @ ${config.region}/${config.bucket}`;
    this.capabilities = {
      presignGet: true,
      presignPut: true,
      multipart: true,
      copy: true,
      serverSideEncryption: true,
      conditionalWrites: true,
      streamingReads: true,
      streamingWrites: true,
      singlePutLimitBytes: this.cfg.singlePutLimitBytes,
    };
  }

  private keyFor(key: string): string {
    const full = joinTenantKey(this.tenantPrefix, key);
    validateObjectKey("s3", full);
    return full;
  }

  async put(
    key: string,
    body: BodyInput,
    opts: PutOptions = {},
    signal?: AbortSignal,
  ): Promise<ObjectMetadata> {
    signal?.throwIfAborted();
    const Key = this.keyFor(key);

    // Fast path: small single-PUT. Above the limit, we switch to the
    // multipart manager.
    const stream = toReadableStream(body);
    const limit = this.cfg.singlePutLimitBytes;
    const buffered = await bufferUpTo(stream, limit);

    if (!buffered.exceeded) {
      return await this.#singlePut(Key, key, buffered.bytes, opts, signal);
    }

    // Fall back to explicit multipart so we never buffer huge bodies.
    const handle = await this.multipartCreate(key, opts, signal);
    let part = 1;
    const parts: { partNumber: number; etag: string; size: number }[] = [];
    try {
      // Drain whatever we already read + the rest of the stream in
      // part-sized chunks. The buffered bytes constitute the start of part 1.
      let carry = buffered.bytes;
      const reader = buffered.remainder.getReader();
      const partSize = this.cfg.multipartPartBytes;
      for (;;) {
        while (carry.byteLength < partSize) {
          const { value, done } = await reader.read();
          if (done) break;
          carry = concat(carry, value);
        }
        if (carry.byteLength === 0) break;
        const chunk = carry.slice(0, Math.min(partSize, carry.byteLength));
        carry = carry.slice(chunk.byteLength);
        const res = await this.multipartPart(handle, part, chunk, signal);
        parts.push({ partNumber: part, etag: res.etag, size: res.size });
        part++;
        if (chunk.byteLength < partSize) break;
      }
      return await this.multipartComplete({ handle, parts }, signal);
    } catch (err) {
      await this.multipartAbort(handle).catch(() => { /* noop */ });
      throw err;
    }
  }

  async #singlePut(
    Key: string,
    origKey: string,
    bytes: Uint8Array,
    opts: PutOptions,
    signal?: AbortSignal,
  ): Promise<ObjectMetadata> {
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (opts.sha256 && opts.sha256.toLowerCase() !== sha256) {
      throw new StorageError({
        code: "checksum-mismatch",
        message: `checksum mismatch: expected sha256 ${opts.sha256}, got ${sha256}`,
        adapter: "s3",
      });
    }
    const enc = opts.encryption ?? this.cfg.defaultEncryption;
    try {
      const cmd = new PutObjectCommand({
        Bucket: this.bucket,
        Key,
        Body: bytes,
        ContentType: opts.contentType ?? "application/octet-stream",
        ...(opts.contentDisposition !== undefined && { ContentDisposition: opts.contentDisposition }),
        ...(opts.contentEncoding !== undefined && { ContentEncoding: opts.contentEncoding }),
        ...(opts.cacheControl !== undefined && { CacheControl: opts.cacheControl }),
        ...(opts.storageClass !== undefined && {
          StorageClass: toS3StorageClass(opts.storageClass),
        }),
        ...(opts.custom !== undefined && { Metadata: opts.custom }),
        ...(opts.ifNoneMatch !== undefined && { IfNoneMatch: opts.ifNoneMatch }),
        ...applyEncryption(enc),
      });
      const res = await this.client.send(cmd, { abortSignal: signal });
      return {
        key: origKey,
        size: bytes.byteLength,
        contentType: opts.contentType ?? "application/octet-stream",
        etag: res.ETag ?? `"${sha256}"`,
        lastModified: new Date().toISOString(),
        sha256,
        ...(opts.contentDisposition !== undefined && { contentDisposition: opts.contentDisposition }),
        ...(opts.contentEncoding !== undefined && { contentEncoding: opts.contentEncoding }),
        ...(opts.cacheControl !== undefined && { cacheControl: opts.cacheControl }),
        ...(opts.storageClass !== undefined && { storageClass: opts.storageClass }),
        ...(opts.custom !== undefined && { custom: opts.custom }),
      };
    } catch (err) {
      throw translateS3Error(err, origKey);
    }
  }

  async get(key: string, opts: GetOptions = {}, signal?: AbortSignal): Promise<GetResult> {
    signal?.throwIfAborted();
    const Key = this.keyFor(key);
    try {
      const cmd = new GetObjectCommand({
        Bucket: this.bucket,
        Key,
        ...(opts.range && {
          Range: `bytes=${opts.range.start}-${opts.range.end ?? ""}`,
        }),
        ...(opts.ifMatch !== undefined && { IfMatch: opts.ifMatch }),
        ...(opts.ifNoneMatch !== undefined && { IfNoneMatch: opts.ifNoneMatch }),
        ...(opts.ifModifiedSince !== undefined && {
          IfModifiedSince: new Date(opts.ifModifiedSince),
        }),
      });
      const res = await this.client.send(cmd, { abortSignal: signal });
      const body = res.Body;
      if (!body) {
        throw new ObjectNotFound("s3", key);
      }
      const stream =
        body instanceof ReadableStream
          ? (body as ReadableStream<Uint8Array>)
          : nodeToWebStream(body as Readable);
      const metadata: ObjectMetadata = {
        key,
        size: res.ContentLength ?? 0,
        contentType: res.ContentType ?? "application/octet-stream",
        etag: res.ETag ?? "",
        lastModified: (res.LastModified ?? new Date()).toISOString(),
        ...(res.ChecksumSHA256 && { sha256: Buffer.from(res.ChecksumSHA256, "base64").toString("hex") }),
        ...(res.ContentDisposition !== undefined && { contentDisposition: res.ContentDisposition }),
        ...(res.ContentEncoding !== undefined && { contentEncoding: res.ContentEncoding }),
        ...(res.CacheControl !== undefined && { cacheControl: res.CacheControl }),
        ...(res.StorageClass !== undefined && {
          storageClass: fromS3StorageClass(res.StorageClass),
        }),
        ...(res.Metadata !== undefined && { custom: res.Metadata }),
      };
      return { body: stream, metadata };
    } catch (err) {
      throw translateS3Error(err, key);
    }
  }

  async head(key: string, signal?: AbortSignal): Promise<ObjectMetadata> {
    signal?.throwIfAborted();
    const Key = this.keyFor(key);
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key }),
        { abortSignal: signal },
      );
      return {
        key,
        size: res.ContentLength ?? 0,
        contentType: res.ContentType ?? "application/octet-stream",
        etag: res.ETag ?? "",
        lastModified: (res.LastModified ?? new Date()).toISOString(),
        ...(res.ChecksumSHA256 && { sha256: Buffer.from(res.ChecksumSHA256, "base64").toString("hex") }),
        ...(res.ContentDisposition !== undefined && { contentDisposition: res.ContentDisposition }),
        ...(res.ContentEncoding !== undefined && { contentEncoding: res.ContentEncoding }),
        ...(res.CacheControl !== undefined && { cacheControl: res.CacheControl }),
        ...(res.StorageClass !== undefined && {
          storageClass: fromS3StorageClass(res.StorageClass),
        }),
        ...(res.Metadata !== undefined && { custom: res.Metadata }),
      };
    } catch (err) {
      throw translateS3Error(err, key);
    }
  }

  async delete(key: string, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    const Key = this.keyFor(key);
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key }),
        { abortSignal: signal },
      );
    } catch (err) {
      // S3 DELETE is idempotent; only surface non-404 errors.
      const translated = translateS3Error(err, key);
      if (translated instanceof ObjectNotFound) return;
      throw translated;
    }
  }

  async list(opts: ListOptions = {}, signal?: AbortSignal): Promise<ListResult> {
    signal?.throwIfAborted();
    const prefix = opts.prefix ? this.keyFor(opts.prefix) : this.tenantPrefix;
    try {
      const res = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ...(opts.limit !== undefined && { MaxKeys: opts.limit }),
          ...(opts.cursor !== undefined && { ContinuationToken: opts.cursor }),
          ...(opts.delimiter !== undefined && { Delimiter: opts.delimiter }),
        }),
        { abortSignal: signal },
      );
      const objects: ObjectMetadata[] = (res.Contents ?? []).map((c) => ({
        key: stripPrefix(c.Key ?? "", this.tenantPrefix),
        size: c.Size ?? 0,
        contentType: "application/octet-stream",
        etag: c.ETag ?? "",
        lastModified: (c.LastModified ?? new Date()).toISOString(),
        ...(c.StorageClass !== undefined && {
          storageClass: fromS3StorageClass(c.StorageClass),
        }),
      }));
      const commonPrefixes = (res.CommonPrefixes ?? [])
        .map((cp) => stripPrefix(cp.Prefix ?? "", this.tenantPrefix))
        .filter((p) => p.length > 0);
      return {
        objects,
        commonPrefixes,
        ...(res.NextContinuationToken && { nextCursor: res.NextContinuationToken }),
      };
    } catch (err) {
      throw translateS3Error(err, prefix);
    }
  }

  async copy(
    src: string,
    dst: string,
    opts: CopyOptions = {},
    signal?: AbortSignal,
  ): Promise<ObjectMetadata> {
    signal?.throwIfAborted();
    const SourceKey = this.keyFor(src);
    const DestKey = this.keyFor(dst);
    try {
      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          Key: DestKey,
          CopySource: `${this.bucket}/${encodeURIComponent(SourceKey)}`,
          ...(opts.destContentType !== undefined && {
            ContentType: opts.destContentType,
            MetadataDirective: "REPLACE",
          }),
          ...(opts.ifMatch !== undefined && { CopySourceIfMatch: opts.ifMatch }),
          ...applyEncryption(opts.encryption),
        }),
        { abortSignal: signal },
      );
      return await this.head(dst, signal);
    } catch (err) {
      throw translateS3Error(err, src);
    }
  }

  async exists(key: string, signal?: AbortSignal): Promise<boolean> {
    try {
      await this.head(key, signal);
      return true;
    } catch (err) {
      if (err instanceof ObjectNotFound) return false;
      throw err;
    }
  }

  async presign(
    key: string,
    opts: PresignOptions,
  ): Promise<PresignedUrl> {
    const Key = this.keyFor(key);
    const expiresIn = Math.min(Math.max(opts.expiresInSec, 1), 7 * 24 * 3600);
    let url: string;
    let method: "GET" | "PUT" | "DELETE";
    const headers: Record<string, string> = {};
    switch (opts.operation) {
      case "get": {
        method = "GET";
        const cmd = new GetObjectCommand({
          Bucket: this.bucket,
          Key,
          ...(opts.responseContentType !== undefined && {
            ResponseContentType: opts.responseContentType,
          }),
          ...(opts.responseContentDisposition !== undefined && {
            ResponseContentDisposition: opts.responseContentDisposition,
          }),
        });
        url = await getSignedUrl(this.client, cmd, { expiresIn });
        break;
      }
      case "put": {
        method = "PUT";
        const cmd = new PutObjectCommand({
          Bucket: this.bucket,
          Key,
          ...(opts.contentType !== undefined && { ContentType: opts.contentType }),
          ...applyEncryption(this.cfg.defaultEncryption),
        });
        url = await getSignedUrl(this.client, cmd, { expiresIn });
        if (opts.contentType) headers["Content-Type"] = opts.contentType;
        break;
      }
      case "delete": {
        method = "DELETE";
        const cmd = new DeleteObjectCommand({ Bucket: this.bucket, Key });
        url = await getSignedUrl(this.client, cmd, { expiresIn });
        break;
      }
      default:
        throw new Unsupported("s3", `presign operation ${String(opts.operation)}`);
    }
    return {
      url,
      method,
      requiredHeaders: headers,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  async multipartCreate(
    key: string,
    opts: PutOptions = {},
    signal?: AbortSignal,
  ): Promise<MultipartHandle> {
    signal?.throwIfAborted();
    const Key = this.keyFor(key);
    const enc = opts.encryption ?? this.cfg.defaultEncryption;
    try {
      const res = await this.client.send(
        new CreateMultipartUploadCommand({
          Bucket: this.bucket,
          Key,
          ...(opts.contentType !== undefined && { ContentType: opts.contentType }),
          ...(opts.contentDisposition !== undefined && { ContentDisposition: opts.contentDisposition }),
          ...(opts.cacheControl !== undefined && { CacheControl: opts.cacheControl }),
          ...(opts.storageClass !== undefined && {
            StorageClass: toS3StorageClass(opts.storageClass),
          }),
          ...(opts.custom !== undefined && { Metadata: opts.custom }),
          ...applyEncryption(enc),
        }),
      );
      if (!res.UploadId) {
        throw new StorageError({
          code: "upstream-error",
          message: "S3 did not return an UploadId",
          adapter: "s3",
        });
      }
      return {
        key,
        uploadId: res.UploadId,
        adapter: "s3",
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      throw translateS3Error(err, key);
    }
  }

  async multipartPart(
    handle: MultipartHandle,
    partNumber: number,
    body: BodyInput,
    signal?: AbortSignal,
  ): Promise<{ etag: string; size: number }> {
    signal?.throwIfAborted();
    const Key = this.keyFor(handle.key);
    const stream = toReadableStream(body);
    // S3 wants the content length for UploadPart. Buffer the part.
    const buffered = await bufferUpTo(stream, this.cfg.singlePutLimitBytes);
    if (buffered.exceeded) {
      throw new StorageError({
        code: "payload-too-large",
        message: `multipart part exceeded ${this.cfg.singlePutLimitBytes} bytes`,
        adapter: "s3",
      });
    }
    try {
      const res = await this.client.send(
        new UploadPartCommand({
          Bucket: this.bucket,
          Key,
          PartNumber: partNumber,
          UploadId: handle.uploadId,
          Body: buffered.bytes,
          ContentLength: buffered.bytes.byteLength,
        }),
      );
      if (!res.ETag) {
        throw new StorageError({
          code: "upstream-error",
          message: "S3 did not return an ETag for part",
          adapter: "s3",
        });
      }
      return { etag: res.ETag, size: buffered.bytes.byteLength };
    } catch (err) {
      throw translateS3Error(err, handle.key);
    }
  }

  async multipartComplete(
    input: MultipartCompleteInput,
    signal?: AbortSignal,
  ): Promise<ObjectMetadata> {
    signal?.throwIfAborted();
    const Key = this.keyFor(input.handle.key);
    try {
      await this.client.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.bucket,
          Key,
          UploadId: input.handle.uploadId,
          MultipartUpload: {
            Parts: input.parts
              .slice()
              .sort((a, b) => a.partNumber - b.partNumber)
              .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
          },
        }),
      );
      return await this.head(input.handle.key);
    } catch (err) {
      throw translateS3Error(err, input.handle.key);
    }
  }

  async multipartAbort(handle: MultipartHandle, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    const Key = this.keyFor(handle.key);
    try {
      await this.client.send(
        new AbortMultipartUploadCommand({
          Bucket: this.bucket,
          Key,
          UploadId: handle.uploadId,
        }),
      );
    } catch (err) {
      const translated = translateS3Error(err, handle.key);
      if (translated instanceof ObjectNotFound) return;
      throw translated;
    }
  }

  async healthcheck(signal?: AbortSignal): Promise<{
    ok: boolean;
    latencyMs: number;
    detail?: string;
  }> {
    const start = performance.now();
    try {
      await this.client.send(
        new HeadBucketCommand({ Bucket: this.bucket }),
        { abortSignal: signal },
      );
      return { ok: true, latencyMs: Math.round(performance.now() - start) };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - start),
        detail: (err as Error).message,
      };
    }
  }

  async close(): Promise<void> {
    this.client.destroy();
  }
}

/* -------------------------- helpers -------------------------- */

function renderPrefix(template: string, tenantId: string): string {
  return template.replace(/\{tenantId\}/g, tenantId);
}

function stripPrefix(key: string, prefix: string): string {
  const p = prefix.replace(/\/+$/, "");
  if (!p) return key;
  if (key.startsWith(p + "/")) return key.slice(p.length + 1);
  if (key === p) return "";
  return key;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.byteLength + b.byteLength);
  out.set(a, 0);
  out.set(b, a.byteLength);
  return out;
}

/** Read up to `limit` bytes from the stream. If more remain, the rest is
 *  returned in `remainder` so the caller can keep reading without replay. */
async function bufferUpTo(
  stream: ReadableStream<Uint8Array>,
  limit: number,
): Promise<
  | { exceeded: false; bytes: Uint8Array }
  | { exceeded: true; bytes: Uint8Array; remainder: ReadableStream<Uint8Array> }
> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    chunks.push(value);
    if (total > limit) {
      // Hand back a stream that emits the already-read chunks first, then
      // drains the rest of the source.
      reader.releaseLock();
      const head = chunks;
      const tail = stream;
      const merged = new ReadableStream<Uint8Array>({
        async start(controller) {
          for (const c of head) controller.enqueue(c);
          const r = tail.getReader();
          for (;;) {
            const { value, done } = await r.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        },
      });
      // Return an empty `bytes` — caller will consume from `remainder`.
      return { exceeded: true, bytes: new Uint8Array(0), remainder: merged };
    }
  }
  reader.releaseLock();
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return { exceeded: false, bytes: out };
}

function applyEncryption(enc?: EncryptionOption): Record<string, unknown> {
  if (!enc || enc.kind === "none") return {};
  switch (enc.kind) {
    case "sse-s3":
      return { ServerSideEncryption: "AES256" as ServerSideEncryption };
    case "sse-kms":
      return {
        ServerSideEncryption: "aws:kms" as ServerSideEncryption,
        SSEKMSKeyId: enc.kmsKeyId,
      };
    case "sse-c":
      return {
        SSECustomerAlgorithm: enc.algorithm,
        SSECustomerKey: enc.keyBase64,
        SSECustomerKeyMD5: enc.keyMd5Base64,
      };
  }
}

function toS3StorageClass(c: StorageClass): S3StorageClass {
  switch (c) {
    case "standard": return "STANDARD";
    case "infrequent-access": return "STANDARD_IA";
    case "archive": return "GLACIER";
    case "deep-archive": return "DEEP_ARCHIVE";
    case "intelligent-tiering": return "INTELLIGENT_TIERING";
  }
}

function fromS3StorageClass(c: string): StorageClass | undefined {
  switch (c) {
    case "STANDARD": return "standard";
    case "STANDARD_IA": return "infrequent-access";
    case "GLACIER": return "archive";
    case "DEEP_ARCHIVE": return "deep-archive";
    case "INTELLIGENT_TIERING": return "intelligent-tiering";
    default: return undefined;
  }
}

function translateS3Error(err: unknown, key: string): Error {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number }; Code?: string; message?: string };
  const status = e.$metadata?.httpStatusCode;
  const code = e.name ?? e.Code;
  if (status === 404 || code === "NoSuchKey" || code === "NotFound") {
    return new ObjectNotFound("s3", key, err);
  }
  if (status === 403 || code === "AccessDenied" || code === "Forbidden") {
    return new AccessDenied("s3", key, err);
  }
  if (status === 412 || code === "PreconditionFailed") {
    return new StorageError({
      code: "precondition-failed",
      message: `precondition failed for ${key}`,
      adapter: "s3",
      cause: err,
    });
  }
  if (code === "RequestTimeout" || code === "RequestTimeoutException") {
    return new StorageError({
      code: "timeout",
      message: `timeout for ${key}`,
      adapter: "s3",
      cause: err,
      retryable: true,
    });
  }
  if (code === "SlowDown" || status === 503) {
    return new StorageError({
      code: "rate-limited",
      message: `rate limited for ${key}`,
      adapter: "s3",
      cause: err,
      retryable: true,
    });
  }
  return new StorageError({
    code: "upstream-error",
    message: `S3 error ${code ?? status ?? "?"} for ${key}: ${e.message ?? "unknown"}`,
    adapter: "s3",
    cause: err,
    retryable: (status ?? 0) >= 500,
  });
}

function nodeToWebStream(rs: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      rs.on("data", (chunk: Buffer | string) => {
        controller.enqueue(
          typeof chunk === "string"
            ? new TextEncoder().encode(chunk)
            : new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength),
        );
      });
      rs.on("end", () => controller.close());
      rs.on("error", (err) => controller.error(err));
    },
    cancel() {
      rs.destroy();
    },
  });
}
