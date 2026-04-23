import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { businessPackCatalogSpec, businessPackSpecs, businessPluginSpecs } from "./specs.mjs";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mascotSourcePath = join(workspaceRoot, "docs", "assets", "gutu-mascot.png");
const licenseSourcePath = join(workspaceRoot, "plugins", "gutu-plugin-payments-core", "LICENSE");

main();

function main() {
  for (const spec of businessPluginSpecs) {
    scaffoldBusinessPlugin(spec);
  }
  scaffoldBusinessPackCatalog(businessPackCatalogSpec, businessPackSpecs);

  console.log(
    `Scaffolded ${businessPluginSpecs.length} business plugin repos and ${businessPackSpecs.length} business packs.`
  );
}

function scaffoldBusinessPlugin(spec) {
  const repoRoot = join(workspaceRoot, "plugins", spec.repoName);
  const packageRoot = join(repoRoot, "framework", "builtin-plugins", spec.packageDir);
  const docsAssetsRoot = join(repoRoot, "docs", "assets");
  const packageDocsRoot = join(packageRoot, "docs");
  const packagePacksRoot = join(packageRoot, "packs", `${spec.packageDir}-${spec.packType}`);
  const testsRoot = join(packageRoot, "tests");
  const symbolBase = toPascalCase(spec.packageDir);
  const sqlPrefix = spec.packageDir.replaceAll("-", "_");
  const primaryTableName = `${sqlPrefix}_primary_records`;
  const secondaryTableName = `${sqlPrefix}_secondary_records`;
  const exceptionTableName = `${sqlPrefix}_exception_records`;

  mkdirSync(join(packageRoot, "src", "actions"), { recursive: true });
  mkdirSync(join(packageRoot, "src", "domain"), { recursive: true });
  mkdirSync(join(packageRoot, "src", "exceptions"), { recursive: true });
  mkdirSync(join(packageRoot, "src", "flows"), { recursive: true });
  mkdirSync(join(packageRoot, "src", "reports"), { recursive: true });
  mkdirSync(join(packageRoot, "src", "resources"), { recursive: true });
  mkdirSync(join(packageRoot, "src", "scenarios"), { recursive: true });
  mkdirSync(join(packageRoot, "src", "services"), { recursive: true });
  mkdirSync(join(packageRoot, "src", "settings"), { recursive: true });
  mkdirSync(join(packageRoot, "src", "jobs"), { recursive: true });
  mkdirSync(join(packageRoot, "src", "workflows"), { recursive: true });
  mkdirSync(join(packageRoot, "src", "ui", "admin"), { recursive: true });
  mkdirSync(join(packageRoot, "db"), { recursive: true });
  mkdirSync(join(repoRoot, "scripts"), { recursive: true });
  mkdirSync(join(testsRoot, "unit"), { recursive: true });
  mkdirSync(join(testsRoot, "contracts"), { recursive: true });
  mkdirSync(join(testsRoot, "integration"), { recursive: true });
  mkdirSync(join(testsRoot, "migrations"), { recursive: true });
  mkdirSync(packageDocsRoot, { recursive: true });
  mkdirSync(join(packagePacksRoot, "objects", "settings"), { recursive: true });
  mkdirSync(join(packagePacksRoot, "objects", "reports"), { recursive: true });
  mkdirSync(join(packagePacksRoot, "objects", "automations"), { recursive: true });
  mkdirSync(join(packagePacksRoot, "objects", "workflows"), { recursive: true });
  mkdirSync(join(packagePacksRoot, "tests"), { recursive: true });
  mkdirSync(docsAssetsRoot, { recursive: true });

  if (existsSync(mascotSourcePath)) {
    copyFileSync(mascotSourcePath, join(docsAssetsRoot, "gutu-mascot.png"));
  }
  if (existsSync(licenseSourcePath)) {
    copyFileSync(licenseSourcePath, join(repoRoot, "LICENSE"));
  }

  write(repoRoot, ".gitignore", renderGitIgnore());
  write(repoRoot, "CODEOWNERS", "* @chinmoybhuyan\n");
  write(repoRoot, "CONTRIBUTING.md", renderContributing());
  write(repoRoot, "SECURITY.md", renderSecurity());
  write(repoRoot, "bunfig.toml", "[test]\nroot = \".\"\n");
  write(repoRoot, "eslint.config.mjs", renderEslintConfig());
  write(repoRoot, "tsconfig.base.json", renderRootTsconfig());
  write(repoRoot, "package.json", renderRootPackageJson(spec));
  write(repoRoot, "scripts/docs-summary.mjs", renderRepoDocsSummaryScript());
  write(repoRoot, "scripts/docs-check.mjs", renderRepoDocsCheckScript());

  write(packageRoot, "package.json", renderNestedPackageJson(spec));
  write(packageRoot, "package.ts", renderPackageManifest(spec));
  write(packageRoot, "tsconfig.json", renderNestedTsconfig());
  write(packageRoot, "tsconfig.build.json", renderNestedBuildTsconfig());
  write(packageRoot, "db/schema.ts", renderDbSchema(primaryTableName, secondaryTableName, exceptionTableName));
  write(packageRoot, "src/domain/catalog.ts", renderDomainCatalog(spec));
  write(packageRoot, "src/exceptions/catalog.ts", renderExceptionCatalog(spec));
  write(packageRoot, "src/flows/catalog.ts", renderFlowCatalog(spec));
  write(packageRoot, "src/model.ts", renderModel());
  write(
    packageRoot,
    "src/actions/default.action.ts",
    renderActions(spec)
  );
  write(packageRoot, "src/reports/catalog.ts", renderReportCatalog(spec));
  write(
    packageRoot,
    "src/resources/main.resource.ts",
    renderResources(spec)
  );
  write(packageRoot, "src/scenarios/catalog.ts", renderScenarioCatalog(spec));
  write(
    packageRoot,
    "src/services/main.service.ts",
    renderServices(spec)
  );
  write(packageRoot, "src/settings/catalog.ts", renderSettingsSurfaceCatalog(spec));
  write(packageRoot, "src/jobs/catalog.ts", renderJobs(spec));
  write(packageRoot, "src/workflows/catalog.ts", renderWorkflows(spec));
  write(packageRoot, "src/ui/surfaces.ts", renderUiSurface(spec));
  write(packageRoot, "src/ui/admin.contributions.ts", renderAdminContributions(spec));
  write(packageRoot, "src/ui/admin/main.page.tsx", renderAdminPage(spec));
  write(
    packageRoot,
    "src/postgres.ts",
    renderPostgresSql(spec, symbolBase, sqlPrefix)
  );
  write(
    packageRoot,
    "src/sqlite.ts",
    renderSqliteSql(spec, symbolBase, sqlPrefix)
  );
  write(packageRoot, "src/index.ts", renderIndex(spec, symbolBase));

  write(packageRoot, "tests/unit/package.test.ts", renderUnitTest(spec));
  write(packageRoot, "tests/contracts/ui-surface.test.ts", renderUiContractTest(spec));
  write(packageRoot, "tests/integration/lifecycle.test.ts", renderIntegrationTest(spec));
  write(packageRoot, "tests/migrations/postgres.test.ts", renderPostgresMigrationTest(spec, symbolBase, sqlPrefix));
  write(packageRoot, "tests/migrations/sqlite.test.ts", renderSqliteMigrationTest(spec, symbolBase, sqlPrefix));

  write(packagePacksRoot, "pack.json", renderPackManifest(spec));
  write(packagePacksRoot, "dependencies.json", renderPackDependencies(spec));
  write(packagePacksRoot, "signatures.json", renderPackSignatures(spec));
  write(
    packagePacksRoot,
    "objects/settings/defaults.json",
    renderPackDefaults(spec)
  );
  write(
    packagePacksRoot,
    "objects/reports/overview.json",
    renderPackReports(spec)
  );
  write(
    packagePacksRoot,
    "objects/automations/reconciliation.json",
    renderPackAutomation(spec)
  );
  write(
    packagePacksRoot,
    `objects/workflows/${spec.workflow.id}.json`,
    renderPackWorkflow(spec)
  );
  write(packagePacksRoot, "tests/validation.json", renderPackValidation(spec));
}

function scaffoldBusinessPackCatalog(catalogSpec, packSpecs) {
  const repoRoot = join(workspaceRoot, "catalogs", catalogSpec.repoName);
  const docsAssetsRoot = join(repoRoot, "docs", "assets");

  mkdirSync(join(repoRoot, "scripts"), { recursive: true });
  mkdirSync(join(repoRoot, "catalog"), { recursive: true });
  mkdirSync(join(repoRoot, "channels"), { recursive: true });
  mkdirSync(docsAssetsRoot, { recursive: true });

  if (existsSync(mascotSourcePath)) {
    copyFileSync(mascotSourcePath, join(docsAssetsRoot, "gutu-mascot.png"));
  }
  if (existsSync(licenseSourcePath)) {
    copyFileSync(licenseSourcePath, join(repoRoot, "LICENSE"));
  }

  write(repoRoot, ".gitignore", renderGitIgnore());
  write(repoRoot, "CODEOWNERS", "* @chinmoybhuyan\n");
  write(repoRoot, "CONTRIBUTING.md", renderContributing());
  write(repoRoot, "SECURITY.md", renderSecurity());
  write(repoRoot, "package.json", renderPackCatalogPackageJson(catalogSpec));
  write(repoRoot, "README.md", renderPackCatalogReadme(catalogSpec, packSpecs));
  write(repoRoot, "DEVELOPER.md", renderPackCatalogDeveloper(catalogSpec, packSpecs));
  write(repoRoot, "TODO.md", renderPackCatalogTodo(catalogSpec, packSpecs));
  write(repoRoot, "scripts/validate-pack-catalog.mjs", renderPackCatalogValidateScript(packSpecs));
  write(repoRoot, "scripts/sign-pack-catalog.mjs", renderPackCatalogSignScript(packSpecs));
  write(repoRoot, "scripts/promote-pack-channel.mjs", renderPackCatalogPromoteScript(packSpecs));
  write(repoRoot, "catalog/index.json", renderPackCatalogIndex(catalogSpec, packSpecs));
  write(repoRoot, "channels/next.json", renderPackCatalogChannel("next", catalogSpec, packSpecs));
  write(repoRoot, "channels/stable.json", renderPackCatalogChannel("stable", catalogSpec, []));

  for (const spec of packSpecs) {
    const packRoot = join(repoRoot, "packs", spec.id);
    mkdirSync(join(packRoot, "objects", "settings"), { recursive: true });
    mkdirSync(join(packRoot, "objects", "workflows"), { recursive: true });
    mkdirSync(join(packRoot, "objects", "dashboards"), { recursive: true });
    mkdirSync(join(packRoot, "objects", "reports"), { recursive: true });
    mkdirSync(join(packRoot, "objects", "automations"), { recursive: true });
    mkdirSync(join(packRoot, "tests"), { recursive: true });

    write(packRoot, "README.md", renderPackReadme(spec));
    write(packRoot, "package.ts", renderPackPackageManifest(spec, catalogSpec));
    write(packRoot, "pack.json", renderBusinessPackManifest(spec));
    write(packRoot, "dependencies.json", renderBusinessPackDependencies(spec));
    write(packRoot, "signatures.json", renderBusinessPackSignatures(spec));
    write(packRoot, "objects/settings/defaults.json", renderBusinessPackSettings(spec));
    write(packRoot, "objects/workflows/default.json", renderBusinessPackWorkflow(spec));
    write(packRoot, "objects/dashboards/overview.json", renderBusinessPackDashboard(spec));
    write(packRoot, "objects/reports/overview.json", renderBusinessPackReports(spec));
    write(packRoot, "objects/automations/default.json", renderBusinessPackAutomation(spec));
    write(packRoot, "tests/validation.json", renderBusinessPackValidation(spec));
  }
}

function write(root, relativePath, contents) {
  const filePath = join(root, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents, "utf8");
}

function dedupeList(values) {
  return [...new Set((values ?? []).filter(Boolean))];
}

