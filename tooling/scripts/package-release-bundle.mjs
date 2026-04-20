import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { cleanDir, ensureDir, rootDir } from "./workspace-utils.mjs";
import { releaseArtifactName, releaseBundleIncludedPaths } from "./release-config.mjs";
import { assertReleaseBundleContents } from "./release-bundle-utils.mjs";

const releaseDir = cleanDir(path.join(rootDir, "artifacts", "release"));
const archivePath = path.join(releaseDir, releaseArtifactName);
const includedPaths = releaseBundleIncludedPaths.filter((entry) => existsSync(path.join(rootDir, entry)));

const tarResult = spawnSync(
  "tar",
  [
    "-czf",
    archivePath,
    "--exclude=artifacts",
    "--exclude=coverage",
    "--exclude=node_modules",
    "--exclude=playwright-report",
    "--exclude=test-results",
    "--exclude=.bun-install-cache",
    "--exclude=*.tsbuildinfo",
    ...includedPaths
  ],
  {
    cwd: rootDir,
    stdio: "inherit"
  }
);

if (tarResult.status !== 0) {
  process.exit(tarResult.status ?? 1);
}

const verification = assertReleaseBundleContents(archivePath);

const checksum = createHash("sha256").update(readFileSync(archivePath)).digest("hex");
const manifest = {
  generatedAt: new Date().toISOString(),
  archivePath: path.relative(rootDir, archivePath),
  sha256: checksum,
  includedPaths,
  verification
};

ensureDir(releaseDir);
writeFileSync(path.join(releaseDir, "manifest.json"), JSON.stringify(manifest, null, 2));
writeFileSync(path.join(releaseDir, "checksums.txt"), `${checksum}  ${releaseArtifactName}\n`);
