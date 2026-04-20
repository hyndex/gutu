import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverPluginFacts, maturityOrder, placeholderPatterns, requiredInternalDocs, requiredRootDocs } from "./lib.mjs";

const workspaceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)), "..");
const pluginFacts = discoverPluginFacts(workspaceRoot);
const catalogReadmePath = join(workspaceRoot, "catalogs", "gutu-plugins", "README.md");

const requiredReadmeHeadings = [
  "## What It Does Now",
  "## Maturity",
  "## Verified Capability Summary",
  "## Dependency And Compatibility Summary",
  "## Capability Matrix",
  "## Quick Start For Integrators",
  "## Current Test Coverage",
  "## Known Boundaries And Non-Goals",
  "## Recommended Next Milestones"
];

const requiredDeveloperHeadings = [
  "## Purpose And Architecture Role",
  "## Repo Map",
  "## Manifest Contract",
  "## Dependency Graph And Capability Requests",
  "## Public Integration Surfaces",
  "## Hooks, Events, And Orchestration",
  "## Storage, Schema, And Migration Notes",
  "## Failure Modes And Recovery",
  "## Mermaid Flows",
  "## Integration Recipes",
  "## Test Matrix",
  "## Current Truth And Recommended Next"
];

const requiredTodoHeadings = [
  "## Shipped Now",
  "## Current Gaps",
  "## Recommended Next",
  "## Later / Optional"
];

main();

function main() {
  const failures = [];
  const maturityCounts = Object.fromEntries(maturityOrder.map((entry) => [entry, 0]));

  for (const facts of pluginFacts) {
    maturityCounts[facts.maturity] += 1;
    failures.push(...checkPluginDocs(facts));
  }

  failures.push(...checkCatalog());

  if (process.argv.includes("--json")) {
    console.log(
      JSON.stringify(
        {
          checkedPlugins: pluginFacts.length,
          failures,
          maturityCounts
        },
        null,
        2
      )
    );
    process.exit(failures.length ? 1 : 0);
  }

  console.log(`Plugin docs checked: ${pluginFacts.length}`);
  console.log(
    `Maturity counts: ${maturityOrder.map((entry) => `${entry}=${maturityCounts[entry]}`).join(", ")}`
  );
  if (failures.length) {
    console.error("Plugin docs audit failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Plugin docs audit passed.");
}

function checkPluginDocs(facts) {
  const failures = [];
  const readme = facts.docsState.root["README.md"];
  const developer = facts.docsState.root["DEVELOPER.md"];
  const todo = facts.docsState.root["TODO.md"];

  for (const file of requiredRootDocs) {
    if (!facts.docsState.root[file]?.exists) {
      failures.push(`${facts.repoName}: missing ${file}`);
    }
  }

  for (const file of requiredInternalDocs) {
    if (!facts.docsState.internal[file]?.exists) {
      failures.push(`${facts.repoName}: missing internal doc ${file}`);
    }
  }

  if (readme.exists) {
    failures.push(...missingHeadings(facts.repoName, "README.md", readme.content, requiredReadmeHeadings));
    if ((readme.content.match(/img\.shields\.io/g) || []).length < 4) {
      failures.push(`${facts.repoName}: README.md is missing the full badge row.`);
    }
    if (!readme.content.includes("**Maturity Tier:**")) {
      failures.push(`${facts.repoName}: README.md is missing the maturity declaration.`);
    }
  }

  if (developer.exists) {
    failures.push(...missingHeadings(facts.repoName, "DEVELOPER.md", developer.content, requiredDeveloperHeadings));
    if (!developer.content.includes("```mermaid")) {
      failures.push(`${facts.repoName}: DEVELOPER.md must contain Mermaid flows.`);
    }
    if (!developer.content.includes("## Hooks, Events, And Orchestration")) {
      failures.push(`${facts.repoName}: DEVELOPER.md is missing the hooks/events/orchestration section.`);
    }
  }

  if (todo.exists) {
    failures.push(...missingHeadings(facts.repoName, "TODO.md", todo.content, requiredTodoHeadings));
    if (!todo.content.includes("**Maturity Tier:**")) {
      failures.push(`${facts.repoName}: TODO.md is missing the maturity declaration.`);
    }
  }

  for (const [docName, state] of Object.entries(facts.docsState.root)) {
    failures.push(...placeholderFailures(facts.repoName, docName, state.content));
  }

  for (const [docName, state] of Object.entries(facts.docsState.internal)) {
    failures.push(...placeholderFailures(facts.repoName, `docs/${docName}`, state.content));
  }

  if (!facts.rootPackageJson.scripts?.["docs:check"]) {
    failures.push(`${facts.repoName}: root package.json is missing docs:check.`);
  }

  if (!facts.rootPackageJson.scripts?.["docs:summary"]) {
    failures.push(`${facts.repoName}: root package.json is missing docs:summary.`);
  }

  return failures;
}

function checkCatalog() {
  const failures = [];
  const catalog = readFileSync(catalogReadmePath, "utf8");

  if (!catalog.includes("# gutu-plugins")) {
    failures.push("catalogs/gutu-plugins/README.md: missing title.");
  }
  if (!catalog.includes("## Maturity Matrix")) {
    failures.push("catalogs/gutu-plugins/README.md: missing maturity matrix.");
  }

  for (const facts of pluginFacts) {
    if (!catalog.includes(facts.displayName)) {
      failures.push(`catalogs/gutu-plugins/README.md: missing ${facts.displayName}.`);
    }
    if (!catalog.includes(facts.repoName)) {
      failures.push(`catalogs/gutu-plugins/README.md: missing link for ${facts.repoName}.`);
    }
  }

  return failures;
}

function missingHeadings(repoName, fileName, content, headings) {
  return headings
    .filter((heading) => !content.includes(heading))
    .map((heading) => `${repoName}: ${fileName} is missing heading ${heading}`);
}

function placeholderFailures(repoName, fileName, content) {
  const matches = [];
  for (const pattern of placeholderPatterns) {
    if (pattern.test(content)) {
      matches.push(`${repoName}: ${fileName} still contains placeholder text matching ${pattern}`);
    }
  }
  return matches;
}
