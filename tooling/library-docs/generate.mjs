import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  badgeFor,
  consumptionColor,
  discoverLibraryFacts,
  maturityColor,
  requiredRootDocs,
  sortFactsByGroup,
  summarizeFacts,
  toMarkdownTable,
  uiColor,
  verificationColor
} from "./lib.mjs";
import { libraryGroupOrder } from "./profiles.mjs";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const librariesRoot = join(workspaceRoot, "libraries");
const catalogRoot = join(workspaceRoot, "catalogs", "gutu-libraries");

main();

function main() {
  const factsList = sortFactsByGroup(discoverLibraryFacts(workspaceRoot));
  for (const facts of factsList) {
    updateRootPackageJson(facts);
    ensureScripts(facts);
    writeFileSync(join(facts.repoRoot, "README.md"), renderReadme(facts));
    writeFileSync(join(facts.repoRoot, "DEVELOPER.md"), renderDeveloperGuide(facts));
    writeFileSync(join(facts.repoRoot, "TODO.md"), renderTodo(facts));
  }

  writeFileSync(join(catalogRoot, "README.md"), renderCatalog(factsList));
}

function updateRootPackageJson(facts) {
  const packageJsonPath = join(facts.repoRoot, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const nestedRelative = join("framework", "libraries", facts.packageDirName).replaceAll("\\", "/");
  const nextScripts = {
    build: `bun --cwd ${nestedRelative} run build`,
    typecheck: `bun --cwd ${nestedRelative} run typecheck`,
    lint: `bun --cwd ${nestedRelative} run lint`,
    test: `bun --cwd ${nestedRelative} run test`
  };

  for (const [scriptName] of Object.entries(facts.nestedScripts).sort(([left], [right]) => left.localeCompare(right))) {
    if (scriptName.startsWith("test:")) {
      nextScripts[scriptName] = `bun --cwd ${nestedRelative} run ${scriptName}`;
    }
  }

  nextScripts["docs:summary"] = "node scripts/docs-summary.mjs";
  nextScripts["docs:check"] = "node scripts/docs-check.mjs";

  packageJson.scripts = nextScripts;
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function ensureScripts(facts) {
  const scriptsDir = join(facts.repoRoot, "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  writeFileSync(join(scriptsDir, "docs-summary.mjs"), createSummaryScript(facts));
  writeFileSync(join(scriptsDir, "docs-check.mjs"), createDocsCheckScript(facts));
}

function renderReadme(facts) {
  const badges = [
    badgeFor("Maturity", facts.maturity, maturityColor(facts.maturity)),
    badgeFor("Verification", facts.verificationLabel, verificationColor(facts.verificationLabel)),
    badgeFor("UI", facts.uiSurface, uiColor(facts.uiSurface)),
    badgeFor("Consumption", facts.consumptionModel, consumptionColor(facts.consumptionModel))
  ];

  const runtimeSymbol = pickRuntimeSymbol(facts);
  const quickStartImports = runtimeSymbol
    ? `import { packageId, packageDisplayName, ${runtimeSymbol.name} } from "${facts.nestedPackageName}";`
    : `import { packageId, packageDisplayName } from "${facts.nestedPackageName}";`;
  const quickStartBody = runtimeSymbol
    ? `console.log(packageId, packageDisplayName, typeof ${runtimeSymbol.name});`
    : "console.log(packageId, packageDisplayName);";

  const capabilityRows = [
    ["Public Modules", facts.publicModules.length, facts.publicModules.length ? facts.publicModules.map((entry) => `\`${entry}\``).join(", ") : "No module re-exports detected"],
    ["Named Exports", facts.exportedSymbols.length, facts.exportedSymbols.length ? facts.exportedSymbols.slice(0, 8).map((entry) => `\`${entry.name}\``).join(", ") : "No named exports detected"],
    ["UI Surface", facts.uiSurface, facts.reactDependency ? "React-aware surface detected" : "Headless typed helpers"],
    ["Tests", facts.tests.totalFiles, facts.verificationLabel]
  ];

  const dependencyRows = [
    ["Package Name", `\`${facts.nestedPackageName}\``],
    ["Direct Dependencies", facts.dependencies.length ? facts.dependencies.map((entry) => `\`${entry}\``).join(", ") : "None"],
    ["Peer Dependencies", facts.peerDependencies.length ? facts.peerDependencies.map((entry) => `\`${entry}\``).join(", ") : "None"],
    ["React Runtime", facts.reactDependency ? "Yes" : "No"],
    ["Workspace Requirement", facts.dependencies.some((entry) => entry.startsWith("@platform/") || entry.startsWith("@plugins/")) ? "Compatible Gutu workspace required" : "Standalone dependency graph is self-contained"]
  ];

  return `# ${facts.displayName}

${facts.description}

${badges.join(" ")}

## What It Does Now

${facts.currentCapabilities.map((entry) => `- ${entry}`).join("\n")}

## Maturity

**Maturity Tier:** \`${facts.maturity}\`

Why this tier:
- Group: **${facts.profile.group}**
- Public modules: ${facts.publicModules.length}
- Named exports: ${facts.exportedSymbols.length}
- Test files: ${facts.tests.totalFiles}
- Contract lane: ${facts.tests.byLane.contracts.length ? "present" : "not present"}

## Verified API Summary

${toMarkdownTable(["Field", "Value"], [
    ["Package ID", `\`${facts.packageId}\``],
    ["Import Name", `\`${facts.nestedPackageName}\``],
    ["UI Surface", facts.uiSurface],
    ["Consumption Model", facts.consumptionModel],
    ["Verification", facts.verificationLabel]
  ])}