function resolveOrchestrationTargets(spec) {
  const defaults = {
    create: [],
    advance: ["traceability.links.record"],
    reconcile: ["traceability.reconciliation.queue"]
  };

  const overrides = {
    "crm-core": {
      reconcile: ["sales.quotes.create", "traceability.links.record"]
    },
    "sales-core": {
      advance: ["inventory.reservations.allocate", "traceability.links.record"],
      reconcile: ["accounting.billing.post", "traceability.reconciliation.queue"]
    },
    "procurement-core": {
      advance: ["inventory.receipts.record", "traceability.links.record"],
      reconcile: ["accounting.billing.post", "traceability.reconciliation.queue"]
    },
    "projects-core": {
      reconcile: ["accounting.billing.post", "traceability.reconciliation.queue"]
    },
    "support-service-core": {
      reconcile: ["inventory.transfers.request", "traceability.reconciliation.queue"]
    },
    "pos-core": {
      reconcile: ["accounting.billing.post", "traceability.reconciliation.queue"]
    },
    "manufacturing-core": {
      advance: ["inventory.transfers.request", "traceability.links.record"],
      reconcile: ["traceability.reconciliation.queue"]
    },
    "hr-payroll-core": {
      reconcile: ["accounting.billing.post", "traceability.reconciliation.queue"]
    },
    "contracts-core": {
      reconcile: ["accounting.billing.post", "traceability.reconciliation.queue"]
    },
    "subscriptions-core": {
      reconcile: ["accounting.billing.post", "traceability.reconciliation.queue"]
    },
    "business-portals-core": {
      advance: ["sales.quotes.create", "support.tickets.create"]
    },
    "field-service-core": {
      advance: ["support.service-orders.dispatch", "inventory.transfers.request"],
      reconcile: ["accounting.billing.post", "traceability.reconciliation.queue"]
    },
    "maintenance-cmms-core": {
      advance: ["support.service-orders.dispatch", "inventory.transfers.request"],
      reconcile: ["traceability.reconciliation.queue"]
    },
    "treasury-core": {
      reconcile: ["accounting.payments.allocate", "traceability.reconciliation.queue"]
    },
    "e-invoicing-core": {
      reconcile: ["accounting.billing.post", "traceability.reconciliation.queue"]
    },
    "analytics-bi-core": {
      reconcile: ["traceability.reconciliation.queue"]
    },
    "ai-assist-core": {
      reconcile: ["crm.handoffs.prepare", "support.tickets.create", "traceability.links.record"]
    }
  };

  return {
    ...defaults,
    ...(overrides[spec.id] ?? {})
  };
}

function renderRootPackageJson(spec) {
  return `${JSON.stringify(
    {
      name: spec.repoName,
      private: true,
      type: "module",
      workspaces: ["framework/builtin-plugins/*"],
      scripts: {
        build: `cd framework/builtin-plugins/${spec.packageDir} && bun run build`,
        typecheck: `cd framework/builtin-plugins/${spec.packageDir} && bun run typecheck`,
        lint: `cd framework/builtin-plugins/${spec.packageDir} && bun run lint`,
        test: `cd framework/builtin-plugins/${spec.packageDir} && bun run test`,
        "docs:summary": "node scripts/docs-summary.mjs",
        "docs:check": "node scripts/docs-check.mjs",
        ci: "bun run build && bun run typecheck && bun run lint && bun run test && bun run docs:check"
      },
      gutuEcosystem: {
        defaultChannel: "next",
        primaryPackage: spec.packageDir
      },
      devDependencies: {
        "@eslint/js": "^9.39.4",
        "bun-types": "^1.3.13",
        "drizzle-orm": "^0.45.2",
        eslint: "^9.39.4",
        globals: "^16.5.0",
        react: "^19.1.0",
        "react-dom": "^19.1.0",
        typescript: "5.8.3",
        "typescript-eslint": "^8.58.2",
        zod: "^4.0.0"
      }
    },
    null,
    2
  )}\n`;
}

function renderRepoDocsCheckScript() {
  return `#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const failures = [];
const requiredFiles = [
  "README.md",
  "DEVELOPER.md",
  "TODO.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "framework",
  "docs/assets/gutu-mascot.png"
];

for (const relativePath of requiredFiles) {
  if (!existsSync(join(repoRoot, relativePath))) {
    failures.push(\`Missing required repo artifact: \${relativePath}\`);
  }
}

const readmePath = join(repoRoot, "README.md");
if (existsSync(readmePath)) {
  const readme = readFileSync(readmePath, "utf8");
  for (const heading of [
    "## Part Of The Gutu Stack",
    "## What It Does Now",
    "## Quick Start For Integrators",
    "## Known Boundaries And Non-Goals"
  ]) {
    if (!readme.includes(heading)) {
      failures.push(\`README.md is missing heading '\${heading}'.\`);
    }
  }
}

if (failures.length > 0) {
  console.error("Repo docs check failed:");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("repo docs ok");
`;
}

function renderRepoDocsSummaryScript() {
  return `#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const summary = {
  repo: repoRoot.split("/").at(-1),
  docs: ["README.md", "DEVELOPER.md", "TODO.md", "SECURITY.md", "CONTRIBUTING.md"].filter((relativePath) =>
    existsSync(join(repoRoot, relativePath))
  ),
  generatedAt: new Date().toISOString()
};

const readmePath = join(repoRoot, "README.md");
if (existsSync(readmePath)) {
  const readme = readFileSync(readmePath, "utf8");
  summary.headings = readme
    .split("\\n")
    .filter((line) => line.startsWith("## "))
    .slice(0, 8);
}

console.log(JSON.stringify(summary, null, 2));
`;
}

function renderNestedPackageJson(spec) {
  const dependencies = {
    "@platform/admin-contracts": "workspace:*",
    "@platform/business-runtime": "workspace:*",
    "@platform/jobs": "workspace:*",
    "@platform/kernel": "workspace:*",
    "@platform/schema": "workspace:*",
    "@platform/ui-shell": "workspace:*",
    "drizzle-orm": "^0.45.2",
    react: "^19.1.0",
    zod: "^4.0.0"
  };

  for (const dependency of spec.dependsOn) {
    dependencies[`@plugins/${dependency}`] = "workspace:*";
  }

  return `${JSON.stringify(
    {
      name: `@plugins/${spec.packageDir}`,
      version: "0.1.0",
      private: false,
      type: "module",
      main: "./dist/src/index.js",
      types: "./dist/src/index.d.ts",
      exports: {
        ".": {
          types: "./dist/src/index.d.ts",
          default: "./dist/src/index.js"
        }
      },
      scripts: {
        build: "bunx tsc -p tsconfig.build.json",
        typecheck: "bunx tsc -p tsconfig.json --noEmit",
        lint: "bunx eslint package.ts src db tests",
        test: "bun test",
        "test:unit": "bun test tests/unit",
        "test:contracts": "bun test tests/contracts",
        ci: "bun run build && bun run typecheck && bun run lint && bun run test"
      },
      dependencies
    },
    null,
    2
  )}\n`;
}

function renderPackageManifest(spec) {
  const dependencyContracts = spec.dependsOn.map((packageId) => ({
    packageId,
    class: "required",
    rationale: `Required for ${spec.displayName} to keep its boundary governed and explicit.`
  }));

  return `import { definePackage } from "@platform/kernel";

export default definePackage(${JSON.stringify(
    {
      id: spec.id,
      kind: spec.kind,
      version: "0.1.0",
      contractVersion: "1.0.0",
      sourceRepo: spec.repoName,
      displayName: spec.displayName,
      domainGroup: spec.domainGroup ?? "Operational Data",
      defaultCategory: spec.defaultCategory,
      description: spec.description,
      extends: [],
      dependsOn: spec.dependsOn,
      dependencyContracts,
      optionalWith: [],
      conflictsWith: [],
      providesCapabilities: spec.providesCapabilities,
      requestedCapabilities: spec.requestedCapabilities,
      ownsData: spec.ownsData,
      extendsData: [],
      publicCommands: spec.publicCommands,
      publicQueries: spec.publicQueries,
      publicEvents: spec.publicEvents,
      domainCatalog: spec.domainCatalog,
      slotClaims: [],
      trustTier: spec.trustTier,
      reviewTier: spec.reviewTier,
      isolationProfile: spec.isolationProfile,
      compatibility: spec.compatibility
    },
    null,
    2
  )});
`;
}

function renderPackCatalogPackageJson(catalogSpec) {
  return `${JSON.stringify(
    {
      name: catalogSpec.repoName,
      private: true,
      type: "module",
      scripts: {
        validate: "node scripts/validate-pack-catalog.mjs",
        sign: "node scripts/sign-pack-catalog.mjs",
        "promote:stable": "node scripts/promote-pack-channel.mjs stable",
        ci: "bun run validate"
      }
    },
    null,
    2
  )}\n`;
}

function renderPackCatalogReadme(catalogSpec, packSpecs) {
  const rows = packSpecs.map((spec) => [
    `[${spec.displayName}](./packs/${spec.id}/README.md)`,
    spec.group,
    `\`${spec.kind}\``,
    `\`${spec.packType}\``,
    spec.requiredPlugins.map((entry) => `\`${entry}\``).join(", ")
  ]);

  return `# ${catalogSpec.repoName}

<p align="center">
  <img src="./docs/assets/gutu-mascot.png" alt="Gutu mascot" width="220" />
</p>

${catalogSpec.description}

## Live Catalog Surface

- \`catalog/index.json\` tracks the first-party business pack inventory.
- \`channels/next.json\` is the installable preview channel for packs that are scaffolded and locally verifiable.
- \`channels/stable.json\` is promotion-driven and only admits signed first-party packs.
- Each pack carries a package manifest, a deployable \`pack.json\`, dependency metadata, object payloads, and validation fixtures.
- \`scripts/sign-pack-catalog.mjs\` records digests and optional signatures, while \`scripts/promote-pack-channel.mjs\` promotes signed packs into \`stable\`.

## Pack Matrix

| Pack | Group | Kind | Pack Type | Required Plugins |
| --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row.join(" | ")} |`).join("\n")}

## Current Truth

- This repo furnishes the Stage 5 business pack layer with real localization and sector artifacts instead of leaving them only in roadmap docs.
- Packs are shipped as first-class metadata bundles with versioned manifests, object payloads, dependency declarations, validation fixtures, and channel metadata.
- Promotion now stays signature-gated: \`next\` is the working channel, while \`stable\` only admits packs signed through the local promotion scripts.
`;
}

function renderPackCatalogDeveloper(catalogSpec, packSpecs) {
  return `# ${catalogSpec.displayName} Developer Notes

## Purpose And Architecture Role

This repo is the extracted first-party catalog for Business OS localization and sector packs.

## Repo Map

- \`catalog/index.json\`: canonical pack inventory
- \`channels/*.json\`: installable preview and promoted stable channels
- \`packs/*\`: individual pack artifacts with manifest, payload, and validation fixtures
- \`scripts/validate-pack-catalog.mjs\`: local integrity validation for the pack catalog
- \`scripts/sign-pack-catalog.mjs\`: digest and signature generation for pack promotion
- \`scripts/promote-pack-channel.mjs\`: stable-channel promotion for signed packs

## Pack Contract

- Every pack exports a \`package.ts\` manifest with package kind metadata.
- Every pack exports a deployable \`pack.json\`, \`dependencies.json\`, and \`signatures.json\`.
- Every pack ships object payloads for settings, workflows, and dashboards plus a validation fixture.
- Packs are dry-run previewable, rollback-aware, and promotion-gated through digest or signature metadata.

## Current Truth

- ${packSpecs.length} packs are scaffolded here across localization and sector groups.
- Channels are preview-first, but stable promotion is now scriptable for packs signed with the first-party signing secret.
- The Business OS verification lane validates presence, previewability, and catalog integrity for this repo.
`;
}

function renderPackCatalogTodo(catalogSpec, packSpecs) {
  const localizationCount = packSpecs.filter((entry) => entry.group === "Localization").length;
  const sectorCount = packSpecs.filter((entry) => entry.group === "Sector").length;

  return `# ${catalogSpec.displayName} TODO

## Shipped Now

- ${localizationCount} localization packs are scaffolded as first-class artifacts.
- ${sectorCount} sector packs are scaffolded as first-class artifacts.
- The pack catalog exports inventory and channel metadata plus local validation, signing, and stable-promotion scripts.

## Current Gaps

- Remote artifact publication and standalone remote fan-out are still pending.
- Pack migration helpers and promotion evidence remain local-runtime oriented; they are not yet connected to live environment rollout automation.

## Recommended Next

- Wire the signing and stable-promotion scripts into remote release automation once standalone publication exists.
- Grow pack payloads beyond starter settings, workflows, dashboards, reports, automations, and validation fixtures as domain implementations deepen.
`;
}

