/** End-to-end integration test for the backend storage layer.
 *
 *  Proves:
 *    - bootstrapStorage() registers both `local` and `s3` factories
 *    - A local backend can be resolved, written to, and read from
 *    - A tenant-scoped S3AdapterConfig constructs the SDK client cleanly
 *    - Presigned URLs round-trip for local adapters
 *    - The registry accepts multiple backends simultaneously (hot + cold)
 *
 *  We do NOT hit AWS or MinIO — construction + type-safety is what's under
 *  test. S3 I/O behavior is covered by the plugin-level contract tests. */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  bootstrapStorage,
  getStorageRegistry,
  resetStorageRegistry,
  LocalStorageAdapter,
  S3StorageAdapter,
  collectStream,
} from "../../src/storage";

describe("backend storage bootstrap", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "gutu-backend-storage-"));
    resetStorageRegistry();
  });
  afterEach(async () => {
    resetStorageRegistry();
    await rm(dir, { recursive: true, force: true });
  });

  it("registers local + s3 factories and declares a local default", () => {
    bootstrapStorage({
      filesRoot: dir,
      publicBaseUrl: "http://localhost:3333",
      defaultTenantId: "tenant-test",
    });
    const r = getStorageRegistry();
    expect(r.listKinds().sort()).toEqual(["local", "s3"]);
    expect(r.getDefaultId()).toBe("default");
    expect(r.getDefault()).toBeInstanceOf(LocalStorageAdapter);
  });

  it("writes and reads a file end-to-end through the default backend", async () => {
    process.env.STORAGE_SIGNING_KEY = "k".repeat(64);
    bootstrapStorage({
      filesRoot: dir,
      publicBaseUrl: "http://localhost:3333",
      defaultTenantId: "tenant-test",
    });
    const adapter = getStorageRegistry().getDefault();
    const payload = new TextEncoder().encode("hello storage");
    const meta = await adapter.put("files/ab/cd/abcd-1234.txt", payload, {
      contentType: "text/plain",
    });
    expect(meta.size).toBe(13);
    const { body, metadata } = await adapter.get("files/ab/cd/abcd-1234.txt");
    expect(metadata.etag).toBe(meta.etag);
    const bytes = await collectStream(body);
    expect(new TextDecoder().decode(bytes)).toBe("hello storage");
  });

  it("a local presigned GET verifies and streams", async () => {
    process.env.STORAGE_SIGNING_KEY = "k".repeat(64);
    bootstrapStorage({
      filesRoot: dir,
      publicBaseUrl: "http://localhost:3333",
      defaultTenantId: "tenant-test",
    });
    const adapter = getStorageRegistry().getDefault() as LocalStorageAdapter;
    await adapter.put("x.bin", new TextEncoder().encode("abc"));
    const presigned = await adapter.presign("x.bin", {
      operation: "get",
      expiresInSec: 60,
    });
    expect(presigned.method).toBe("GET");
    const url = new URL(presigned.url);
    expect(url.pathname).toMatch(/^\/api\/files\/_signed\//);
    const ok = adapter.verifyPresign({
      op: "get",
      key: "x.bin",
      exp: url.searchParams.get("exp")!,
      sig: url.searchParams.get("sig")!,
    });
    expect(ok).toBeNull();
  });

  it("supports declaring an S3 backend alongside the local default", () => {
    bootstrapStorage({
      filesRoot: dir,
      publicBaseUrl: "http://localhost:3333",
      defaultTenantId: "tenant-test",
    });
    const r = getStorageRegistry();
    r.declareBackend(
      {
        id: "r2-cold",
        kind: "s3",
        label: "Cloudflare R2 cold",
        config: {
          provider: "cloudflare-r2",
          bucket: "acme-cold",
          region: "auto",
          endpoint: "https://acct.r2.cloudflarestorage.com",
          credentials: { accessKeyId: "k", secretAccessKey: "s" },
        },
        isDefault: false,
        acceptsWrites: true,
      },
      "tenant-test",
    );
    expect(r.findAdapter("default")).toBeInstanceOf(LocalStorageAdapter);
    expect(r.findAdapter("r2-cold")).toBeInstanceOf(S3StorageAdapter);
    expect(r.listBackends().map((b) => b.id).sort()).toEqual([
      "default",
      "r2-cold",
    ]);
  });

  it("supports MinIO + Wasabi + custom endpoint concurrently (all S3 kind)", () => {
    bootstrapStorage({
      filesRoot: dir,
      publicBaseUrl: "http://localhost:3333",
      defaultTenantId: "tenant-test",
    });
    const r = getStorageRegistry();
    r.declareBackend(
      {
        id: "minio-dev",
        kind: "s3",
        label: "MinIO dev",
        config: {
          bucket: "dev",
          region: "us-east-1",
          endpoint: "http://localhost:9000",
          forcePathStyle: true,
          credentials: { accessKeyId: "minioadmin", secretAccessKey: "minioadmin" },
        },
        acceptsWrites: true,
      },
      "tenant-test",
    );
    r.declareBackend(
      {
        id: "wasabi",
        kind: "s3",
        label: "Wasabi",
        config: {
          bucket: "acme-wasabi",
          region: "us-east-1",
          endpoint: "https://s3.us-east-1.wasabisys.com",
          credentials: { accessKeyId: "k", secretAccessKey: "s" },
        },
        acceptsWrites: true,
      },
      "tenant-test",
    );
    r.declareBackend(
      {
        id: "garage",
        kind: "s3",
        label: "garage on-prem",
        config: {
          bucket: "internal",
          region: "garage",
          endpoint: "http://garage.internal:3900",
          forcePathStyle: true,
          credentials: { accessKeyId: "k", secretAccessKey: "s" },
        },
        acceptsWrites: true,
      },
      "tenant-test",
    );
    expect(r.listBackends().length).toBe(4);
    for (const id of ["minio-dev", "wasabi", "garage"]) {
      expect(r.findAdapter(id)).toBeInstanceOf(S3StorageAdapter);
    }
  });

  it("S3 adapter capabilities advertise cloud features", () => {
    bootstrapStorage({
      filesRoot: dir,
      publicBaseUrl: "http://localhost:3333",
      defaultTenantId: "tenant-test",
    });
    const r = getStorageRegistry();
    r.declareBackend(
      {
        id: "aws",
        kind: "s3",
        label: "AWS",
        config: {
          provider: "aws",
          bucket: "b",
          region: "us-east-1",
          credentials: { accessKeyId: "k", secretAccessKey: "s" },
        },
        acceptsWrites: true,
      },
      "tenant-test",
    );
    const a = r.getAdapter("aws");
    expect(a.capabilities.presignGet).toBe(true);
    expect(a.capabilities.presignPut).toBe(true);
    expect(a.capabilities.multipart).toBe(true);
    expect(a.capabilities.serverSideEncryption).toBe(true);
  });
});
