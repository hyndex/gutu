import { spawnSync } from "node:child_process";

import { requiredReleasePathPrefixes } from "./release-config.mjs";

function normalizeArchiveEntry(entry) {
  return entry.replace(/^\.\/+/, "").replace(/\/+$/, "");
}

export function listReleaseBundleEntries(archivePath) {
  const result = spawnSync("tar", ["-tzf", archivePath], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    const message = result.stderr || result.stdout || `tar failed for '${archivePath}'.`;
    throw new Error(message.trim());
  }

  return result.stdout
    .split(/\r?\n/)
    .map((entry) => normalizeArchiveEntry(entry.trim()))
    .filter(Boolean);
}

export function assertReleaseBundleContents(archivePath) {
  const entries = listReleaseBundleEntries(archivePath);
  const missing = requiredReleasePathPrefixes.filter(
    (requiredPath) => !entries.some((entry) => entry === requiredPath || entry.startsWith(`${requiredPath}/`))
  );

  if (missing.length > 0) {
    throw new Error(
      `Release bundle '${archivePath}' is missing required framework paths: ${missing.join(", ")}`
    );
  }

  if (entries.some((entry) => entry === "packages" || entry.startsWith("packages/"))) {
    throw new Error(`Release bundle '${archivePath}' still contains stale 'packages/' paths.`);
  }

  return {
    entryCount: entries.length,
    verifiedPrefixes: [...requiredReleasePathPrefixes]
  };
}