function renderPackCatalogValidateScript(packSpecs) {
  return `#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import crypto from "node:crypto";

const repoRoot = resolve(import.meta.dirname, "..");
const requiredPackFiles = [
  "package.ts",
  "pack.json",
  "dependencies.json",
  "signatures.json",
  "objects/settings/defaults.json",
  "objects/workflows/default.json",
  "objects/dashboards/overview.json",
  "objects/reports/overview.json",
  "objects/automations/default.json",
  "tests/validation.json",
  "README.md"
];
const expectedPackIds = ${JSON.stringify(packSpecs.map((entry) => entry.id), null, 2)};
const failures = [];

for (const relativePath of ["README.md", "DEVELOPER.md", "TODO.md", "SECURITY.md", "CONTRIBUTING.md", "catalog/index.json", "channels/next.json", "channels/stable.json"]) {
  if (!existsSync(join(repoRoot, relativePath))) {
    failures.push(\`Missing file: \${relativePath}\`);
  }
}

const catalog = JSON.parse(readFileSync(join(repoRoot, "catalog/index.json"), "utf8"));
const channelNext = JSON.parse(readFileSync(join(repoRoot, "channels/next.json"), "utf8"));
const channelStable = JSON.parse(readFileSync(join(repoRoot, "channels/stable.json"), "utf8"));

if (catalog.schemaVersion !== 1) {
  failures.push("catalog/index.json must declare schemaVersion 1.");
}
if (channelNext.id !== "next") {
  failures.push("channels/next.json must declare id 'next'.");
}
if (channelStable.id !== "stable") {
  failures.push("channels/stable.json must declare id 'stable'.");
}

const catalogIds = catalog.packages.map((entry) => entry.id);
for (const expected of expectedPackIds) {
  if (!catalogIds.includes(expected)) {
    failures.push(\`catalog/index.json is missing \${expected}\`);
  }
  const packRoot = join(repoRoot, "packs", expected);
  for (const requiredFile of requiredPackFiles) {
    if (!existsSync(join(packRoot, requiredFile))) {
      failures.push(\`packs/\${expected} is missing \${requiredFile}\`);
    }
  }

  if (existsSync(join(packRoot, "signatures.json"))) {
    const signatures = JSON.parse(readFileSync(join(packRoot, "signatures.json"), "utf8"));
    const trackedFiles = Array.isArray(signatures.files) ? signatures.files : [];
    for (const tracked of trackedFiles) {
      const trackedPath = join(packRoot, tracked.path);
      if (!existsSync(trackedPath)) {
        failures.push(\`packs/\${expected} signatures.json references missing file \${tracked.path}\`);
        continue;
      }

      const actualDigest = crypto.createHash("sha256").update(readFileSync(trackedPath)).digest("hex");
      if (tracked.sha256 !== actualDigest) {
        failures.push(\`packs/\${expected} digest mismatch for \${tracked.path}\`);
      }
    }
  }
}

for (const entry of channelNext.packages) {
  if (!expectedPackIds.includes(entry.id)) {
    failures.push(\`channels/next.json references unexpected pack \${entry.id}\`);
  }
}
for (const entry of channelStable.packages) {
  const signatures = JSON.parse(readFileSync(join(repoRoot, "packs", entry.id, "signatures.json"), "utf8"));
  if (!signatures.signed || signatures.trustTier !== "first-party-signed") {
    failures.push(\`channels/stable.json references unsigned or untrusted pack \${entry.id}\`);
  }
}

if (failures.length > 0) {
  console.error("Business pack catalog validation failed:");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("Business pack catalog validation passed.");
`;
}

function renderPackCatalogSignScript(packSpecs) {
  return `#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import crypto from "node:crypto";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packIds = process.argv.slice(2);
const expectedPackIds = new Set(${JSON.stringify(packSpecs.map((entry) => entry.id), null, 2)});
const targetPackIds = packIds.length > 0 ? packIds : [...expectedPackIds];
const signingSecret = process.env.GUTU_PACK_SIGNING_SECRET ?? "";
const signer = process.env.GUTU_PACK_SIGNER ?? "local-dev";
const signMode = signingSecret ? "signed" : "digest-only";

for (const packId of targetPackIds) {
  if (!expectedPackIds.has(packId)) {
    throw new Error(\`Unknown pack '\${packId}'.\`);
  }

  const packRoot = join(repoRoot, "packs", packId);
  const trackedPaths = [
    "package.ts",
    "pack.json",
    "dependencies.json",
    "objects/settings/defaults.json",
    "objects/workflows/default.json",
    "objects/dashboards/overview.json",
    "objects/reports/overview.json",
    "objects/automations/default.json",
    "tests/validation.json",
    "README.md"
  ];
  const files = trackedPaths.map((relativePath) => {
    const contents = readFileSync(join(packRoot, relativePath));
    return {
      path: relativePath,
      sha256: crypto.createHash("sha256").update(contents).digest("hex")
    };
  });
  const canonicalPayload = JSON.stringify(
    {
      packId,
      files
    },
    null,
    2
  );

  const signatures = {
    signed: Boolean(signingSecret),
    trustTier: signingSecret ? "first-party-signed" : "unsigned-dev",
    signer,
    signedAt: new Date().toISOString(),
    mode: signMode,
    files,
    signature: signingSecret ? crypto.createHmac("sha256", signingSecret).update(canonicalPayload).digest("hex") : null,
    note: signingSecret
      ? "Signed for promotion into stable channels."
      : "Digest-only metadata; set GUTU_PACK_SIGNING_SECRET for stable-signature generation."
  };

  writeFileSync(join(packRoot, "signatures.json"), JSON.stringify(signatures, null, 2) + "\\n", "utf8");
  console.log(\`Updated signatures for \${packId} (\${signMode}).\`);
}
`;
}

function renderPackCatalogPromoteScript(packSpecs) {
  return `#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const channelId = process.argv[2] ?? "stable";
if (channelId !== "stable") {
  throw new Error("Only stable promotion is supported by this script.");
}

const catalog = JSON.parse(readFileSync(join(repoRoot, "catalog/index.json"), "utf8"));
const nextChannel = JSON.parse(readFileSync(join(repoRoot, "channels/next.json"), "utf8"));
const promoted = [];

for (const entry of nextChannel.packages) {
  const signatures = JSON.parse(readFileSync(join(repoRoot, "packs", entry.id, "signatures.json"), "utf8"));
  if (!signatures.signed || signatures.trustTier !== "first-party-signed") {
    continue;
  }
  promoted.push({
    ...entry,
    channel: "stable",
    signatureStatus: "signed"
  });
}

const stableChannel = {
  schemaVersion: 1,
  id: "stable",
  packages: promoted.sort((left, right) => left.id.localeCompare(right.id))
};

writeFileSync(join(repoRoot, "channels/stable.json"), JSON.stringify(stableChannel, null, 2) + "\\n", "utf8");

const nextPackageMap = new Map(nextChannel.packages.map((entry) => [entry.id, entry]));
const catalogPackages = catalog.packages.map((entry) =>
  promoted.some((promotedEntry) => promotedEntry.id === entry.id)
    ? {
        ...entry,
        promotedChannel: "stable",
        signatureStatus: "signed"
      }
    : {
        ...entry,
        promotedChannel: nextPackageMap.has(entry.id) ? "next" : entry.promotedChannel ?? "next",
        signatureStatus: entry.signatureStatus ?? "unsigned"
      }
);

writeFileSync(
  join(repoRoot, "catalog/index.json"),
  JSON.stringify(
    {
      ...catalog,
      packages: catalogPackages
    },
    null,
    2
  ) + "\\n",
  "utf8"
);

console.log(\`Promoted \${promoted.length} signed pack(s) into stable.\`);
`;
}

function renderPackCatalogIndex(catalogSpec, packSpecs) {
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      packages: packSpecs
        .map((spec) => ({
          id: spec.id,
          canonicalId: spec.id,
          kind: spec.kind,
          repo: `gutula/${catalogSpec.repoName}`,
          version: spec.version,
          channel: spec.compatibilityChannel,
          displayName: spec.displayName,
          description: spec.description,
          domainGroup: spec.domainGroup,
          defaultCategory: spec.defaultCategory,
          packType: spec.packType,
          environmentScope: spec.environmentScope,
          trustTier: spec.trustTier,
          signatureStatus: "unsigned",
          path: `packs/${spec.id}/pack.json`
        }))
        .sort((left, right) => left.id.localeCompare(right.id))
    },
    null,
    2
  )}\n`;
}

function renderPackCatalogChannel(channelId, catalogSpec, packSpecs) {
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      id: channelId,
      packages: packSpecs
        .map((spec) => ({
          id: spec.id,
          canonicalId: spec.id,
          kind: spec.kind,
          repo: `gutula/${catalogSpec.repoName}`,
          version: spec.version,
          channel: channelId,
          displayName: spec.displayName,
          description: spec.description,
          domainGroup: spec.domainGroup,
          defaultCategory: spec.defaultCategory,
          packType: spec.packType,
          environmentScope: spec.environmentScope,
          trustTier: spec.trustTier,
          signatureStatus: channelId === "stable" ? "signed" : "unsigned",
          path: `packs/${spec.id}/pack.json`
        }))
        .sort((left, right) => left.id.localeCompare(right.id))
    },
    null,
    2
  )}\n`;
}

function renderPackReadme(spec) {
  return `# ${spec.displayName}

${spec.description}

## Pack Contract

- Kind: \`${spec.kind}\`
- Pack Type: \`${spec.packType}\`
- Environment Scope: \`${spec.environmentScope}\`
- Required Plugins: ${spec.requiredPlugins.map((entry) => `\`${entry}\``).join(", ")}
- Depends On Packs: ${spec.dependsOnPacks.length ? spec.dependsOnPacks.map((entry) => `\`${entry}\``).join(", ") : "None"}

## Included Objects

- \`objects/settings/defaults.json\`
- \`objects/workflows/default.json\`
- \`objects/dashboards/overview.json\`
- \`objects/reports/overview.json\`
- \`objects/automations/default.json\`
- \`tests/validation.json\`
`;
}

function renderPackPackageManifest(spec, catalogSpec) {
  return `import { definePackage } from "@platform/kernel";

export default definePackage(${JSON.stringify(
    {
      id: spec.id,
      kind: spec.kind,
      version: spec.version,
      contractVersion: "1.0.0",
      sourceRepo: catalogSpec.repoName,
      displayName: spec.displayName,
      domainGroup: spec.domainGroup,
      defaultCategory: spec.defaultCategory,
      description: spec.description,
      dependsOn: spec.requiredPlugins,
      dependencyContracts: spec.requiredPlugins.map((packageId) => ({
        packageId,
        class: "required",
        rationale: `${spec.displayName} depends on ${packageId} for governed pack installation.`
      })),
      providesCapabilities: [`packs.${spec.id}`],
      requestedCapabilities: [],
      ownsData: [`packs.${spec.id}.objects`],
      extendsData: [],
      publicCommands: [`packs.${spec.id}.install-preview`],
      publicQueries: [`packs.${spec.id}.summary`],
      publicEvents: [`packs.${spec.id}.applied.v1`]
    },
    null,
    2
  )});
`;
}

function renderBusinessPackManifest(spec) {
  return `${JSON.stringify(
    {
      packType: spec.packType,
      name: spec.id,
      version: spec.version,
      publisher: spec.publisher,
      platformVersion: spec.platformVersion,
      pluginConstraints: spec.pluginConstraints,
      dependsOnPacks: spec.dependsOnPacks,
      mergePolicy: {
        settings: "merge",
        workflows: "replace",
        dashboards: "upsert",
        reports: "upsert"
      },
      trustTier: spec.trustTier,
      compatibilityChannel: spec.compatibilityChannel,
      dryRunSupported: true,
      rollbackStrategy: "inverse-patch",
      environmentScope: spec.environmentScope,
      signaturesFile: "signatures.json",
      dependenciesFile: "dependencies.json"
    },
    null,
    2
  )}\n`;
}

function renderBusinessPackDependencies(spec) {
  return `${JSON.stringify(
    {
      requiredPlugins: spec.requiredPlugins,
      dependsOnPacks: spec.dependsOnPacks,
      pluginConstraints: spec.pluginConstraints
    },
    null,
    2
  )}\n`;
}

