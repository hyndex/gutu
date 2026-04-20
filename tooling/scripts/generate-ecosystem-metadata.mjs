import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildCompatibilityChannelFromCatalog,
  buildFirstPartyCatalogFromWorkspace
} from "../../framework/core/ecosystem/src/index.ts";
import { rootDir } from "./workspace-utils.mjs";

const packageJson = JSON.parse(await Bun.file(path.join(rootDir, "package.json")).text());
const catalog = buildFirstPartyCatalogFromWorkspace(rootDir);
const channels = [
  buildCompatibilityChannelFromCatalog({
    catalog,
    id: "stable",
    label: "Stable",
    frameworkVersion: `^${packageJson.version}`
  }),
  buildCompatibilityChannelFromCatalog({
    catalog,
    id: "next",
    label: "Next",
    frameworkVersion: `^${packageJson.version}`
  })
];

mkdirSync(path.join(rootDir, "ecosystem", "catalog"), { recursive: true });
mkdirSync(path.join(rootDir, "ecosystem", "channels"), { recursive: true });

writeFileSync(
  path.join(rootDir, "ecosystem", "catalog", "first-party-packages.json"),
  `${JSON.stringify(catalog, null, 2)}\n`,
  "utf8"
);

for (const channel of channels) {
  writeFileSync(
    path.join(rootDir, "ecosystem", "channels", `${channel.id}.json`),
    `${JSON.stringify(channel, null, 2)}\n`,
    "utf8"
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      catalogEntries: catalog.length,
      channels: channels.map((entry) => entry.id)
    },
    null,
    2
  )
);