## Dependency And Compatibility Summary

${toMarkdownTable(["Field", "Value"], dependencyRows)}

## Capability Matrix

${toMarkdownTable(["Capability", "Count / Mode", "Notes"], capabilityRows)}

## Quick Start For Integrators

Use this repo inside a **compatible Gutu workspace** or the **ecosystem certification workspace** so its \`workspace:*\` dependencies resolve honestly.

\`\`\`bash
# from a compatible workspace that already includes this library's dependency graph
bun install
bun run build
bun run test
bun run docs:check
\`\`\`

\`\`\`ts
${quickStartImports}

${quickStartBody}
\`\`\`

Use the root repo scripts for day-to-day work after the workspace is bootstrapped, or run the nested package directly from \`framework/libraries/${facts.packageDirName}\` if you need lower-level control.

## Current Test Coverage

${facts.verificationCommands.map((entry) => `- \`${entry}\``).join("\n")}
- Unit files: ${facts.tests.byLane.unit.length}
- Contract files: ${facts.tests.byLane.contracts.length}
- Integration files: ${facts.tests.byLane.integration.length}
- Migration files: ${facts.tests.byLane.migrations.length}

## Known Boundaries And Non-Goals

${facts.nonGoals.map((entry) => `- ${entry}`).join("\n")}
- This library should be consumed through explicit imports, providers, callbacks, and typed helpers rather than undocumented global hooks.

## Recommended Next Milestones

${facts.recommendedNext.map((entry) => `- ${entry}`).join("\n")}

## More Docs

