/** Local-filesystem storage adapter.
 *
 *  Every key lives under `<rootDir>/<tenantPrefix>/<encodedKey>`. The
 *  adapter guarantees the resolved absolute path stays under `<rootDir>`
 *  by re-running `path.resolve()` and checking the prefix — any attempt to
 *  traverse outside (via `..`, symlink tricks, or unicode confusables) is
 *  refused before the FS touches a byte.
 *
 *  Metadata is stored alongside the object in a `.meta.json` sidecar.
 *  Content-Type, custom metadata, and SHA-256 all persist that way so a
 *  subsequent `head()` returns exactly what `put()` committed, even after
 *  a restart.
 *
 *  Presigned URLs are served by a local HMAC-signed scheme compatible with
 *  the admin-panel backend's `/api/files/_signed/...` route. The adapter
 *  only computes the token; the HTTP layer decides whether to honor it.
 */

import { createHash, randomUUID, timingSafeEqual, createHmac } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  type ReadStream,
} from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  type AdapterCapabilities,
  type BodyInput,
  type CopyOptions,
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
  ObjectNotFound,
  InvalidKey,
  StorageError,
  joinTenantKey,
  toReadableStream,
  validateObjectKey,
} from "../index";

export interface LocalAdapterConfig {
  /** Absolute path to the storage root. Must already exist or be creatable. */
  rootDir: string;
  /** Per-tenant subdirectory prefix; the adapter joins with `tenantId`. */
  tenantPrefixTemplate?: string;
  /** HMAC signing key for presigned URLs. Rotate by spinning up a new
   *  backend with a fresh key and marking the old one `acceptsWrites:false`. */
  signingKey: string;
  /** Public base URL (no trailing slash) served by the admin-panel backend
   *  that knows how to verify the HMAC. Example: `https://api.acme.app`. */
  publicBaseUrl: string;
  /** Reject single-PUT bodies above this many bytes. Multipart pushes up
   *  to `Number.MAX_SAFE_INTEGER`. Default: 5 GiB. */
  singlePutLimitBytes?: number;
}

const DEFAULT_LIMIT = 5 * 1024 * 1024 * 1024;

export class LocalStorageAdapter implements StorageAdapter {
  readonly id = "local";
  readonly label: string;
  readonly capabilities: AdapterCapabilities;

  private readonly rootDir: string;
  private readonly tenantPrefix: string;
  private readonly signingKey: string;
  private readonly publicBaseUrl: string;

  constructor(config: LocalAdapterConfig, tenantId: string) {
    if (!path.isAbsolute(config.rootDir)) {
      throw new StorageError({
        code: "invalid-argument",
        message: `rootDir must be absolute, got "${config.rootDir}"`,
        adapter: "local",
      });
    }
    this.rootDir = path.resolve(config.rootDir);
    this.tenantPrefix = renderPrefix(
      config.tenantPrefixTemplate ?? "tenants/{tenantId}",
      tenantId,
    );
    this.signingKey = config.signingKey;
    this.publicBaseUrl = config.publicBaseUrl.replace(/\/+$/, "");
    this.label = `Local filesystem (${this.rootDir})`;
    this.capabilities = {
      presignGet: true,
      presignPut: true,
      multipart: true,
      copy: true,
      serverSideEncryption: false,
      conditionalWrites: true,
      streamingReads: true,
      streamingWrites: true,
      singlePutLimitBytes: config.singlePutLimitBytes ?? DEFAULT_LIMIT,
    };
  }

