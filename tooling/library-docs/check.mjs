import { join, relative } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { discoverLibraryFacts, maturityOrder, placeholderPatterns, requiredRootDocs } from "./lib.mjs";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const libraryFacts = discoverLibraryFacts(workspaceRoot);
const catalogReadmePath = join(workspaceRoot, "catalogs", "gutu-libraries", "README.md");
const failures = [];

for (const facts of libraryFacts) {
  failures.push(...checkLibraryDocs(facts));
}
failures.push(...checkCatalog());

if (process.argv.includes("--json")) {
  console.log(
    JSON.stringify(
      {
        checkedLibraries: libraryFacts.length,
        failures,
        maturityCounts: Object.fromEntries(
          maturityOrder.map((maturity) => [maturity, libraryFacts.filter((facts) => facts.maturity === maturity).length])
        )
      },
      null,
      2
    )
  );
  process.exit(failures.length > 0 ? 1 : 0);
}

console.log(`Library docs checked: ${libraryFacts.length}`);
console.log(
  `Maturity counts: ${maturityOrder
    .map((maturity) => `${maturity}=${libraryFacts.filter((facts) => facts.maturity === maturity).length}`)
    .join(", ")}`
);

if (failures.length > 0) {
  console.error("Library docs audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Library docs audit passed.");

function checkLibraryDocs(facts) {
  const localFailures = [];

  for (const doc of facts.rootDocsState) {
    if (!doc.exists) {
      localFailures.push(`${facts.repoName}: missing ${doc.filename}.`);
      continue;
    }
    if (doc.hasPlaceholder) {
      localFailures.push(`${facts.repoName}: ${doc.filename} still contains placeholder content.`);
    }
  }

  const readme = readFileSync(join(facts.repoRoot, "README.md"), "utf8");
  const developer = readFileSync(join(facts.repoRoot, "DEVELOPER.md"), "utf8");
  const todo = readFileSync(join(facts.repoRoot, "TODO.md"), "utf8");
  const rootPackage = facts.rootPackageJson;

  for (const heading of [
    "## What It Does Now",
    "## Maturity",
    "## Verified API Summary",
    "## Capability Matrix",
    "## Current Test Coverage",
    "## Known Boundaries And Non-Goals",
    "## Recommended Next Milestones"
  ]) {
    if (!readme.includes(heading)) {
      localFailures.push(`${facts.repoName}: README.md is missing '${heading}'.`);
    }
  }

  for (const heading of [
    "## Purpose And Architecture Role",
    "## Package Contract",
    "## Public API Surface",
    "## React, UI, And Extensibility Notes",
    "## Mermaid Flows",
    "## Test Matrix",
    "## Current Truth And Recommended Next"
  ]) {
    if (!developer.includes(heading)) {
      localFailures.push(`${facts.repoName}: DEVELOPER.md is missing '${heading}'.`);
    }
  }

  for (const heading of ["## Shipped Now", "## Current Gaps", "## Recommended Next", "## Later / Optional"]) {
    if (!todo.includes(heading)) {
      localFailures.push(`${facts.repoName}: TODO.md is missing '${heading}'.`);
    }
  }

  if ((readme.match(/https:\/\/img\.shields\.io\/badge\//g) || []).length < 4) {
    localFailures.push(`${facts.repoName}: README.md is missing the required local badge block.`);
  }

  if (!developer.includes("mermaid")) {
    localFailures.push(`${facts.repoName}: DEVELOPER.md is missing a Mermaid diagram.`);
  }

  if (!developer.includes("Current truth") || !developer.includes("Recommended next")) {
    localFailures.push(`${facts.repoName}: DEVELOPER.md must separate current truth from recommended next.`);
  }

  if (!rootPackage.scripts?.["docs:check"] || !rootPackage.scripts?.["docs:summary"]) {
    localFailures.push(`${facts.repoName}: root package.json is missing docs:check or docs:summary.`);
  }

  if (/This folder is the intended standalone git repository/i.test(readme)) {
    localFailures.push(`${facts.repoName}: README.md still contains the extraction stub.`);
  }

  return localFailures;
}

function checkCatalog() {
  const localFailures = [];
  const catalog = readFileSync(catalogReadmePath, "utf8");

  if (!catalog.includes("# gutu-libraries")) {
    localFailures.push("catalogs/gutu-libraries/README.md: missing title.");
  }
  if (!catalog.includes("## Library Maturity Matrix")) {
    localFailures.push("catalogs/gutu-libraries/README.md: missing maturity matrix.");
  }

  for (const facts of libraryFacts) {
    if (!catalog.includes(facts.displayName)) {
      localFailures.push(`catalogs/gutu-libraries/README.md: missing ${facts.displayName}.`);
    }
    const expectedReadmeLink = `../${relative(workspaceRoot, join(facts.repoRoot, "README.md")).replaceAll("\\", "/")}`;
    if (!catalog.includes(expectedReadmeLink)) {
      localFailures.push(`catalogs/gutu-libraries/README.md: missing README link for ${facts.repoName}.`);
    }
  }

  for (const pattern of placeholderPatterns) {
    if (pattern.test(catalog)) {
      localFailures.push("catalogs/gutu-libraries/README.md: contains placeholder content.");
    }
  }

  return localFailures;
}
