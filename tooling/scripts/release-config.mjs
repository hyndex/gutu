import path from "node:path";

export const releaseArtifactName = "gutu-framework-release.tgz";
export const releaseSbomName = "gutu-framework-sbom.cdx.json";
export const releaseArchiveRelativePath = path.join("artifacts", "release", releaseArtifactName);
export const releaseSbomRelativePath = path.join("artifacts", "sbom", releaseSbomName);
export const releaseProvenanceRelativePath = path.join("artifacts", "provenance", "build-provenance.json");
export const releaseSignatureRelativePath = path.join("artifacts", "provenance", "release-signature.json");
export const releaseBuildType = "bun-workspace-gutu-framework";
export const staleReleaseNames = ["platform-core-framework.tgz", "platform-sbom.cdx.json"];

export const releaseBundleIncludedPaths = [
  ".github",
  ".env.example",
  ".env.test.example",
  "ARCHITECTURE_DECISIONS.md",
  "Developer_DeepDive.md",
  "Goal.md",
  "IMPLEMENTATION_LEDGER.md",
  "README.md",
  "RISK_REGISTER.md",
  "STATUS.md",
  "TASKS.md",
  "TEST_MATRIX.md",
  "apps",
  "bun.lock",
  "bunfig.toml",
  "docs",
  "ecosystem",
  "eslint.config.mjs",
  "framework",
  "ops",
  "package.json",
  "plugins",
  "prettier.config.mjs",
  "tooling",
  "tsconfig.base.json",
  "tsconfig.json"
];

export const requiredReleasePathPrefixes = [
  "ecosystem/catalog",
  "ecosystem/channels",
  "framework/core/cli",
  "framework/core/kernel",
  "framework/libraries",
  "framework/builtin-plugins"
];
