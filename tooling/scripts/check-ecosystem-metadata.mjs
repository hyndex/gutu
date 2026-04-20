import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildCompatibilityChannelFromCatalog,
  buildFirstPartyCatalogFromWorkspace
} from "../../framework/core/ecosystem/src/index.ts";
import { rootDir } from "./workspace-utils.mjs";

const packageJson = JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf8"));
const expectedCatalog = `${JSON.stringify(buildFirstPartyCatalogFromWorkspace(rootDir), null, 2)}\n`;
const expectedChannels = new Map(
  ["stable", "next"].map((channelId) => [
    channelId,
    `${JSON.stringify(
      buildCompatibilityChannelFromCatalog({
        catalog: JSON.parse(expectedCatalog),
        id: channelId,
        label: channelId === "stable" ? "Stable" : "Next",
        frameworkVersion: `^${packageJson.version}`
      }),
      null,
      2
    )}\n`
  ])
);

const expectedFiles = new Map([
  [path.join("ecosystem", "catalog", "first-party-packages.json"), expectedCatalog],
  ...[...expectedChannels.entries()].map(([channelId, contents]) => [
    path.join("ecosystem", "channels", `${channelId}.json`),
    contents
  ])
]);

const failures = [];

for (const [relativePath, expectedContents] of expectedFiles.entries()) {
  const absolutePath = path.join(rootDir, relativePath);
  let actualContents = "";

  try {
    actualContents = readFileSync(absolutePath, "utf8");
  } catch {
    failures.push(`${relativePath} is missing. Run \`bun run ecosystem:generate\`.`);
    continue;
  }

  if (actualContents !== expectedContents) {
    failures.push(`${relativePath} is stale. Run \`bun run ecosystem:generate\`.`);
  }
}

if (failures.length > 0) {
  console.error("Ecosystem metadata check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Ecosystem metadata is up to date.");
