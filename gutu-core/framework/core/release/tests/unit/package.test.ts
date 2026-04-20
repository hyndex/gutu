import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash, generateKeyPairSync } from "node:crypto";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "bun:test";

import {
  type ReleaseManifest,
  prepareReleaseBundle,
  signReleaseManifest,
  verifyReleaseManifestSignature
} from "../../src";

function hasTar(): boolean {
  return spawnSync("tar", ["--version"], { stdio: "ignore" }).status === 0;
}

describe("@gutu/release", () => {
  it("prepares a release bundle with manifest and provenance", () => {
    if (!hasTar()) {
      return;
    }

    const root = mkdtempSync(join(tmpdir(), "gutu-release-"));
    try {
      writeFileSync(join(root, "README.md"), "# Demo\n", "utf8");
      writeFileSync(join(root, "package.json"), "{\"name\":\"demo\"}\n", "utf8");
      mkdirSync(join(root, "framework", "core"), { recursive: true });
      writeFileSync(join(root, "framework", "core", "marker.txt"), "core\n", "utf8");

      const result = prepareReleaseBundle(root, { outDir: join(root, "artifacts", "release") });
      expect(existsSync(result.artifactPath)).toBe(true);
      expect(result.manifest.artifact.sha256).toHaveLength(64);
      expect(result.provenance.artifact.sha256).toBe(result.manifest.artifact.sha256);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("signs and verifies a release manifest", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const manifest: ReleaseManifest = {
      schemaVersion: 1,
      package: "gutu-core",
      version: "0.0.1",
      createdAt: new Date(0).toISOString(),
      artifact: {
        path: "artifacts/release/gutu-core.tgz",
        sha256: createHash("sha256").update("artifact").digest("hex"),
        sizeBytes: 8
      }
    };

    const signed = signReleaseManifest(manifest, privateKey.export({ type: "pkcs8", format: "pem" }).toString());
    expect(
      verifyReleaseManifestSignature(
        manifest,
        signed.signature,
        publicKey.export({ type: "spki", format: "pem" }).toString()
      )
    ).toBe(true);

    expect(
      verifyReleaseManifestSignature(
        { ...manifest, version: "0.0.2" },
        signed.signature,
        publicKey.export({ type: "spki", format: "pem" }).toString()
      )
    ).toBe(false);
  });
});
