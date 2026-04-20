import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { z } from "zod";

export const releaseManifestSchema = z.object({
  schemaVersion: z.literal(1),
  package: z.string().min(1),
  version: z.string().min(1),
  createdAt: z.string().min(1),
  artifact: z.object({
    path: z.string().min(1),
    sha256: z.string().length(64),
    sizeBytes: z.number().int().nonnegative()
  })
});
export type ReleaseManifest = z.infer<typeof releaseManifestSchema>;

export const releaseProvenanceSchema = z.object({
  schemaVersion: z.literal(1),
  package: z.string().min(1),
  createdAt: z.string().min(1),
  artifact: z.object({
    path: z.string().min(1),
    sha256: z.string().length(64),
    sizeBytes: z.number().int().nonnegative()
  }),
  environment: z.object({
    platform: z.string().min(1),
    arch: z.string().min(1),
    node: z.string().min(1),
    bun: z.string().min(1)
  }),
  git: z.object({
    commit: z.string().optional(),
    branch: z.string().optional()
  })
});
export type ReleaseProvenance = z.infer<typeof releaseProvenanceSchema>;

export const releaseSignatureSchema = z.object({
  algorithm: z.literal("ed25519"),
  signature: z.string().min(1)
});
export type ReleaseSignature = z.infer<typeof releaseSignatureSchema>;

export type PrepareReleaseBundleOptions = {
  outDir: string;
  artifactName?: string;
};

export type PrepareReleaseBundleResult = {
  artifactPath: string;
  manifestPath: string;
  provenancePath: string;
  manifest: ReleaseManifest;
  provenance: ReleaseProvenance;
};

export function prepareReleaseBundle(projectRoot: string, options: PrepareReleaseBundleOptions): PrepareReleaseBundleResult {
  ensureTarAvailable();

  const packageJsonPath = join(projectRoot, "package.json");
  const packageJson = existsSync(packageJsonPath)
    ? JSON.parse(readFileSync(packageJsonPath, "utf8")) as { name?: string; version?: string }
    : {};
  const packageName = packageJson.name ?? "gutu-core";
  const version = packageJson.version ?? "0.0.1";

  const outDir = resolve(projectRoot, options.outDir);
  mkdirSync(outDir, { recursive: true });

  const artifactName = options.artifactName ?? `${sanitizeFileName(packageName)}-${version}.tgz`;
  const artifactPath = join(outDir, artifactName);
  const manifestPath = join(outDir, `${sanitizeFileName(packageName)}-release-manifest.json`);
  const provenancePath = join(outDir, `${sanitizeFileName(packageName)}-release-provenance.json`);

  const tar = spawnSync(
    "tar",
    [
      "-czf",
      artifactPath,
      "--exclude=.git",
      "--exclude=old_contents",
      "--exclude=node_modules",
      "--exclude=coverage",
      "--exclude=dist",
      "--exclude=artifacts",
      "-C",
      projectRoot,
      "."
    ],
    { encoding: "utf8" }
  );

  if (tar.status !== 0) {
    throw new Error(`Unable to prepare release bundle: ${tar.stderr || tar.stdout || "tar failed"}`);
  }

  const sha256 = computeFileSha256(artifactPath);
  const sizeBytes = statSync(artifactPath).size;
  const createdAt = new Date().toISOString();
  const relativeArtifactPath = relative(projectRoot, artifactPath) || artifactName;

  const manifest = releaseManifestSchema.parse({
    schemaVersion: 1,
    package: packageName,
    version,
    createdAt,
    artifact: {
      path: relativeArtifactPath,
      sha256,
      sizeBytes
    }
  });

  const provenance = releaseProvenanceSchema.parse({
    schemaVersion: 1,
    package: packageName,
    createdAt,
    artifact: manifest.artifact,
    environment: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      bun: Bun.version
    },
    git: {
      commit: readGitValue(projectRoot, ["rev-parse", "HEAD"]),
      branch: readGitValue(projectRoot, ["branch", "--show-current"])
    }
  });

  writeJson(manifestPath, manifest);
  writeJson(provenancePath, provenance);

  return {
    artifactPath,
    manifestPath,
    provenancePath,
    manifest,
    provenance
  };
}

export function signReleaseManifest(manifest: ReleaseManifest, privateKeyPem: string): ReleaseSignature {
  const key = createPrivateKey(privateKeyPem);
  return releaseSignatureSchema.parse({
    algorithm: "ed25519",
    signature: sign(null, Buffer.from(stableStringify(manifest), "utf8"), key).toString("base64")
  });
}

export function verifyReleaseManifestSignature(
  manifest: ReleaseManifest,
  signatureBase64: string,
  publicKeyPem: string
): boolean {
  const key = createPublicKey(publicKeyPem);
  return verify(null, Buffer.from(stableStringify(manifest), "utf8"), key, Buffer.from(signatureBase64, "base64"));
}

export function signReleaseManifestFile(
  manifestPath: string,
  privateKeyPem: string,
  outPath = `${manifestPath}.sig.json`
): { signaturePath: string; signature: ReleaseSignature } {
  const manifest = releaseManifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")));
  const signature = signReleaseManifest(manifest, privateKeyPem);
  writeJson(outPath, signature);
  return {
    signaturePath: outPath,
    signature
  };
}

export function verifyReleaseManifestFileSignature(
  manifestPath: string,
  signaturePath: string,
  publicKeyPem: string
): boolean {
  const manifest = releaseManifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")));
  const signature = releaseSignatureSchema.parse(JSON.parse(readFileSync(signaturePath, "utf8")));
  return verifyReleaseManifestSignature(manifest, signature.signature, publicKeyPem);
}

export function computeFileSha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function ensureTarAvailable() {
  const result = spawnSync("tar", ["--version"], { stdio: "ignore" });
  if (result.status !== 0) {
    throw new Error("The 'tar' command is required for release bundling.");
  }
}

function readGitValue(cwd: string, args: string[]): string | undefined {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    return undefined;
  }
  const value = result.stdout.trim();
  return value.length > 0 ? value : undefined;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortValue((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }

  return value;
}

function writeJson(filePath: string, value: unknown) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}