- [Developer Guide](./DEVELOPER.md)
- [TODO](./TODO.md)
- [Security](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)
`;
}

function renderDeveloperGuide(facts) {
  const manifestRows = [
    ["Package ID", `\`${facts.packageId}\``],
    ["Display Name", facts.displayName],
    ["Import Name", `\`${facts.nestedPackageName}\``],
    ["Version", `\`${facts.nestedPackageJson.version}\``],
    ["UI Surface", facts.uiSurface],
    ["Consumption Model", facts.consumptionModel]
  ];

  const dependencyRows = [
    ["Direct Dependencies", facts.dependencies.length ? facts.dependencies.map((entry) => `\`${entry}\``).join(", ") : "None"],
    ["Peer Dependencies", facts.peerDependencies.length ? facts.peerDependencies.map((entry) => `\`${entry}\``).join(", ") : "None"],
    ["Dev Dependencies", facts.devDependencies.length ? facts.devDependencies.map((entry) => `\`${entry}\``).join(", ") : "None"],
    ["React Runtime", facts.reactDependency ? "Yes" : "No"],
    ["Workspace Scoped", facts.dependencies.some((entry) => entry.startsWith("@platform/") || entry.startsWith("@plugins/")) ? "Yes" : "No"]
  ];

  const publicApiRows = facts.moduleFacts.map((entry) => [
    `\`${entry.modulePath}\``,
    `\`${entry.fileRelative}\``,
    entry.exports.length ? entry.exports.slice(0, 8).map((symbol) => `\`${symbol.name}\``).join(", ") : "No named exports detected"
  ]);

  const sourceRows = facts.sourceFiles.map((entry) => [
    `\`${entry.path}\``,
    entry.exports.length ? entry.exports.slice(0, 8).map((symbol) => `\`${symbol.name}\``).join(", ") : "No exports detected"
  ]);

  const runtimeSymbol = pickRuntimeSymbol(facts);
  const importNames = runtimeSymbol
    ? `packageId, packageDisplayName, ${runtimeSymbol.name}`
    : "packageId, packageDisplayName";

  return `# ${facts.displayName} Developer Guide

${facts.description}

**Maturity Tier:** \`${facts.maturity}\`

## Purpose And Architecture Role

${facts.profile.architectureRole}

### This library is the right fit when

- You need **${facts.profile.focusAreas.join("**, **")}** as a reusable, package-level boundary.
- You want to consume typed exports from \`${facts.nestedPackageName}\` instead of reaching into app-specific internals.
- You want documentation, verification, and package boundaries to stay aligned in the extracted-repo model.

### This library is intentionally not

${facts.nonGoals.map((entry) => `- ${entry}`).join("\n")}

## Repo Map

${toMarkdownTable(["Path", "Purpose"], [
    ["`package.json`", "Root extracted-repo manifest, workspace wiring, and repo-level script entrypoints."],
    [`\`${facts.packageRepoRelative}\``, "Nested publishable library package."],
    [`\`${facts.packageRepoRelative}/src\``, "Public runtime source and exported modules."],
    [`\`${facts.packageRepoRelative}/tests\``, "Unit and contract verification where present."]
  ])}

## Package Contract

${toMarkdownTable(["Field", "Value"], manifestRows)}

## Dependency Graph And Compatibility

${toMarkdownTable(["Field", "Value"], dependencyRows)}

### Dependency interpretation

- Direct dependencies describe what the library needs at runtime to satisfy its public exports.
- Workspace-scoped dependencies mean extracted repos should be consumed through a compatible Gutu workspace or vendor-synced environment.
- Peer dependencies should be satisfied by the host when the library is integrated outside the certification workspace.

## Public API Surface

${toMarkdownTable(["Module", "File", "Named Exports"], publicApiRows)}

### Source module map

${toMarkdownTable(["Source File", "Exported Symbols"], sourceRows)}

## React, UI, And Extensibility Notes

- UI surface: **${facts.uiSurface}**
- Consumption model: **${facts.consumptionModel}**
- Extensibility points: explicit imports, props, callbacks, registries, providers, and typed helper APIs.
- This repo must **not** be documented as exposing a generic WordPress-style hook bus unless such a hook surface is explicitly exported through the public entrypoint.

## Failure Modes And Recovery

- Version drift between extracted repos can surface as missing \`workspace:*\` dependency resolution. Use a compatible Gutu workspace or vendor lock when integrating.
- Hosts should import from \`${facts.nestedPackageName}\`, not deep internal file paths, so refactors inside \`src/\` do not become accidental breaking changes.
- React-facing hosts should mount providers, registries, and callback surfaces exactly as documented by the public exports instead of depending on internal implementation details.
- When a host needs orchestration, keep it in the surrounding application or plugin runtime; this library does not promise hidden side effects outside what its public API exports.

## Mermaid Flows

### Primary Consumption Flow

\`\`\`mermaid
graph TD
  host["Host app or plugin"] --> import["Import from ${facts.nestedPackageName}"]
  import --> api["Public modules and named exports"]
  api --> compose["Compose ${facts.uiSurface.toLowerCase()}"]
  compose --> verify["Verify with build, test, and docs checks"]
\`\`\`

## Integration Recipes

### 1. Package identity

\`\`\`ts
import { ${importNames} } from "${facts.nestedPackageName}";

console.log(packageId, packageDisplayName);
${runtimeSymbol ? `console.log(typeof ${runtimeSymbol.name});` : ""}
\`\`\`

### 2. Safe consumption pattern

- Import from the package entrypoint, not \`src/\` internals.
- Compose through documented modules such as ${facts.publicModules.length ? facts.publicModules.map((entry) => `\`${entry}\``).join(", ") : "the exported entrypoint constants"}.
- Let host applications own orchestration, persistence, and cross-package business logic unless this library explicitly exports those concerns.