function renderBusinessPackSignatures(spec) {
  return `${JSON.stringify(
    {
      signed: false,
      trustTier: "unsigned-dev",
      signer: "local-dev",
      signedAt: null,
      mode: "digest-only",
      signature: null,
      files: [],
      note: `${spec.displayName} must be signed before stable promotion.`
    },
    null,
    2
  )}\n`;
}

function renderBusinessPackSettings(spec) {
  return `${JSON.stringify(
    {
      label: spec.displayName,
      description: spec.description,
      defaults: spec.settingDefaults
    },
    null,
    2
  )}\n`;
}

function renderBusinessPackWorkflow(spec) {
  return `${JSON.stringify(
    {
      workflowId: spec.workflowTemplate.workflowId,
      actors: spec.workflowTemplate.actors,
      description: `${spec.displayName} governance workflow`
    },
    null,
    2
  )}\n`;
}

function renderBusinessPackDashboard(spec) {
  return `${JSON.stringify(
    {
      id: spec.dashboardTemplate.id,
      title: spec.dashboardTemplate.title,
      widgets: spec.dashboardTemplate.widgets
    },
    null,
    2
  )}\n`;
}

function renderBusinessPackReports(spec) {
  return `${JSON.stringify(
    {
      packId: spec.id,
      reports: [
        `${spec.id}.operational-overview`,
        `${spec.id}.exception-backlog`,
        `${spec.id}.adoption-summary`
      ]
    },
    null,
    2
  )}\n`;
}

function renderBusinessPackAutomation(spec) {
  return `${JSON.stringify(
    {
      automationId: `${spec.id}.default-governance`,
      workflowId: spec.workflowTemplate.workflowId,
      cadence: "daily-review",
      widgets: spec.dashboardTemplate.widgets
    },
    null,
    2
  )}\n`;
}

function renderBusinessPackValidation(spec) {
  return `${JSON.stringify(
    {
      packId: spec.id,
      packType: spec.packType,
      requiredPlugins: spec.requiredPlugins,
      expectedObjects: [
        "settings/defaults",
        "workflows/default",
        "dashboards/overview",
        "reports/overview",
        "automations/default"
      ]
    },
    null,
    2
  )}\n`;
}

