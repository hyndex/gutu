import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { rootDir } from "./workspace-utils.mjs";
import { staleReleaseNames } from "./release-config.mjs";

const scanRoots = [
  "README.md",
  "STATUS.md",
  "TASKS.md",
  "RISK_REGISTER.md",
  "docs",
  path.join("example", "npm-install-smoke", "basic-project", "vendor", "framework", "gutu", "docs")
];
const findings = [];

for (const relativeRoot of scanRoots) {
  const absoluteRoot = path.join(rootDir, relativeRoot);
  for (const filePath of walkFiles(absoluteRoot)) {
    const relativePath = path.relative(rootDir, filePath);
    const contents = readFileSync(filePath, "utf8");
    const machineLocalMatches = contents.match(/(?:\/Users\/[^\s)\]"']+|[A-Za-z]:\\Users\\[^\s)\]"']+)/g) ?? [];
    for (const match of machineLocalMatches) {
      findings.push(`${relativePath}: machine-local absolute path '${match}'`);
    }

    for (const staleName of staleReleaseNames) {
      if (contents.includes(staleName)) {
        findings.push(`${relativePath}: stale release artifact name '${staleName}'`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Docs truth/portability audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Docs truth/portability audit passed.");

function walkFiles(startPath) {
  try {
    const stats = statSync(startPath);
    if (stats.isFile()) {
      return [startPath];
    }
  } catch {
    return [];
  }

  const files = [];
  const pending = [startPath];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) {
      continue;
    }

    for (const entry of readdirSync(current)) {
      const absolutePath = path.join(current, entry);
      const stats = statSync(absolutePath);
      if (stats.isDirectory()) {
        pending.push(absolutePath);
        continue;
      }

      if (!absolutePath.match(/\.(?:md|json)$/)) {
        continue;
      }

      files.push(absolutePath);
    }
  }

  return files;
}