### 3. Cross-package composition

- Pair this library with sibling packages through typed imports and documented contracts, not hidden globals.
- If a plugin or app depends on this library, keep compatibility pinned through the workspace lock/vendor flow.
- Treat this library as a reusable foundation layer, not as a substitute for domain ownership.

## Test Matrix

${toMarkdownTable(["Lane", "Present", "Evidence"], [
    ["Build", facts.nestedScripts.build ? "Yes" : "No", facts.nestedScripts.build ? "`bun run build`" : "No build script exported"],
    ["Typecheck", facts.nestedScripts.typecheck ? "Yes" : "No", facts.nestedScripts.typecheck ? "`bun run typecheck`" : "No typecheck script exported"],
    ["Lint", facts.nestedScripts.lint ? "Yes" : "No", facts.nestedScripts.lint ? "`bun run lint`" : "No lint script exported"],
    ["Test", facts.nestedScripts.test ? "Yes" : "No", facts.nestedScripts.test ? "`bun run test`" : "No test script exported"],
    ["Unit", facts.tests.byLane.unit.length ? "Yes" : "No", facts.tests.byLane.unit.length ? `${facts.tests.byLane.unit.length} file(s)` : "No unit files found"],
    ["Contracts", facts.tests.byLane.contracts.length ? "Yes" : "No", facts.tests.byLane.contracts.length ? `${facts.tests.byLane.contracts.length} file(s)` : "No contract files found"],
    ["Integration", facts.tests.byLane.integration.length ? "Yes" : "No", facts.tests.byLane.integration.length ? `${facts.tests.byLane.integration.length} file(s)` : "No integration files found"],
    ["Migrations", facts.tests.byLane.migrations.length ? "Yes" : "No", facts.tests.byLane.migrations.length ? `${facts.tests.byLane.migrations.length} file(s)` : "No migration files found"]
  ])}

### Verification commands

${facts.verificationCommands.map((entry) => `- \`${entry}\``).join("\n")}

## Current Truth And Recommended Next

### Current truth

${facts.currentCapabilities.map((entry) => `- ${entry}`).join("\n")}

### Current gaps

${facts.currentGaps.length ? facts.currentGaps.map((entry) => `- ${entry}`).join("\n") : "- No extra gaps were discovered beyond the library's declared boundaries."}

### Recommended next

${facts.recommendedNext.map((entry) => `- ${entry}`).join("\n")}

### Later / optional

${facts.laterOptional.map((entry) => `- ${entry}`).join("\n")}
`;
}

function renderTodo(facts) {
  return `# ${facts.displayName} TODO

**Maturity Tier:** \`${facts.maturity}\`

## Shipped Now

${facts.currentCapabilities.map((entry) => `- ${entry}`).join("\n")}

## Current Gaps

${facts.currentGaps.length ? facts.currentGaps.map((entry) => `- ${entry}`).join("\n") : "- No additional gaps were identified beyond the library's stated non-goals."}

## Recommended Next

${facts.recommendedNext.map((entry) => `- ${entry}`).join("\n")}

## Later / Optional

${facts.laterOptional.map((entry) => `- ${entry}`).join("\n")}
`;
}