function renderRootTsconfig() {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        noUncheckedIndexedAccess: true,
        exactOptionalPropertyTypes: true,
        verbatimModuleSyntax: true,
        skipLibCheck: true,
        types: ["bun-types", "react", "react-dom"],
        baseUrl: ".",
        paths: {
          "@gutu/kernel": ["../../gutu-core/framework/core/kernel/src/index.ts"],
          "@platform/kernel": ["../../gutu-core/framework/core/platform-kernel/src/index.ts"],
          "@platform/schema": ["../../gutu-core/framework/core/schema/src/index.ts"],
          "@platform/jobs": ["../../gutu-core/framework/core/jobs/src/index.ts"],
          "@platform/business-runtime": ["../../gutu-core/framework/core/business-runtime/src/index.ts"],
          "@platform/admin-contracts": [
            "../../libraries/gutu-lib-admin-contracts/framework/libraries/admin-contracts/src/index.ts"
          ],
          "@platform/ui-shell": ["../../libraries/gutu-lib-ui-shell/framework/libraries/ui-shell/src/index.ts"]
        },
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        typeRoots: ["../../node_modules", "../../node_modules/@types"]
      }
    },
    null,
    2
  )}\n`;
}

function renderNestedTsconfig() {
  return `${JSON.stringify(
    {
      extends: "../../../tsconfig.base.json",
      compilerOptions: {
        noEmit: true
      },
      include: [
        "src/**/*.ts",
        "src/**/*.tsx",
        "tests/**/*.ts",
        "tests/**/*.tsx",
        "package.ts",
        "db/**/*.ts"
      ]
    },
    null,
    2
  )}\n`;
}

function renderNestedBuildTsconfig() {
  return `${JSON.stringify(
    {
      extends: "./tsconfig.json",
      compilerOptions: {
        noEmit: false,
        outDir: "./dist"
      },
      exclude: ["tests"]
    },
    null,
    2
  )}\n`;
}

function renderDbSchema(primaryTableName, secondaryTableName, exceptionTableName) {
  return `import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const primaryRecordsTable = pgTable("${primaryTableName}", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  title: text("title").notNull(),
  counterpartyId: text("counterparty_id").notNull(),
  companyId: text("company_id").notNull(),
  branchId: text("branch_id").notNull(),
  recordState: text("record_state").notNull(),
  approvalState: text("approval_state").notNull(),
  postingState: text("posting_state").notNull(),
  fulfillmentState: text("fulfillment_state").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  currencyCode: text("currency_code").notNull(),
  revisionNo: integer("revision_no").notNull(),
  reasonCode: text("reason_code"),
  effectiveAt: timestamp("effective_at").notNull(),
  correlationId: text("correlation_id").notNull(),
  processId: text("process_id").notNull(),
  upstreamRefs: text("upstream_refs").notNull(),
  downstreamRefs: text("downstream_refs").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const secondaryRecordsTable = pgTable("${secondaryTableName}", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  primaryRecordId: text("primary_record_id").notNull(),
  label: text("label").notNull(),
  status: text("status").notNull(),
  requestedAction: text("requested_action").notNull(),
  reasonCode: text("reason_code"),
  correlationId: text("correlation_id").notNull(),
  processId: text("process_id").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const exceptionRecordsTable = pgTable("${exceptionTableName}", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  primaryRecordId: text("primary_record_id").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull(),
  reasonCode: text("reason_code").notNull(),
  upstreamRef: text("upstream_ref"),
  downstreamRef: text("downstream_ref"),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
`;
}

function renderDomainCatalog(spec) {
  return `export const domainCatalog = ${JSON.stringify(
    {
      erpnextModules: spec.domainCatalog.erpnextModules,
      erpnextDoctypes: spec.domainCatalog.erpnextDoctypes,
      ownedEntities: spec.domainCatalog.ownedEntities,
      reports: spec.domainCatalog.reports,
      exceptionQueues: spec.domainCatalog.exceptionQueues,
      operationalScenarios: spec.domainCatalog.operationalScenarios,
      settingsSurfaces: spec.domainCatalog.settingsSurfaces,
      edgeCases: spec.domainCatalog.edgeCases
    },
    null,
    2
  )} as const;
`;
}

function renderExceptionCatalog(spec) {
  const queueDefinitions = spec.domainCatalog.exceptionQueues.map((queueId) => ({
    id: queueId,
    label: queueId
      .split("-")
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(" "),
    severity: "medium",
    owner: spec.workflow.actors[0] ?? "operations",
    reconciliationJobId: spec.jobs[1]?.id ?? spec.jobs[0]?.id ?? `${spec.packageDir}.reconciliation.run`
  }));

  return `export const exceptionQueueDefinitions = ${JSON.stringify(queueDefinitions, null, 2)} as const;
`;
}

function renderFlowCatalog(spec) {
  const phases = {
    create: {
      inputType: "CreatePrimaryRecordInput",
      serviceFunction: "createPrimaryRecord"
    },
    advance: {
      inputType: "AdvancePrimaryRecordInput",
      serviceFunction: "advancePrimaryRecord"
    },
    reconcile: {
      inputType: "ReconcilePrimaryRecordInput",
      serviceFunction: "reconcilePrimaryRecord"
    },
    hold: {
      inputType: "PlacePrimaryRecordOnHoldInput",
      serviceFunction: "placePrimaryRecordOnHold"
    },
    release: {
      inputType: "ReleasePrimaryRecordHoldInput",
      serviceFunction: "releasePrimaryRecordHold"
    },
    amend: {
      inputType: "AmendPrimaryRecordInput",
      serviceFunction: "amendPrimaryRecord"
    },
    reverse: {
      inputType: "ReversePrimaryRecordInput",
      serviceFunction: "reversePrimaryRecord"
    }
  };

  const flowDefinitions = spec.actions.map((action, index) => {
    const phase = phases[action.phase] ?? phases[["create", "advance", "reconcile"][index] ?? "reconcile"];
    return {
      id: action.id,
      label: action.label,
      phase: action.phase ?? ["create", "advance", "reconcile"][index] ?? "reconcile",
      methodName: toCamelCaseIdentifier(action.label)
    };
  });

  const functionBlocks = flowDefinitions.map((definition, index) => {
    const phase = phases[definition.phase] ?? phases[["create", "advance", "reconcile"][index] ?? "reconcile"];
    return `export async function ${definition.methodName}(input: ${phase.inputType}) {
  return ${phase.serviceFunction}(input);
}`;
  });

  return `import {
  advancePrimaryRecord,
  amendPrimaryRecord,
  createPrimaryRecord,
  placePrimaryRecordOnHold,
  reconcilePrimaryRecord,
  releasePrimaryRecordHold,
  reversePrimaryRecord,
  type AdvancePrimaryRecordInput,
  type AmendPrimaryRecordInput,
  type CreatePrimaryRecordInput,
  type PlacePrimaryRecordOnHoldInput,
  type ReconcilePrimaryRecordInput,
  type ReleasePrimaryRecordHoldInput,
  type ReversePrimaryRecordInput
} from "../services/main.service";

export const businessFlowDefinitions = ${JSON.stringify(flowDefinitions, null, 2)} as const;

${functionBlocks.join("\n\n")}
`;
}

function renderReportCatalog(spec) {
  const reportDefinitions = spec.domainCatalog.reports.map((label, index) => ({
    id: `${spec.id}.report.${String(index + 1).padStart(2, "0")}`,
    label,
    owningPlugin: spec.id,
    source: "erpnext-parity",
    exceptionQueues: spec.domainCatalog.exceptionQueues
  }));

  return `export const reportDefinitions = ${JSON.stringify(reportDefinitions, null, 2)} as const;
`;
}

function renderScenarioCatalog(spec) {
  const scenarioDefinitions = spec.domainCatalog.operationalScenarios.map((id) => ({
    id,
    owningPlugin: spec.id,
    workflowId: spec.workflow.id,
    actionIds: spec.actions.map((entry) => entry.id),
    downstreamTargets: resolveOrchestrationTargets(spec)
  }));

  return `export const scenarioDefinitions = ${JSON.stringify(scenarioDefinitions, null, 2)} as const;
`;
}

function renderSettingsSurfaceCatalog(spec) {
  const settingsDefinitions = spec.domainCatalog.settingsSurfaces.map((label, index) => ({
    id: `${spec.id}.setting-surface.${String(index + 1).padStart(2, "0")}`,
    label,
    owningPlugin: spec.id,
    governance: "config-review-required"
  }));

  return `export const settingsSurfaceDefinitions = ${JSON.stringify(settingsDefinitions, null, 2)} as const;
`;
}

function renderModel() {
  return `import { z } from "zod";

export const recordStateSchema = z.enum(["draft", "active", "canceled", "archived"]);
export const approvalStateSchema = z.enum(["not-required", "pending", "approved", "rejected"]);
export const postingStateSchema = z.enum(["unposted", "posted", "reversed"]);
export const fulfillmentStateSchema = z.enum(["none", "partial", "complete", "closed"]);

export const primaryRecordSchema = z.object({
  id: z.string().min(2),
  tenantId: z.string().min(2),
  title: z.string().min(2),
  counterpartyId: z.string().min(2),
  companyId: z.string().min(2),
  branchId: z.string().min(2),
  recordState: recordStateSchema,
  approvalState: approvalStateSchema,
  postingState: postingStateSchema,
  fulfillmentState: fulfillmentStateSchema,
  amountMinor: z.number().int(),
  currencyCode: z.string().min(3),
  revisionNo: z.number().int().nonnegative(),
  reasonCode: z.string().nullable(),
  effectiveAt: z.string(),
  correlationId: z.string().min(2),
  processId: z.string().min(2),
  upstreamRefs: z.array(z.string().min(2)),
  downstreamRefs: z.array(z.string().min(2)),
  updatedAt: z.string()
});

export const secondaryRecordSchema = z.object({
  id: z.string().min(2),
  tenantId: z.string().min(2),
  primaryRecordId: z.string().min(2),
  label: z.string().min(2),
  status: z.enum(["requested", "approved", "in-progress", "completed", "failed", "closed"]),
  requestedAction: z.string().min(2),
  reasonCode: z.string().nullable(),
  correlationId: z.string().min(2),
  processId: z.string().min(2),
  updatedAt: z.string()
});

export const exceptionRecordSchema = z.object({
  id: z.string().min(2),
  tenantId: z.string().min(2),
  primaryRecordId: z.string().min(2),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "under-review", "resolved", "closed"]),
  reasonCode: z.string().min(2),
  upstreamRef: z.string().nullable(),
  downstreamRef: z.string().nullable(),
  updatedAt: z.string()
});

export const createPrimaryRecordInputSchema = z.object({
  tenantId: z.string().min(2),
  actorId: z.string().min(2),
  recordId: z.string().min(2),
  title: z.string().min(2),
  counterpartyId: z.string().min(2),
  companyId: z.string().min(2),
  branchId: z.string().min(2),
  amountMinor: z.number().int(),
  currencyCode: z.string().min(3),
  effectiveAt: z.string().min(2),
  correlationId: z.string().min(2),
  processId: z.string().min(2),
  upstreamRefs: z.array(z.string().min(2)).optional(),
  reasonCode: z.string().min(2).optional()
});

export const advancePrimaryRecordInputSchema = z.object({
  tenantId: z.string().min(2),
  actorId: z.string().min(2),
  recordId: z.string().min(2),
  expectedRevisionNo: z.number().int().positive().optional(),
  recordState: recordStateSchema.optional(),
  approvalState: approvalStateSchema.optional(),
  postingState: postingStateSchema.optional(),
  fulfillmentState: fulfillmentStateSchema.optional(),
  downstreamRef: z.string().min(2).optional(),
  reasonCode: z.string().min(2).optional()
});

export const placePrimaryRecordOnHoldInputSchema = z.object({
  tenantId: z.string().min(2),
  actorId: z.string().min(2),
  recordId: z.string().min(2),
  expectedRevisionNo: z.number().int().positive().optional(),
  reasonCode: z.string().min(2)
});

export const releasePrimaryRecordHoldInputSchema = z.object({
  tenantId: z.string().min(2),
  actorId: z.string().min(2),
  recordId: z.string().min(2),
  expectedRevisionNo: z.number().int().positive().optional(),
  reasonCode: z.string().min(2).optional()
});

export const amendPrimaryRecordInputSchema = z.object({
  tenantId: z.string().min(2),
  actorId: z.string().min(2),
  recordId: z.string().min(2),
  amendedRecordId: z.string().min(2),
  expectedRevisionNo: z.number().int().positive().optional(),
  title: z.string().min(2).optional(),
  amountMinor: z.number().int().optional(),
  effectiveAt: z.string().min(2).optional(),
  reasonCode: z.string().min(2)
});

export const reversePrimaryRecordInputSchema = z.object({
  tenantId: z.string().min(2),
  actorId: z.string().min(2),
  recordId: z.string().min(2),
  reversalRecordId: z.string().min(2),
  expectedRevisionNo: z.number().int().positive().optional(),
  reasonCode: z.string().min(2)
});

export const reconcilePrimaryRecordInputSchema = z.object({
  tenantId: z.string().min(2),
  actorId: z.string().min(2),
  recordId: z.string().min(2),
  exceptionId: z.string().min(2),
  expectedRevisionNo: z.number().int().positive().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  reasonCode: z.string().min(2),
  upstreamRef: z.string().min(2).optional(),
  downstreamRef: z.string().min(2).optional()
});

export type PrimaryRecord = z.infer<typeof primaryRecordSchema>;
export type SecondaryRecord = z.infer<typeof secondaryRecordSchema>;
export type ExceptionRecord = z.infer<typeof exceptionRecordSchema>;
`;
}

function renderActions(spec) {
  const actionPhaseDefinitions = {
    create: {
      serviceFunction: "createPrimaryRecord",
      inputSchema: "createPrimaryRecordInputSchema",
      outputSchema: `z.object({
    ok: z.literal(true),
    recordId: z.string(),
    recordState: recordStateSchema,
    approvalState: approvalStateSchema,
    postingState: postingStateSchema,
    fulfillmentState: fulfillmentStateSchema,
    revisionNo: z.number().int().positive(),
    eventIds: z.array(z.string()),
    jobIds: z.array(z.string())
  })`
    },
    advance: {
      serviceFunction: "advancePrimaryRecord",
      inputSchema: "advancePrimaryRecordInputSchema",
      outputSchema: `z.object({
    ok: z.literal(true),
    recordId: z.string(),
    recordState: recordStateSchema,
    approvalState: approvalStateSchema,
    postingState: postingStateSchema,
    fulfillmentState: fulfillmentStateSchema,
    revisionNo: z.number().int().positive(),
    eventIds: z.array(z.string()),
    jobIds: z.array(z.string())
  })`
    },
    reconcile: {
      serviceFunction: "reconcilePrimaryRecord",
      inputSchema: "reconcilePrimaryRecordInputSchema",
      outputSchema: `z.object({
    ok: z.literal(true),
    recordId: z.string(),
    exceptionId: z.string(),
    status: z.enum(["open", "under-review", "resolved", "closed"]),
    revisionNo: z.number().int().positive(),
    eventIds: z.array(z.string()),
    jobIds: z.array(z.string())
  })`
    },
    hold: {
      serviceFunction: "placePrimaryRecordOnHold",
      inputSchema: "placePrimaryRecordOnHoldInputSchema",
      outputSchema: `z.object({
    ok: z.literal(true),
    recordId: z.string(),
    status: z.enum(["open", "under-review", "resolved", "closed"]),
    revisionNo: z.number().int().positive(),
    eventIds: z.array(z.string()),
    jobIds: z.array(z.string())
  })`
    },
    release: {
      serviceFunction: "releasePrimaryRecordHold",
      inputSchema: "releasePrimaryRecordHoldInputSchema",
      outputSchema: `z.object({
    ok: z.literal(true),
    recordId: z.string(),
    status: z.enum(["open", "under-review", "resolved", "closed"]),
    revisionNo: z.number().int().positive(),
    eventIds: z.array(z.string()),
    jobIds: z.array(z.string())
  })`
    },
    amend: {
      serviceFunction: "amendPrimaryRecord",
      inputSchema: "amendPrimaryRecordInputSchema",
      outputSchema: `z.object({
    ok: z.literal(true),
    recordId: z.string(),
    amendedRecordId: z.string(),
    revisionNo: z.number().int().positive(),
    eventIds: z.array(z.string()),
    jobIds: z.array(z.string())
  })`
    },
    reverse: {
      serviceFunction: "reversePrimaryRecord",
      inputSchema: "reversePrimaryRecordInputSchema",
      outputSchema: `z.object({
    ok: z.literal(true),
    recordId: z.string(),
    reversalRecordId: z.string(),
    revisionNo: z.number().int().positive(),
    eventIds: z.array(z.string()),
    jobIds: z.array(z.string())
  })`
    }
  };

  const serviceFunctions = dedupeList(
    spec.actions.map((action, index) => {
      const phase = action.phase ?? ["create", "advance", "reconcile"][index] ?? "reconcile";
      return actionPhaseDefinitions[phase].serviceFunction;
    })
  );
  const modelImports = dedupeList(
    spec.actions.flatMap((action, index) => {
      const phase = action.phase ?? ["create", "advance", "reconcile"][index] ?? "reconcile";
      return [actionPhaseDefinitions[phase].inputSchema];
    })
  );
  const actionBlocks = spec.actions.map((action, index) => {
    const phase = action.phase ?? ["create", "advance", "reconcile"][index] ?? "reconcile";
    const definition = actionPhaseDefinitions[phase];
    const constName = `${toCamelCaseIdentifier(action.label)}Action`;
    return `export const ${constName} = defineAction({
  id: "${action.id}",
  description: "${action.label}",
  input: ${definition.inputSchema},
  output: ${definition.outputSchema},
  permission: "${action.permission}",
  idempotent: ${phase === "create" ? "true" : "false"},
  audit: true,
  handler: ({ input }) => ${definition.serviceFunction}(input)
});`;
  });
  const exportedActions = spec.actions.map((action) => `${toCamelCaseIdentifier(action.label)}Action`);

  return `import { defineAction } from "@platform/schema";
import { z } from "zod";

import {
  ${serviceFunctions.join(",\n  ")}
} from "../services/main.service";
import {
  approvalStateSchema,
  fulfillmentStateSchema,
  postingStateSchema,
  recordStateSchema,
  ${modelImports.join(",\n  ")}
} from "../model";

${actionBlocks.join("\n\n")}

export const businessActions = [
  ${exportedActions.join(",\n  ")}
] as const;
`;
}

function renderResources(spec) {
  const [primaryResource, secondaryResource, exceptionResource] = spec.resources;
  return `import { defineResource } from "@platform/schema";

import {
  primaryRecordsTable,
  secondaryRecordsTable,
  exceptionRecordsTable
} from "../../db/schema";
import { exceptionRecordSchema, primaryRecordSchema, secondaryRecordSchema } from "../model";

export const BusinessPrimaryResource = defineResource({
  id: "${primaryResource.id}",
  description: "${primaryResource.description}",
  businessPurpose: "${primaryResource.businessPurpose}",
  table: primaryRecordsTable,
  contract: primaryRecordSchema,
  fields: {
    title: { searchable: true, sortable: true, label: "Title" },
    recordState: { filter: "select", label: "Record State" },
    approvalState: { filter: "select", label: "Approval" },
    postingState: { filter: "select", label: "Posting" },
    fulfillmentState: { filter: "select", label: "Fulfillment" },
    updatedAt: { sortable: true, label: "Updated" }
  },
  admin: {
    autoCrud: true,
    defaultColumns: ["title", "recordState", "approvalState", "postingState", "fulfillmentState", "updatedAt"]
  },
  portal: { enabled: false }
});

export const BusinessSecondaryResource = defineResource({
  id: "${secondaryResource.id}",
  description: "${secondaryResource.description}",
  businessPurpose: "${secondaryResource.businessPurpose}",
  table: secondaryRecordsTable,
  contract: secondaryRecordSchema,
  fields: {
    label: { searchable: true, sortable: true, label: "Label" },
    status: { filter: "select", label: "Status" },
    requestedAction: { searchable: true, sortable: true, label: "Requested Action" },
    updatedAt: { sortable: true, label: "Updated" }
  },
  admin: {
    autoCrud: true,
    defaultColumns: ["label", "status", "requestedAction", "updatedAt"]
  },
  portal: { enabled: false }
});

export const BusinessExceptionResource = defineResource({
  id: "${exceptionResource.id}",
  description: "${exceptionResource.description}",
  businessPurpose: "${exceptionResource.businessPurpose}",
  table: exceptionRecordsTable,
  contract: exceptionRecordSchema,
  fields: {
    severity: { filter: "select", label: "Severity" },
    status: { filter: "select", label: "Status" },
    reasonCode: { searchable: true, sortable: true, label: "Reason" },
    updatedAt: { sortable: true, label: "Updated" }
  },
  admin: {
    autoCrud: true,
    defaultColumns: ["severity", "status", "reasonCode", "updatedAt"]
  },
  portal: { enabled: false }
});

export const businessResources = [
  BusinessPrimaryResource,
  BusinessSecondaryResource,
  BusinessExceptionResource
] as const;
`;
}

function renderServices(spec) {
  const [createEvent, advanceEvent, reconcileEvent] = spec.publicEvents;
  const [projectionJob, reconciliationJob] = spec.jobs;
  const orchestrationTargets = resolveOrchestrationTargets(spec);
  const sqlPrefix = spec.packageDir.replaceAll("-", "_");
  return `import {
  createBusinessDomainStateStore,
  createBusinessOrchestrationState,
  createBusinessPluginService,
  type BusinessAdvancePrimaryRecordInput,
  type BusinessAmendPrimaryRecordInput,
  type BusinessCreatePrimaryRecordInput,
  type BusinessFailPendingDownstreamItemInput,
  type BusinessPlacePrimaryRecordOnHoldInput,
  type BusinessReconcilePrimaryRecordInput,
  type BusinessReleasePrimaryRecordHoldInput,
  type BusinessReplayDeadLetterInput,
  type BusinessReversePrimaryRecordInput,
  type BusinessResolvePendingDownstreamItemInput
} from "@platform/business-runtime";

import { type ExceptionRecord, type PrimaryRecord, type SecondaryRecord } from "../model";

export type CreatePrimaryRecordInput = BusinessCreatePrimaryRecordInput;
export type AdvancePrimaryRecordInput = BusinessAdvancePrimaryRecordInput;
export type PlacePrimaryRecordOnHoldInput = BusinessPlacePrimaryRecordOnHoldInput;
export type ReleasePrimaryRecordHoldInput = BusinessReleasePrimaryRecordHoldInput;
export type AmendPrimaryRecordInput = BusinessAmendPrimaryRecordInput;
export type ReconcilePrimaryRecordInput = BusinessReconcilePrimaryRecordInput;
export type ReversePrimaryRecordInput = BusinessReversePrimaryRecordInput;
export type ResolvePendingDownstreamItemInput = BusinessResolvePendingDownstreamItemInput;
export type FailPendingDownstreamItemInput = BusinessFailPendingDownstreamItemInput;
export type ReplayDeadLetterInput = BusinessReplayDeadLetterInput;

function seedState() {
  return {
    primaryRecords: [
      {
        id: "${spec.id}:seed",
        tenantId: "tenant-platform",
        title: "${spec.displayName} Seed Record",
        counterpartyId: "party:seed",
        companyId: "company:primary",
        branchId: "branch:head-office",
        recordState: "active",
        approvalState: "approved",
        postingState: "unposted",
        fulfillmentState: "none",
        amountMinor: 125000,
        currencyCode: "USD",
        revisionNo: 1,
        reasonCode: null,
        effectiveAt: "2026-04-23T00:00:00.000Z",
        correlationId: "${spec.id}:seed",
        processId: "${spec.workflow.id}:seed",
        upstreamRefs: [],
        downstreamRefs: [],
        updatedAt: "2026-04-23T00:00:00.000Z"
      }
    ] satisfies PrimaryRecord[],
    secondaryRecords: [] satisfies SecondaryRecord[],
    exceptionRecords: [] satisfies ExceptionRecord[],
    orchestration: createBusinessOrchestrationState()
  };
}

const store = createBusinessDomainStateStore({
  pluginId: "${spec.id}",
  sqlite: {
    primaryTable: "${sqlPrefix}_primary_records",
    secondaryTable: "${sqlPrefix}_secondary_records",
    exceptionTable: "${sqlPrefix}_exception_records",
    dbFileName: "business-runtime.sqlite"
  },
  postgres: {
    schemaName: "${sqlPrefix}"
  },
  seedStateFactory: seedState
});

const service = createBusinessPluginService({
  pluginId: "${spec.id}",
  displayName: "${spec.displayName}",
  primaryResourceId: "${spec.resources[0].id}",
  secondaryResourceId: "${spec.resources[1].id}",
  exceptionResourceId: "${spec.resources[2].id}",
  createEvent: "${createEvent}",
  advanceEvent: "${advanceEvent}",
  reconcileEvent: "${reconcileEvent}",
  projectionJobId: "${projectionJob.id}",
  reconciliationJobId: "${reconciliationJob.id}",
  advanceActionLabel: "${spec.actions[1].label}",
  orchestrationTargets: ${JSON.stringify(orchestrationTargets, null, 2)},
  store
});

export const {
  listPrimaryRecords,
  listSecondaryRecords,
  listExceptionRecords,
  listPublishedMessages,
  listPendingDownstreamItems,
  listDeadLetters,
  listProjectionRecords,
  getBusinessOverview,
  createPrimaryRecord,
  advancePrimaryRecord,
  placePrimaryRecordOnHold,
  releasePrimaryRecordHold,
  amendPrimaryRecord,
  reconcilePrimaryRecord,
  reversePrimaryRecord,
  resolvePendingDownstreamItem,
  failPendingDownstreamItem,
  replayDeadLetter
} = service;
`;
}

function renderJobs(spec) {
  return `import { defineJob } from "@platform/jobs";
import { z } from "zod";

export const jobDefinitionKeys = [
  "${spec.jobs[0].id}",
  "${spec.jobs[1].id}"
] as const;

export const jobDefinitions = {
  "${spec.jobs[0].id}": defineJob({
    id: "${spec.jobs[0].id}",
    queue: "${spec.jobs[0].queue}",
    payload: z.object({
      tenantId: z.string().min(2),
      recordId: z.string().min(2)
    }),
    concurrency: 2,
    retryPolicy: {
      attempts: 3,
      backoff: "exponential",
      delayMs: 1_000
    },
    timeoutMs: 30_000,
    handler: () => undefined
  }),
  "${spec.jobs[1].id}": defineJob({
    id: "${spec.jobs[1].id}",
    queue: "${spec.jobs[1].queue}",
    payload: z.object({
      tenantId: z.string().min(2),
      recordId: z.string().min(2)
    }),
    concurrency: 1,
    retryPolicy: {
      attempts: 4,
      backoff: "linear",
      delayMs: 1_500
    },
    timeoutMs: 45_000,
    handler: () => undefined
  })
} as const;
`;
}

function renderWorkflows(spec) {
  return `import { defineWorkflow } from "@platform/jobs";

export const workflowDefinitionKeys = ["${spec.workflow.id}"] as const;

export const workflowDefinitions = {
  "${spec.workflow.id}": defineWorkflow({
    id: "${spec.workflow.id}",
    description: "${spec.workflow.description}",
    businessPurpose: "${spec.workflow.businessPurpose}",
    actors: ${JSON.stringify(spec.workflow.actors)},
    invariants: [
      "Multi-axis business states must stay explicit on every record.",
      "Cross-plugin work must be requested through traceable downstream actions instead of hidden direct writes."
    ],
    mandatorySteps: [
      "Draft records must be submitted before approval or downstream action occurs.",
      "Corrections must happen through explicit follow-up or reconciliation activity rather than destructive mutation."
    ],
    stateDescriptions: {
      draft: { description: "The business record exists but is not yet active." },
      pending_approval: { description: "The record is waiting for approval or policy review." },
      active: { description: "The record is active and can drive downstream requests." },
      reconciled: { description: "Downstream effects have been reviewed and reconciled." },
      closed: { description: "The lifecycle is complete and the record is closed." },
      canceled: { description: "The lifecycle ended through cancellation or reversal." }
    },
    transitionDescriptions: {
      "draft.submit": "Submits the record for review or governance checks.",
      "pending_approval.approve": "Approves the record and makes it active.",
      "active.reconcile": "Moves the record into explicit reconciliation or downstream review.",
      "reconciled.close": "Closes the record once downstream work is complete.",
      "pending_approval.reject": "Rejects the record and closes the current cycle.",
      "active.cancel": "Cancels the active record with a controlled reason."
    },
    initialState: "draft",
    states: {
      draft: { on: { submit: "pending_approval" } },
      pending_approval: { on: { approve: "active", reject: "canceled" } },
      active: { on: { reconcile: "reconciled", cancel: "canceled" } },
      reconciled: { on: { close: "closed" } },
      closed: {},
      canceled: {}
    }
  })
} as const;
`;
}

function renderUiSurface(spec) {
  return `import { defineUiSurface } from "@platform/ui-shell";

import { BusinessAdminPage } from "./admin/main.page";

export const uiSurface = defineUiSurface({
  embeddedPages: [
    {
      shell: "admin",
      route: "${spec.route}",
      component: BusinessAdminPage,
      permission: "${spec.actions[0].permission.replace(".write", ".read")}"
    }
  ],
  widgets: []
});
`;
}

function renderAdminContributions(spec) {
  return `import {
  defineAdminNav,
  defineCommand,
  definePage,
  defineWorkspace,
  type AdminContributionRegistry
} from "@platform/admin-contracts";

import { BusinessAdminPage } from "./admin/main.page";

export const adminContributions: Pick<AdminContributionRegistry, "workspaces" | "nav" | "pages" | "commands"> = {
  workspaces: [
    defineWorkspace({
      id: "${spec.workspace.id}",
      label: "${spec.workspace.label}",
      icon: "${spec.workspace.icon}",
      description: "${spec.workspace.description}",
      permission: "${spec.actions[0].permission.replace(".write", ".read")}",
      homePath: "${spec.route}",
      quickActions: ["${spec.id}.open.control-room"]
    })
  ],
  nav: [
    defineAdminNav({
      workspace: "${spec.workspace.id}",
      group: "control-room",
      items: [
        {
          id: "${spec.id}.overview",
          label: "Control Room",
          icon: "${spec.workspace.icon}",
          to: "${spec.route}",
          permission: "${spec.actions[0].permission.replace(".write", ".read")}"
        }
      ]
    })
  ],
  pages: [
    definePage({
      id: "${spec.id}.page",
      kind: "dashboard",
      route: "${spec.route}",
      label: "${spec.pageTitle}",
      workspace: "${spec.workspace.id}",
      group: "control-room",
      permission: "${spec.actions[0].permission.replace(".write", ".read")}",
      component: BusinessAdminPage
    })
  ],
  commands: [
    defineCommand({
      id: "${spec.id}.open.control-room",
      label: "Open ${spec.displayName}",
      permission: "${spec.actions[0].permission.replace(".write", ".read")}",
      href: "${spec.route}",
      keywords: ${JSON.stringify([
        spec.displayName.toLowerCase(),
        spec.workspace.label.toLowerCase(),
        "business"
      ])}
    })
  ]
};
`;
}

function renderAdminPage(spec) {
  return `import React from "react";

import {
  getBusinessOverview,
  listExceptionRecords,
  listPendingDownstreamItems,
  listPrimaryRecords
} from "../../services/main.service";

export async function BusinessAdminPage() {
  const overview = await getBusinessOverview();
  const primaryRecords = (await listPrimaryRecords()).slice(0, 4);
  const exceptions = (await listExceptionRecords()).slice(0, 4);
  const pendingDownstream = (await listPendingDownstreamItems()).slice(0, 4);

  return React.createElement(
    "section",
    null,
    React.createElement("h1", null, "${spec.pageTitle}"),
    React.createElement("p", null, "${spec.pageSummary}"),
    React.createElement(
      "p",
      null,
      \`\${overview.totals.primaryRecords} records, \${overview.totals.pendingApproval} pending approval, \${overview.orchestration.inbox.pending + overview.orchestration.inbox.retrying} pending downstream actions, and \${overview.totals.openExceptions} open exceptions.\`
    ),
    React.createElement("h2", null, "Primary Records"),
    React.createElement(
      "ul",
      null,
      ...primaryRecords.map((entry) =>
        React.createElement(
          "li",
          { key: entry.id },
          \`\${entry.title} - \${entry.recordState} - \${entry.approvalState} - \${entry.fulfillmentState}\`
        )
      )
    ),
    React.createElement("h2", null, "Open Exceptions"),
    React.createElement(
      "ul",
      null,
      ...exceptions.map((entry) =>
        React.createElement("li", { key: entry.id }, \`\${entry.reasonCode} - \${entry.severity} - \${entry.status}\`)
      )
    ),
    React.createElement("h2", null, "Pending Downstream Actions"),
    React.createElement(
      "ul",
      null,
      ...pendingDownstream.map((entry) =>
        React.createElement("li", { key: entry.id }, \`\${entry.target} - \${entry.status} - attempts \${entry.attemptCount}\`)
      )
    )
  );
}
`;
}

function renderPostgresSql(spec, symbolBase, sqlPrefix) {
  return `export type ${symbolBase}SqlOptions = {
  schemaName?: string;
  dropSchema?: boolean;
};

export function build${symbolBase}MigrationSql(options: ${symbolBase}SqlOptions = {}): string[] {
  const schemaName = normalizeIdentifier(options.schemaName ?? "${sqlPrefix}", "schemaName");
  return [
    \`CREATE SCHEMA IF NOT EXISTS \${schemaName};\`,
    \`CREATE TABLE IF NOT EXISTS \${schemaName}.primary_records (id text PRIMARY KEY, tenant_id text NOT NULL, title text NOT NULL, counterparty_id text NOT NULL, company_id text NOT NULL, branch_id text NOT NULL, record_state text NOT NULL, approval_state text NOT NULL, posting_state text NOT NULL, fulfillment_state text NOT NULL, amount_minor integer NOT NULL, currency_code text NOT NULL, revision_no integer NOT NULL, reason_code text NULL, effective_at timestamptz NOT NULL, correlation_id text NOT NULL, process_id text NOT NULL, upstream_refs jsonb NOT NULL, downstream_refs jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());\`,
    \`CREATE TABLE IF NOT EXISTS \${schemaName}.secondary_records (id text PRIMARY KEY, tenant_id text NOT NULL, primary_record_id text NOT NULL, label text NOT NULL, status text NOT NULL, requested_action text NOT NULL, reason_code text NULL, correlation_id text NOT NULL, process_id text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());\`,
    \`CREATE TABLE IF NOT EXISTS \${schemaName}.exception_records (id text PRIMARY KEY, tenant_id text NOT NULL, primary_record_id text NOT NULL, severity text NOT NULL, status text NOT NULL, reason_code text NOT NULL, upstream_ref text NULL, downstream_ref text NULL, updated_at timestamptz NOT NULL DEFAULT now());\`,
    \`CREATE UNIQUE INDEX IF NOT EXISTS \${get${symbolBase}LookupIndexName()} ON \${schemaName}.primary_records (tenant_id, title, correlation_id);\`,
    \`CREATE INDEX IF NOT EXISTS \${get${symbolBase}StatusIndexName()} ON \${schemaName}.exception_records (tenant_id, status, severity);\`
  ];
}

export function build${symbolBase}RollbackSql(options: ${symbolBase}SqlOptions = {}): string[] {
  const schemaName = normalizeIdentifier(options.schemaName ?? "${sqlPrefix}", "schemaName");
  const dropSchema = options.dropSchema ?? schemaName !== "${sqlPrefix}";
  return [
    \`DROP TABLE IF EXISTS \${schemaName}.exception_records CASCADE;\`,
    \`DROP TABLE IF EXISTS \${schemaName}.secondary_records CASCADE;\`,
    \`DROP TABLE IF EXISTS \${schemaName}.primary_records CASCADE;\`,
    ...(dropSchema ? [\`DROP SCHEMA IF EXISTS \${schemaName} CASCADE;\`] : [])
  ];
}

export function get${symbolBase}LookupIndexName(): string {
  return "${sqlPrefix}_primary_lookup_idx";
}

export function get${symbolBase}StatusIndexName(): string {
  return "${sqlPrefix}_exception_status_idx";
}

function normalizeIdentifier(value: string, label: string): string {
  if (!/^[a-z][a-z0-9_]*$/i.test(value)) {
    throw new Error(\`\${label} must use simple alphanumeric or underscore SQL identifiers\`);
  }
  return value.toLowerCase();
}
`;
}

function renderSqliteSql(spec, symbolBase, sqlPrefix) {
  return `export type ${symbolBase}SqliteOptions = {
  tablePrefix?: string;
};

export function build${symbolBase}SqliteMigrationSql(options: ${symbolBase}SqliteOptions = {}): string[] {
  const tablePrefix = normalizePrefix(options.tablePrefix ?? "${sqlPrefix}_");
  return [
    \`CREATE TABLE IF NOT EXISTS \${tablePrefix}primary_records (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, title TEXT NOT NULL, counterparty_id TEXT NOT NULL, company_id TEXT NOT NULL, branch_id TEXT NOT NULL, record_state TEXT NOT NULL, approval_state TEXT NOT NULL, posting_state TEXT NOT NULL, fulfillment_state TEXT NOT NULL, amount_minor INTEGER NOT NULL, currency_code TEXT NOT NULL, revision_no INTEGER NOT NULL, reason_code TEXT NULL, effective_at TEXT NOT NULL, correlation_id TEXT NOT NULL, process_id TEXT NOT NULL, upstream_refs TEXT NOT NULL, downstream_refs TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);\`,
    \`CREATE TABLE IF NOT EXISTS \${tablePrefix}secondary_records (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, primary_record_id TEXT NOT NULL, label TEXT NOT NULL, status TEXT NOT NULL, requested_action TEXT NOT NULL, reason_code TEXT NULL, correlation_id TEXT NOT NULL, process_id TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);\`,
    \`CREATE TABLE IF NOT EXISTS \${tablePrefix}exception_records (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, primary_record_id TEXT NOT NULL, severity TEXT NOT NULL, status TEXT NOT NULL, reason_code TEXT NOT NULL, upstream_ref TEXT NULL, downstream_ref TEXT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);\`,
    \`CREATE UNIQUE INDEX IF NOT EXISTS \${get${symbolBase}SqliteLookupIndexName(tablePrefix)} ON \${tablePrefix}primary_records (tenant_id, title, correlation_id);\`,
    \`CREATE INDEX IF NOT EXISTS \${get${symbolBase}SqliteStatusIndexName(tablePrefix)} ON \${tablePrefix}exception_records (tenant_id, status, severity);\`
  ];
}

export function build${symbolBase}SqliteRollbackSql(options: ${symbolBase}SqliteOptions = {}): string[] {
  const tablePrefix = normalizePrefix(options.tablePrefix ?? "${sqlPrefix}_");
  return [
    \`DROP TABLE IF EXISTS \${tablePrefix}exception_records;\`,
    \`DROP TABLE IF EXISTS \${tablePrefix}secondary_records;\`,
    \`DROP TABLE IF EXISTS \${tablePrefix}primary_records;\`
  ];
}

export function get${symbolBase}SqliteLookupIndexName(tablePrefix = "${sqlPrefix}_"): string {
  return \`\${normalizePrefix(tablePrefix)}primary_lookup_idx\`;
}

export function get${symbolBase}SqliteStatusIndexName(tablePrefix = "${sqlPrefix}_"): string {
  return \`\${normalizePrefix(tablePrefix)}exception_status_idx\`;
}

function normalizePrefix(value: string): string {
  if (!/^[a-z][a-z0-9_]*$/i.test(value)) {
    throw new Error("tablePrefix must use simple alphanumeric or underscore SQL identifiers");
  }
  return value.toLowerCase();
}
`;
}

function renderIndex(spec, symbolBase) {
  const flowMethodExports = specActionFlowMethodExports(spec);
  const actionExports = spec.actions.map((action) => `${toCamelCaseIdentifier(action.label)}Action`);
  return `export {
  ${actionExports.join(",\n  ")},
  businessActions,
} from "./actions/default.action";
export { domainCatalog } from "./domain/catalog";
export { exceptionQueueDefinitions } from "./exceptions/catalog";
export { businessFlowDefinitions, ${flowMethodExports.join(", ")} } from "./flows/catalog";
export {
  BusinessExceptionResource,
  BusinessPrimaryResource,
  BusinessSecondaryResource,
  businessResources
} from "./resources/main.resource";
export { reportDefinitions } from "./reports/catalog";
export { scenarioDefinitions } from "./scenarios/catalog";
export {
  advancePrimaryRecordInputSchema,
  amendPrimaryRecordInputSchema,
  approvalStateSchema,
  createPrimaryRecordInputSchema,
  exceptionRecordSchema,
  fulfillmentStateSchema,
  placePrimaryRecordOnHoldInputSchema,
  postingStateSchema,
  primaryRecordSchema,
  reconcilePrimaryRecordInputSchema,
  recordStateSchema,
  releasePrimaryRecordHoldInputSchema,
  reversePrimaryRecordInputSchema,
  secondaryRecordSchema,
  type ExceptionRecord,
  type PrimaryRecord,
  type SecondaryRecord
} from "./model";
export {
  build${symbolBase}MigrationSql,
  build${symbolBase}RollbackSql,
  get${symbolBase}LookupIndexName,
  get${symbolBase}StatusIndexName
} from "./postgres";
export {
  build${symbolBase}SqliteMigrationSql,
  build${symbolBase}SqliteRollbackSql,
  get${symbolBase}SqliteLookupIndexName,
  get${symbolBase}SqliteStatusIndexName
} from "./sqlite";
export {
  advancePrimaryRecord,
  amendPrimaryRecord,
  createPrimaryRecord,
  failPendingDownstreamItem,
  getBusinessOverview,
  listDeadLetters,
  listPendingDownstreamItems,
  listProjectionRecords,
  listPublishedMessages,
  listExceptionRecords,
  listPrimaryRecords,
  listSecondaryRecords,
  placePrimaryRecordOnHold,
  replayDeadLetter,
  releasePrimaryRecordHold,
  resolvePendingDownstreamItem,
  reconcilePrimaryRecord,
  reversePrimaryRecord
} from "./services/main.service";
export { settingsSurfaceDefinitions } from "./settings/catalog";
export { jobDefinitionKeys, jobDefinitions } from "./jobs/catalog";
export { workflowDefinitionKeys, workflowDefinitions } from "./workflows/catalog";
export { adminContributions } from "./ui/admin.contributions";
export { uiSurface } from "./ui/surfaces";
export { default as manifest } from "../package";
`;
}

function renderUnitTest(spec) {
  const flowMethodImports = specActionFlowMethodExports(spec);
  const flowMethodChecks = flowMethodImports
    .map((methodName) => `expect(typeof ${methodName}).toBe("function");`)
    .join("\n    ");
  return `import { describe, expect, it } from "bun:test";
import { domainCatalog } from "../../src/domain/catalog";
import { exceptionQueueDefinitions } from "../../src/exceptions/catalog";
import { businessFlowDefinitions, ${flowMethodImports.join(", ")} } from "../../src/flows/catalog";
import { reportDefinitions } from "../../src/reports/catalog";
import { scenarioDefinitions } from "../../src/scenarios/catalog";
import { settingsSurfaceDefinitions } from "../../src/settings/catalog";
import manifest from "../../package";

describe("plugin manifest", () => {
  it("keeps a stable package id and business contract surface", () => {
    expect(manifest.id).toBe("${spec.id}");
    expect(manifest.kind).toBe("${spec.kind}");
    expect(manifest.publicCommands).toContain("${spec.publicCommands[0]}");
    expect(manifest.publicEvents).toContain("${spec.publicEvents[0]}");
  });
});

describe("domain catalog", () => {
  it("keeps ERPNext parity references and operational surfaces visible", () => {
    expect(domainCatalog.ownedEntities.length).toBeGreaterThan(0);
    expect(domainCatalog.reports.length).toBeGreaterThan(0);
    expect(domainCatalog.exceptionQueues.length).toBeGreaterThan(0);
    expect(domainCatalog.operationalScenarios.length).toBeGreaterThan(0);
    expect(reportDefinitions).toHaveLength(domainCatalog.reports.length);
    expect(exceptionQueueDefinitions).toHaveLength(domainCatalog.exceptionQueues.length);
    expect(scenarioDefinitions).toHaveLength(domainCatalog.operationalScenarios.length);
    expect(settingsSurfaceDefinitions).toHaveLength(domainCatalog.settingsSurfaces.length);
    expect(businessFlowDefinitions).toHaveLength(manifest.publicCommands.length);
    ${flowMethodChecks}
  });
});
`;
}

function renderUiContractTest(spec) {
  return `import { describe, expect, it } from "bun:test";

import { uiSurface } from "../../src/ui/surfaces";

describe("${spec.id} ui surface", () => {
  it("mounts the business control room", () => {
    expect(uiSurface.embeddedPages[0]?.route).toBe("${spec.route}");
  });
});
`;
}

function renderIntegrationTest(spec) {
  return `import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  advancePrimaryRecord,
  amendPrimaryRecord,
  createPrimaryRecord,
  placePrimaryRecordOnHold,
  getBusinessOverview,
  listExceptionRecords,
  listDeadLetters,
  listPendingDownstreamItems,
  listProjectionRecords,
  listPrimaryRecords,
  listSecondaryRecords,
  failPendingDownstreamItem,
  replayDeadLetter,
  releasePrimaryRecordHold,
  resolvePendingDownstreamItem,
  reconcilePrimaryRecord,
  reversePrimaryRecord
} from "../../src/services/main.service";

describe("${spec.id} lifecycle integration", () => {
  const previousStateDir = process.env.GUTU_STATE_DIR;
  let stateDir = "";

  beforeEach(() => {
    stateDir = mkdtempSync(join(tmpdir(), "${spec.id}-"));
    process.env.GUTU_STATE_DIR = stateDir;
  });

  afterEach(() => {
    if (previousStateDir === undefined) {
      delete process.env.GUTU_STATE_DIR;
    } else {
      process.env.GUTU_STATE_DIR = previousStateDir;
    }
    rmSync(stateDir, { recursive: true, force: true });
  });

  it("creates, advances, and reconciles a governed business record", async () => {
    const created = await createPrimaryRecord({
      tenantId: "tenant_demo",
      actorId: "actor_admin",
      recordId: "${spec.id}:demo",
      title: "${spec.displayName} Demo",
      counterpartyId: "party_demo",
      companyId: "company_demo",
      branchId: "branch_demo",
      amountMinor: 4200,
      currencyCode: "USD",
      effectiveAt: "2026-04-23T00:00:00.000Z",
      correlationId: "${spec.id}:corr",
      processId: "${spec.workflow.id}:demo"
    });

    expect(created.recordState).toBe("active");
    expect(created.approvalState).toBe("pending");
    expect(created.revisionNo).toBe(1);

    const advanced = await advancePrimaryRecord({
      tenantId: "tenant_demo",
      actorId: "actor_admin",
      recordId: "${spec.id}:demo",
      expectedRevisionNo: 1,
      approvalState: "approved",
      postingState: "posted",
      fulfillmentState: "partial",
      downstreamRef: "downstream:1"
    });

    expect(advanced.approvalState).toBe("approved");
    expect(advanced.postingState).toBe("posted");
    expect(advanced.revisionNo).toBe(2);
    expect((await listSecondaryRecords()).length).toBeGreaterThan(0);
    const pendingAfterAdvance = await listPendingDownstreamItems();
    expect(pendingAfterAdvance.length).toBeGreaterThan(0);

    const failed = await failPendingDownstreamItem({
      tenantId: "tenant_demo",
      actorId: "actor_admin",
      inboxId: pendingAfterAdvance[0]?.id as string,
      error: "downstream-unavailable",
      maxAttempts: 1
    });

    expect(failed.status).toBe("dead-letter");
    const deadLetters = await listDeadLetters();
    expect(deadLetters).toHaveLength(1);

    const replayed = await replayDeadLetter({
      tenantId: "tenant_demo",
      actorId: "actor_admin",
      deadLetterId: deadLetters[0]?.id as string
    });

    expect(replayed.status).toBe("retrying");

    const reconciled = await reconcilePrimaryRecord({
      tenantId: "tenant_demo",
      actorId: "actor_admin",
      recordId: "${spec.id}:demo",
      exceptionId: "${spec.id}:exception",
      expectedRevisionNo: 2,
      severity: "medium",
      reasonCode: "follow-up-required",
      downstreamRef: "repair:1"
    });

    expect(reconciled.status).toBe("open");
    expect(reconciled.revisionNo).toBe(3);
    for (const item of await listPendingDownstreamItems()) {
      await resolvePendingDownstreamItem({
        tenantId: "tenant_demo",
        actorId: "actor_admin",
        inboxId: item.id,
        resolutionRef: \`resolved:\${item.target}\`
      });
    }

    const held = await placePrimaryRecordOnHold({
      tenantId: "tenant_demo",
      actorId: "actor_admin",
      recordId: "${spec.id}:demo",
      expectedRevisionNo: 3,
      reasonCode: "manual-hold"
    });
    expect(held.status).toBe("open");

    const released = await releasePrimaryRecordHold({
      tenantId: "tenant_demo",
      actorId: "actor_admin",
      recordId: "${spec.id}:demo",
      expectedRevisionNo: 4,
      reasonCode: "manual-release"
    });
    expect(released.status).toBe("closed");

    const amended = await amendPrimaryRecord({
      tenantId: "tenant_demo",
      actorId: "actor_admin",
      recordId: "${spec.id}:demo",
      amendedRecordId: "${spec.id}:demo:amended",
      expectedRevisionNo: 5,
      title: "${spec.displayName} Demo Amendment",
      reasonCode: "commercial-correction"
    });
    expect(amended.amendedRecordId).toBe("${spec.id}:demo:amended");

    const reversed = await reversePrimaryRecord({
      tenantId: "tenant_demo",
      actorId: "actor_admin",
      recordId: "${spec.id}:demo:amended",
      reversalRecordId: "${spec.id}:demo:amended:reversal",
      expectedRevisionNo: 1,
      reasonCode: "cancel-amendment"
    });
    expect(reversed.reversalRecordId).toBe("${spec.id}:demo:amended:reversal");

    for (const item of await listPendingDownstreamItems()) {
      await resolvePendingDownstreamItem({
        tenantId: "tenant_demo",
        actorId: "actor_admin",
        inboxId: item.id,
        resolutionRef: \`resolved:\${item.target}\`
      });
    }

    expect((await listPrimaryRecords()).length).toBeGreaterThanOrEqual(4);
    expect((await listExceptionRecords()).length).toBeGreaterThanOrEqual(1);
    expect((await listProjectionRecords()).length).toBeGreaterThanOrEqual(5);
    expect(await listPendingDownstreamItems()).toHaveLength(0);
    expect((await getBusinessOverview()).totals.openExceptions).toBe(0);
    expect((await getBusinessOverview()).orchestration.deadLetters).toBe(0);
  });
});
`;
}

function renderPostgresMigrationTest(spec, symbolBase, sqlPrefix) {
  return `import { describe, expect, it } from "bun:test";

import {
  build${symbolBase}MigrationSql,
  build${symbolBase}RollbackSql,
  get${symbolBase}LookupIndexName,
  get${symbolBase}StatusIndexName
} from "../../src/postgres";

describe("${spec.id} postgres helpers", () => {
  it("creates the business tables and indexes", () => {
    const sql = build${symbolBase}MigrationSql().join("\\n");

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS ${sqlPrefix}.primary_records");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS ${sqlPrefix}.secondary_records");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS ${sqlPrefix}.exception_records");
    expect(sql).toContain(get${symbolBase}LookupIndexName());
    expect(sql).toContain(get${symbolBase}StatusIndexName());
  });

  it("rolls the schema back safely", () => {
    const sql = build${symbolBase}RollbackSql({ schemaName: "${sqlPrefix}_preview", dropSchema: true }).join("\\n");
    expect(sql).toContain("DROP TABLE IF EXISTS ${sqlPrefix}_preview.exception_records");
    expect(sql).toContain("DROP SCHEMA IF EXISTS ${sqlPrefix}_preview CASCADE");
  });
});
`;
}

function renderSqliteMigrationTest(spec, symbolBase, sqlPrefix) {
  return `import { describe, expect, it } from "bun:test";

import {
  build${symbolBase}SqliteMigrationSql,
  build${symbolBase}SqliteRollbackSql,
  get${symbolBase}SqliteLookupIndexName,
  get${symbolBase}SqliteStatusIndexName
} from "../../src/sqlite";

describe("${spec.id} sqlite helpers", () => {
  it("creates the business tables and indexes", () => {
    const sql = build${symbolBase}SqliteMigrationSql().join("\\n");

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS ${sqlPrefix}_primary_records");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS ${sqlPrefix}_secondary_records");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS ${sqlPrefix}_exception_records");
    expect(sql).toContain(get${symbolBase}SqliteLookupIndexName("${sqlPrefix}_"));
    expect(sql).toContain(get${symbolBase}SqliteStatusIndexName("${sqlPrefix}_"));
  });

  it("rolls the sqlite tables back safely", () => {
    const sql = build${symbolBase}SqliteRollbackSql({ tablePrefix: "${sqlPrefix}_preview_" }).join("\\n");
    expect(sql).toContain("DROP TABLE IF EXISTS ${sqlPrefix}_preview_exception_records");
  });
});
`;
}

function renderPackManifest(spec) {
  return `${JSON.stringify(
    {
      packType: spec.packType,
      name: `${spec.packageDir}-${spec.packType}`,
      version: "0.1.0",
      publisher: "gutula",
      platformVersion: ">=0.1.0 <1.0.0",
      pluginConstraints: {
        [spec.packageDir]: "^0.1.0"
      },
      dependsOnPacks: [],
      mergePolicy: {
        settings: "merge",
        workflows: "replace",
        views: "patch",
        masters: "upsert"
      },
      trustTier: "internal-signed",
      compatibilityChannel: "next",
      dryRunSupported: true,
      rollbackStrategy: "inverse-patch",
      environmentScope: spec.stage === "P0" ? "base" : "sector",
      signaturesFile: "signatures.json",
      dependenciesFile: "dependencies.json"
    },
    null,
    2
  )}\n`;
}

function renderPackDependencies(spec) {
  return `${JSON.stringify(
    {
      plugin: spec.packageDir,
      requiredPlugins: spec.dependsOn,
      requiredCapabilities: spec.requestedCapabilities
    },
    null,
    2
  )}\n`;
}

function renderPackSignatures(spec) {
  return `${JSON.stringify(
    {
      signed: false,
      note: `${spec.displayName} scaffold pack requires signing before production promotion.`
    },
    null,
    2
  )}\n`;
}

function renderPackDefaults(spec) {
  return `${JSON.stringify(
    {
      workspace: spec.workspace.id,
      route: spec.route,
      pageTitle: spec.pageTitle,
      defaultRecordState: "draft",
      defaultApprovalState: "pending",
      defaultPostingState: "unposted",
      defaultFulfillmentState: "none"
    },
    null,
    2
  )}\n`;
}

function renderPackReports(spec) {
  return `${JSON.stringify(
    {
      pluginId: spec.id,
      reports: spec.domainCatalog.reports,
      exceptionQueues: spec.domainCatalog.exceptionQueues,
      operationalScenarios: spec.domainCatalog.operationalScenarios
    },
    null,
    2
  )}\n`;
}

function renderPackAutomation(spec) {
  return `${JSON.stringify(
    {
      automationId: `${spec.id}.reconciliation.default`,
      trigger: "exception-record-opened",
      action: spec.jobs[1]?.id ?? spec.jobs[0]?.id ?? `${spec.id}.reconciliation.run`,
      queues: spec.domainCatalog.exceptionQueues
    },
    null,
    2
  )}\n`;
}

function renderPackWorkflow(spec) {
  return `${JSON.stringify(
    {
      workflowId: spec.workflow.id,
      actors: spec.workflow.actors,
      description: spec.workflow.description
    },
    null,
    2
  )}\n`;
}

function renderPackValidation(spec) {
  return `${JSON.stringify(
    {
      packageId: spec.id,
      packName: `${spec.packageDir}-${spec.packType}`,
      expectedActions: spec.actions.map((entry) => entry.id),
      expectedResources: spec.resources.map((entry) => entry.id),
      expectedReports: spec.domainCatalog.reports,
      expectedExceptionQueues: spec.domainCatalog.exceptionQueues
    },
    null,
    2
  )}\n`;
}

function renderSecurity() {
  return `# Security Policy

Report security issues privately to the maintainers before opening a public issue.

This repository contains a first-party Gutu package. Treat package contracts, tenant and permission boundaries, runtime or workflow state, release metadata, and published artifacts as security-sensitive surfaces.

When reporting an issue, include the affected package surface, the expected boundary or policy behavior, reproduction steps, and whether the problem affects docs truth, runtime behavior, or release artifacts.
`;
}

function renderContributing() {
  return `# Contributing

This repository is a standalone first-party Gutu package repo.

## Rules

- Keep package manifests, exports, docs, and verification lanes aligned in the same change.
- Keep cross-repo integration explicit through declared contracts and published package boundaries rather than hidden workspace-only coupling.
- Update \`README.md\`, \`DEVELOPER.md\`, \`TODO.md\`, and \`SECURITY.md\` whenever shipped behavior or operational boundaries change.

## Verification

Run:

\`\`\`bash
bun install
bun run docs:check
bun run build
bun run typecheck
bun run lint
bun run test
\`\`\`
`;
}

function renderGitIgnore() {
  return `node_modules/
dist/
artifacts/
coverage/
.DS_Store
*.tsbuildinfo
.tmp/
.gutu/
`;
}

function renderEslintConfig() {
  return `import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["old_contents/**", "node_modules/**", "dist/**", "coverage/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
);
`;
}

function toPascalCase(value) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

function toCamelCaseIdentifier(value) {
  const tokens = value
    .split(/[^A-Za-z0-9]+/g)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.toLowerCase());

  if (tokens.length === 0) {
    return "runBusinessFlow";
  }

  const [first, ...rest] = tokens;
  return `${first}${rest.map((token) => token.charAt(0).toUpperCase() + token.slice(1)).join("")}`;
}

function specActionFlowMethodExports(spec) {
  return spec.actions.map((action) => toCamelCaseIdentifier(action.label));
}

void readFileSync;
