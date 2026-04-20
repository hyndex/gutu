import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it } from "bun:test";

import {
  createWorkspaceLock,
  doctorCoreRepository,
  loadRolloutOrganization,
  promoteReleaseArtifact,
  provisionGitHubRepositories,
  scaffoldRolloutRepositories,
  scaffoldWorkspace
} from "../../src";

describe("@gutu/ecosystem", () => {
  it("creates an empty stable lockfile", () => {
    const lock = createWorkspaceLock();
    expect(lock.channel).toBe("stable");
    expect(lock.plugins).toHaveLength(0);
    expect(lock.libraries).toHaveLength(0);
  });

  it("scaffolds a clean consumer workspace", () => {
    const root = mkdtempSync(join(tmpdir(), "gutu-ecosystem-"));
    try {
      const result = scaffoldWorkspace(root, { target: "demo" });
      expect(result.ok).toBe(true);
      expect(result.createdFiles).toContain("gutu.project.json");
      expect(result.createdFiles).toContain("vendor/plugins/.gitkeep");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags forbidden plugin directories in the core repository", () => {
    const root = mkdtempSync(join(tmpdir(), "gutu-doctor-"));
    try {
      mkdirSync(join(root, "old_contents"), { recursive: true });
      mkdirSync(join(root, "plugins"), { recursive: true });
      const result = doctorCoreRepository(root);
      expect(result.ok).toBe(false);
      expect(result.findings[0]).toContain("plugins");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("loads the rollout organization manifest", () => {
    const root = mkdtempSync(join(tmpdir(), "gutu-rollout-load-"));
    try {
      mkdirSync(join(root, "ecosystem", "rollout"), { recursive: true });
      writeFileSync(
        join(root, "ecosystem", "rollout", "organization.json"),
        JSON.stringify(
          {
            schemaVersion: 1,
            organization: "gutula",
            repositories: [{ name: "gutu-core", kind: "core", description: "Core repo." }]
          },
          null,
          2
        ) + "\n",
        "utf8"
      );

      const rollout = loadRolloutOrganization(root);
      expect(rollout.organization).toBe("gutula");
      expect(rollout.repositories).toHaveLength(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("scaffolds the configured rollout repository set", () => {
    const root = mkdtempSync(join(tmpdir(), "gutu-rollout-scaffold-"));
    try {
      mkdirSync(join(root, "ecosystem", "rollout"), { recursive: true });
      writeFileSync(
        join(root, "ecosystem", "rollout", "organization.json"),
        JSON.stringify(
          {
            schemaVersion: 1,
            organization: "gutula",
            repositories: [
              { name: "gutu-core", kind: "core", description: "Core repo." },
              { name: "gutu-plugins", kind: "catalog", description: "Catalog repo." },
              { name: "gutu-ecosystem-integration", kind: "integration", description: "Integration repo." }
            ]
          },
          null,
          2
        ) + "\n",
        "utf8"
      );

      const result = scaffoldRolloutRepositories(root, { outDir: join(root, "out") });
      expect(result.ok).toBe(true);
      expect(existsSync(join(root, "out", "gutu-plugins", "catalog", "index.json"))).toBe(true);
      expect(existsSync(join(root, "out", "gutu-ecosystem-integration", "matrix", "README.md"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("promotes a signed release artifact into catalog and channel metadata", () => {
    const root = mkdtempSync(join(tmpdir(), "gutu-rollout-promote-"));
    try {
      mkdirSync(join(root, "artifacts", "release"), { recursive: true });
      const { publicKey } = generateKeyPairSync("ed25519");

      writeFileSync(
        join(root, "artifacts", "release", "demo-release-manifest.json"),
        JSON.stringify(
          {
            schemaVersion: 1,
            package: "demo",
            version: "1.2.3",
            createdAt: new Date(0).toISOString(),
            artifact: {
              path: "artifacts/release/demo-1.2.3.tgz",
              sha256: "a".repeat(64),
              sizeBytes: 123
            }
          },
          null,
          2
        ) + "\n",
        "utf8"
      );
      writeFileSync(
        join(root, "artifacts", "release", "demo-release-manifest.json.sig.json"),
        JSON.stringify({ algorithm: "ed25519", signature: "ZmFrZQ==" }, null, 2) + "\n",
        "utf8"
      );

      const result = promoteReleaseArtifact(root, {
        packageId: "@gutula/demo-plugin",
        kind: "plugin",
        repo: "gutula/gutu-plugin-demo",
        manifestPath: "artifacts/release/demo-release-manifest.json",
        signaturePath: "artifacts/release/demo-release-manifest.json.sig.json",
        publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
        uriBase: "https://github.com/gutula/gutu-plugin-demo/releases/download/v1.2.3"
      });

      expect(result.ok).toBe(true);
      const catalog = JSON.parse(readFileSync(result.catalogPath, "utf8")) as { packages: Array<{ id: string }> };
      const channel = JSON.parse(readFileSync(result.channelPath, "utf8")) as { packages: Array<{ id: string }> };
      expect(catalog.packages[0]?.id).toBe("@gutula/demo-plugin");
      expect(channel.packages[0]?.id).toBe("@gutula/demo-plugin");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("provisions GitHub repositories through the rollout manifest when a token is available", async () => {
    const root = mkdtempSync(join(tmpdir(), "gutu-rollout-provision-"));
    try {
      mkdirSync(join(root, "ecosystem", "rollout"), { recursive: true });
      writeFileSync(
        join(root, "ecosystem", "rollout", "organization.json"),
        JSON.stringify(
          {
            schemaVersion: 1,
            organization: "gutula",
            repositories: [
              { name: "gutu-core", kind: "core", description: "Core repo.", visibility: "public" },
              { name: "gutu-plugins", kind: "catalog", description: "Catalog repo.", visibility: "public" }
            ]
          },
          null,
          2
        ) + "\n",
        "utf8"
      );

      const calls: Array<{ url: string; body: string }> = [];
      const result = await provisionGitHubRepositories(root, {
        token: "token",
        fetchImpl: async (input, init) => {
          calls.push({
            url: String(input),
            body: String(init?.body ?? "")
          });

          return new Response(
            JSON.stringify({
              html_url: "https://github.com/gutula/example"
            }),
            { status: 201, headers: { "content-type": "application/json" } }
          );
        }
      });

      expect(result.ok).toBe(true);
      expect(result.repositories).toHaveLength(2);
      expect(calls[0]?.url).toContain("/orgs/gutula/repos");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