function renderCatalog(factsList) {
  const grouped = Object.fromEntries(libraryGroupOrder.map((group) => [group, factsList.filter((facts) => facts.profile.group === group)]));

  const matrixRows = factsList.map((facts) => [
    `[${facts.displayName}](../${facts.repoRelative}/README.md)`,
    facts.profile.group,
    facts.maturity,
    facts.verificationLabel,
    facts.uiSurface,
    facts.consumptionModel,
    `[Developer](../${facts.repoRelative}/DEVELOPER.md)`
  ]);

  const sections = libraryGroupOrder
    .map((group) => {
      const entries = grouped[group];
      if (!entries.length) {
        return "";
      }

      return `## ${group}

${toMarkdownTable(
        ["Library", "Maturity", "Verification", "UI", "Consumption", "Highlights"],
        entries.map((facts) => [
          `[${facts.displayName}](../${facts.repoRelative}/README.md)`,
          facts.maturity,
          facts.verificationLabel,
          facts.uiSurface,
          facts.consumptionModel,
          facts.profile.focusAreas.join(", ")
        ])
      )}`;
    })
    .filter(Boolean)
    .join("\n\n");

  return `# gutu-libraries

Catalog repository for first-party Gutu libraries.

This catalog is a **truth-first index** for the extracted library ecosystem. The badges and maturity labels referenced here are local-status documentation badges backed by repo facts, not live npm or GitHub Actions badges.

## Library Maturity Matrix

${toMarkdownTable(["Library", "Domain", "Maturity", "Verification", "UI", "Consumption", "Docs"], matrixRows)}

${sections}

## Catalog Notes

- Every library repo is expected to publish a public \`README.md\`, a deep \`DEVELOPER.md\`, and a repo-local \`TODO.md\`.
- Libraries should describe imports, providers, callbacks, and typed helpers honestly rather than implying undocumented global hooks.
- Split-repo consumption still relies on the Gutu workspace/vendor model when \`workspace:*\` dependencies are present.
`;
}

function createSummaryScript(facts) {
  return `#!/usr/bin/env node
const summary = ${JSON.stringify(summarizeFacts(facts), null, 2)};
console.log(JSON.stringify(summary, null, 2));
`;
}

function createDocsCheckScript(facts) {
  const placeholderPatterns = [
    /This folder is the intended standalone git repository/i,
    /_Document\\b[^_]*_/i,
    /_Explain\\b[^_]*_/i,
    /_Describe\\b[^_]*_/i
  ];

  return `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredDocs = ${JSON.stringify(requiredRootDocs)};
const placeholderPatterns = [${placeholderPatterns.map((pattern) => pattern.toString()).join(", ")}];
const failures = [];

for (const doc of requiredDocs) {
  const target = path.join(root, doc);
  if (!fs.existsSync(target)) {
    failures.push(\`\${doc} is missing.\`);
    continue;
  }

  const content = fs.readFileSync(target, "utf8");
  for (const pattern of placeholderPatterns) {
    if (pattern.test(content)) {
      failures.push(\`\${doc} still contains placeholder content matching \${pattern}.\`);
    }
  }
}

const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
for (const heading of ["## What It Does Now", "## Maturity", "## Verified API Summary", "## Capability Matrix", "## Current Test Coverage", "## Recommended Next Milestones"]) {
  if (!readme.includes(heading)) {
    failures.push(\`README.md is missing heading '\${heading}'.\`);
  }
}
if ((readme.match(/https:\\/\\/img\\.shields\\.io\\/badge\\//g) || []).length < 4) {
  failures.push("README.md is missing the required local badge block.");
}

const developer = fs.readFileSync(path.join(root, "DEVELOPER.md"), "utf8");
for (const heading of ["## Purpose And Architecture Role", "## Package Contract", "## Public API Surface", "## React, UI, And Extensibility Notes", "## Mermaid Flows", "## Test Matrix", "## Current Truth And Recommended Next"]) {
  if (!developer.includes(heading)) {
    failures.push(\`DEVELOPER.md is missing heading '\${heading}'.\`);
  }
}
if (!developer.includes("mermaid")) {
  failures.push("DEVELOPER.md is missing a Mermaid diagram.");
}

const todo = fs.readFileSync(path.join(root, "TODO.md"), "utf8");
for (const heading of ["## Shipped Now", "## Current Gaps", "## Recommended Next", "## Later / Optional"]) {
  if (!todo.includes(heading)) {
    failures.push(\`TODO.md is missing heading '\${heading}'.\`);
  }
}

if (failures.length > 0) {
  console.error("Library docs check failed:");
  for (const failure of failures) {
    console.error(\`- \${failure}\`);
  }
  process.exit(1);
}

console.log("Library docs check passed.");
`;
}

function pickRuntimeSymbol(facts) {
  return (
    facts.exportedSymbols.find((entry) =>
      ["const", "function", "class", "enum", "symbol"].includes(entry.kind) &&
      !["packageId", "packageDisplayName", "packageDescription"].includes(entry.name)
    ) ?? null
  );
}