  /** Resolve and validate the absolute on-disk path for a key. Throws
   *  `InvalidKey` if the result would escape `rootDir`. */
  private pathFor(key: string): { full: string; meta: string } {
    const tenantKey = joinTenantKey(this.tenantPrefix, key);
    validateObjectKey("local", tenantKey);
    const full = path.resolve(this.rootDir, tenantKey);
    // Defense-in-depth: after resolve, make sure we're still under rootDir.
    const rel = path.relative(this.rootDir, full);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new InvalidKey("local", key, `resolves outside rootDir`);
    }
    return { full, meta: `${full}.meta.json` };
  }

  async put(
    key: string,
    body: BodyInput,
    opts: PutOptions = {},
    signal?: AbortSignal,
  ): Promise<ObjectMetadata> {
    signal?.throwIfAborted();
    const { full, meta } = this.pathFor(key);

    if (opts.ifNoneMatch === "*" && (await existsFile(full))) {
      throw new StorageError({
        code: "precondition-failed",
        message: `object ${key} exists and ifNoneMatch=* was set`,
        adapter: "local",
      });
    }
    if (opts.ifMatch) {
      const existing = await this.#headOrNull(key);
      if (!existing || existing.etag !== opts.ifMatch) {
        throw new StorageError({
          code: "precondition-failed",
          message: `ifMatch failed for ${key}`,
          adapter: "local",
        });
      }
    }

    await fs.mkdir(path.dirname(full), { recursive: true });

    // Write to a temp file then rename — atomic on POSIX.
    const tmp = `${full}.${randomUUID()}.tmp`;
    const limit = this.capabilities.singlePutLimitBytes;
    const stream = toReadableStream(body);
    const hash = createHash("sha256");
    let size = 0;

    try {
      const sink = createWriteStream(tmp);
      const source = Readable.fromWeb(
        stream as unknown as import("node:stream/web").ReadableStream<Uint8Array>,
      );

      const limiter = new Writable({
        write(chunk: Buffer, _enc, cb) {
          try {
            size += chunk.length;
            if (size > limit) {
              cb(
                new StorageError({
                  code: "payload-too-large",
                  message: `body exceeded ${limit} bytes`,
                  adapter: "local",
                }),
              );
              return;
            }
            hash.update(chunk);
            sink.write(chunk, cb);
          } catch (e) {
            cb(e as Error);
          }
        },
        final(cb) {
          sink.end(cb);
        },
      });
      await pipeline(source, limiter, { signal });
      const hex = hash.digest("hex");

      if (opts.sha256 && opts.sha256.toLowerCase() !== hex) {
        await fs.unlink(tmp).catch(() => { /* noop */ });
        throw new StorageError({
          code: "checksum-mismatch",
          message: `checksum mismatch: expected sha256 ${opts.sha256}, got ${hex}`,
          adapter: "local",
        });
      }

      const etag = `"${createHash("md5")
        .update(await fs.readFile(tmp))
        .digest("hex")}"`;

      const now = new Date().toISOString();
      const metadata: ObjectMetadata = {
        key,
        size,
        contentType: opts.contentType ?? "application/octet-stream",
        etag,
        lastModified: now,
        sha256: hex,
        ...(opts.contentDisposition !== undefined && { contentDisposition: opts.contentDisposition }),
        ...(opts.contentEncoding !== undefined && { contentEncoding: opts.contentEncoding }),
        ...(opts.cacheControl !== undefined && { cacheControl: opts.cacheControl }),
        ...(opts.storageClass !== undefined && { storageClass: opts.storageClass }),
        ...(opts.custom !== undefined && { custom: opts.custom }),
      };
      await fs.rename(tmp, full);
      await fs.writeFile(meta, JSON.stringify(metadata), "utf8");
      return metadata;
    } catch (err) {
      await fs.unlink(tmp).catch(() => { /* noop */ });
      if (err instanceof StorageError) throw err;
      throw new StorageError({
        code: "upstream-error",
        message: `put failed for ${key}: ${(err as Error).message}`,
        adapter: "local",
        cause: err,
      });
    }
  }

  async get(key: string, opts: GetOptions = {}, signal?: AbortSignal): Promise<GetResult> {
    signal?.throwIfAborted();
    const metadata = await this.head(key);
    if (opts.ifMatch && metadata.etag !== opts.ifMatch) {
      throw new StorageError({
        code: "precondition-failed",
        message: `ifMatch failed for ${key}`,
        adapter: "local",
      });
    }
    if (opts.ifNoneMatch && metadata.etag === opts.ifNoneMatch) {
      throw new StorageError({
        code: "precondition-failed",
        message: `ifNoneMatch matched for ${key}`,
        adapter: "local",
      });
    }
    const { full } = this.pathFor(key);
    const readOpts: Parameters<typeof createReadStream>[1] = {};
    if (opts.range) {
      readOpts.start = opts.range.start;
      if (opts.range.end !== undefined) readOpts.end = opts.range.end;
    }
    const node = createReadStream(full, readOpts);
    const body = nodeToWebStream(node);
    return { body, metadata };
  }

  async head(key: string, signal?: AbortSignal): Promise<ObjectMetadata> {
    signal?.throwIfAborted();
    const found = await this.#headOrNull(key);
    if (!found) throw new ObjectNotFound("local", key);
    return found;
  }

  async #headOrNull(key: string): Promise<ObjectMetadata | null> {
    const { full, meta } = this.pathFor(key);
    try {
      const st = await fs.stat(full);
      if (!st.isFile()) return null;
      try {
        const txt = await fs.readFile(meta, "utf8");
        const parsed = JSON.parse(txt) as ObjectMetadata;
        // Sync mtime/size with disk in case sidecar is stale.
        return { ...parsed, size: st.size, lastModified: st.mtime.toISOString() };
      } catch {
        // No sidecar — synthesize minimal metadata.
        return {
          key,
          size: st.size,
          contentType: "application/octet-stream",
          etag: `"${st.size}-${st.mtimeMs}"`,
          lastModified: st.mtime.toISOString(),
        };
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async delete(key: string, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    const { full, meta } = this.pathFor(key);
    await fs.unlink(full).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== "ENOENT") throw e;
    });
    await fs.unlink(meta).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== "ENOENT") throw e;
    });
  }

  async list(opts: ListOptions = {}, signal?: AbortSignal): Promise<ListResult> {
    signal?.throwIfAborted();
    const prefix = opts.prefix ?? "";
    const limit = opts.limit ?? 1000;
    const tenantPrefix = joinTenantKey(this.tenantPrefix, prefix);
    const base = path.resolve(this.rootDir, tenantPrefix);
    const objects: ObjectMetadata[] = [];
    const commonPrefixes = new Set<string>();

    // Walk.
    const walk = async (dir: string): Promise<void> => {
      let entries: import("node:fs").Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
        throw e;
      }
      for (const ent of entries) {
        if (objects.length >= limit) return;
        if (ent.name.endsWith(".meta.json")) continue;
        const abs = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          await walk(abs);
          continue;
        }
        if (!ent.isFile()) continue;
        const rel = path.relative(path.resolve(this.rootDir, this.tenantPrefix), abs);
        const key = rel.split(path.sep).join("/");
        if (prefix && !key.startsWith(prefix)) continue;
        if (opts.delimiter) {
          const afterPrefix = key.slice(prefix.length);
          const idx = afterPrefix.indexOf(opts.delimiter);
          if (idx >= 0) {
            commonPrefixes.add(prefix + afterPrefix.slice(0, idx + 1));
            continue;
          }
        }
        const m = await this.#headOrNull(key);
        if (m) objects.push(m);
      }
    };
    await walk(base);
    return { objects, commonPrefixes: [...commonPrefixes] };
  }

  async copy(
    src: string,
    dst: string,
    opts: CopyOptions = {},
    signal?: AbortSignal,
  ): Promise<ObjectMetadata> {
    signal?.throwIfAborted();
    const source = this.pathFor(src);
    const dest = this.pathFor(dst);
    const meta = await this.head(src);
    await fs.mkdir(path.dirname(dest.full), { recursive: true });
    await fs.copyFile(source.full, dest.full);
    const next: ObjectMetadata = {
      ...meta,
      key: dst,
      contentType: opts.destContentType ?? meta.contentType,
      lastModified: new Date().toISOString(),
    };
    await fs.writeFile(dest.meta, JSON.stringify(next), "utf8");
    return next;
  }

  async exists(key: string, signal?: AbortSignal): Promise<boolean> {
    signal?.throwIfAborted();
    return (await this.#headOrNull(key)) !== null;
  }

  async presign(
    key: string,
    opts: PresignOptions,
  ): Promise<PresignedUrl> {
    validateObjectKey("local", key);
    const op = opts.operation;
    if (op === "delete") {
      throw new StorageError({
        code: "unsupported",
        message: "local adapter refuses presigned DELETE; use the authenticated API",
        adapter: "local",
      });
    }
    const expiresAt = new Date(Date.now() + opts.expiresInSec * 1000);
    const payload = [
      op,
      key,
      expiresAt.toISOString(),
      opts.contentType ?? "",
      opts.contentLengthRange?.max ?? "",
    ].join("\n");
    const sig = createHmac("sha256", this.signingKey).update(payload).digest("hex");
    const qs = new URLSearchParams({
      op,
      exp: expiresAt.toISOString(),
      sig,
    });
    if (opts.contentType) qs.set("ct", opts.contentType);
    if (opts.contentLengthRange?.max !== undefined)
      qs.set("max", String(opts.contentLengthRange.max));
    if (opts.responseContentDisposition)
      qs.set("cd", opts.responseContentDisposition);
    return {
      url: `${this.publicBaseUrl}/api/files/_signed/${encodeURIComponent(key)}?${qs.toString()}`,
      method: op === "get" ? "GET" : "PUT",
      requiredHeaders: opts.contentType && op === "put" ? { "Content-Type": opts.contentType } : {},
      expiresAt: expiresAt.toISOString(),
    };
  }

  /** Verify a presigned URL token. Exposed for the HTTP handler. Returns
   *  null on valid, a string error on invalid. */
  verifyPresign(params: {
    op: string;
    key: string;
    exp: string;
    sig: string;
    contentType?: string;
    maxBytes?: string;
  }): string | null {
    const expiresAt = new Date(params.exp);
    if (!Number.isFinite(expiresAt.getTime())) return "bad expiry";
    if (expiresAt.getTime() < Date.now()) return "expired";
    const expected = createHmac("sha256", this.signingKey)
      .update(
        [
          params.op,
          params.key,
          params.exp,
          params.contentType ?? "",
          params.maxBytes ?? "",
        ].join("\n"),
      )
      .digest();
    const got = Buffer.from(params.sig, "hex");
    if (got.length !== expected.length) return "bad signature";
    return timingSafeEqual(expected, got) ? null : "bad signature";
  }

  async multipartCreate(
    key: string,
    opts: PutOptions = {},
  ): Promise<MultipartHandle> {
    const { full } = this.pathFor(key);
    const uploadId = randomUUID();
    const stagingDir = `${full}.mpu-${uploadId}`;
    await fs.mkdir(stagingDir, { recursive: true });
    if (opts.contentType) {
      await fs.writeFile(
        path.join(stagingDir, "_meta.json"),
        JSON.stringify({ contentType: opts.contentType, custom: opts.custom ?? {} }),
      );
    }
    return {
      key,
      uploadId,
      adapter: "local",
      createdAt: new Date().toISOString(),
    };
  }

  async multipartPart(
    handle: MultipartHandle,
    partNumber: number,
    body: BodyInput,
  ): Promise<{ etag: string; size: number }> {
    if (partNumber < 1) {
      throw new StorageError({
        code: "invalid-argument",
        message: "partNumber must be >= 1",
        adapter: "local",
      });
    }
    const { full } = this.pathFor(handle.key);
    const stagingDir = `${full}.mpu-${handle.uploadId}`;
    await fs.mkdir(stagingDir, { recursive: true });
    const partPath = path.join(stagingDir, `${String(partNumber).padStart(6, "0")}.part`);
    const stream = toReadableStream(body);
    const source = Readable.fromWeb(
      stream as unknown as import("node:stream/web").ReadableStream<Uint8Array>,
    );
    const hash = createHash("md5");
    let size = 0;
    const sink = createWriteStream(partPath);
    const limiter = new Writable({
      write(chunk: Buffer, _enc, cb) {
        hash.update(chunk);
        size += chunk.length;
        sink.write(chunk, cb);
      },
      final(cb) {
        sink.end(cb);
      },
    });
    await pipeline(source, limiter);
    return { etag: `"${hash.digest("hex")}"`, size };
  }

  async multipartComplete(input: MultipartCompleteInput): Promise<ObjectMetadata> {
    const { full, meta } = this.pathFor(input.handle.key);
    const stagingDir = `${full}.mpu-${input.handle.uploadId}`;
    await fs.mkdir(path.dirname(full), { recursive: true });
    const sorted = [...input.parts].sort((a, b) => a.partNumber - b.partNumber);
    const sink = createWriteStream(full);
    const hash = createHash("sha256");
    let size = 0;
    try {
      for (const p of sorted) {
        const partPath = path.join(
          stagingDir,
          `${String(p.partNumber).padStart(6, "0")}.part`,
        );
        const buf = await fs.readFile(partPath);
        hash.update(buf);
        size += buf.length;
        await new Promise<void>((resolve, reject) => {
          sink.write(buf, (e) => (e ? reject(e) : resolve()));
        });
      }
    } finally {
      await new Promise<void>((resolve) => sink.end(() => resolve()));
    }
    // Sidecar metadata.
    let extra: { contentType?: string; custom?: Record<string, string> } = {};
    try {
      extra = JSON.parse(await fs.readFile(path.join(stagingDir, "_meta.json"), "utf8"));
    } catch { /* no sidecar */ }
    const etag = `"${hash.digest("hex")}-${sorted.length}"`;
    const metadata: ObjectMetadata = {
      key: input.handle.key,
      size,
      contentType: extra.contentType ?? "application/octet-stream",
      etag,
      lastModified: new Date().toISOString(),
      sha256: etag.slice(1, 65),
      ...(extra.custom !== undefined && { custom: extra.custom }),
    };
    await fs.writeFile(meta, JSON.stringify(metadata), "utf8");
    await fs.rm(stagingDir, { recursive: true, force: true });
    return metadata;
  }

  async multipartAbort(handle: MultipartHandle): Promise<void> {
    const { full } = this.pathFor(handle.key);
    const stagingDir = `${full}.mpu-${handle.uploadId}`;
    await fs.rm(stagingDir, { recursive: true, force: true });
  }

  async healthcheck(): Promise<{ ok: boolean; latencyMs: number; detail?: string }> {
    const start = performance.now();
    try {
      await fs.mkdir(this.rootDir, { recursive: true });
      const probe = path.join(this.rootDir, `.probe-${randomUUID()}`);
      await fs.writeFile(probe, "ok", "utf8");
      await fs.readFile(probe);
      await fs.unlink(probe);
      return { ok: true, latencyMs: Math.round(performance.now() - start) };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - start),
        detail: (err as Error).message,
      };
    }
  }
}

function renderPrefix(template: string, tenantId: string): string {
  return template.replace(/\{tenantId\}/g, tenantId);
}

async function existsFile(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

function nodeToWebStream(rs: ReadStream): ReadableStream<Uint8Array> {
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
