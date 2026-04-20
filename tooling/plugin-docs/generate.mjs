import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  badgeFor,
  dbColor,
  discoverPluginFacts,
  integrationColor,
  listInternalDocPaths,
  maturityColor,
  sortFactsByGroup,
  toMarkdownTable,
  verificationColor
} from "./lib.mjs";
import { pluginGroupOrder } from "./profiles.mjs";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const pluginsRoot = join(workspaceRoot, "plugins");
const catalogRoot = join(workspaceRoot, "catalogs", "gutu-plugins");

main();

function main() {
  const factsList = sortFactsByGroup(discoverPluginFacts(workspaceRoot));

  for (const facts of factsList) {
    writeRootPackageJson(facts);
    writeRepoScripts(facts);
    writeFile(join(facts.repoRoot, "README.md"), renderReadme(facts));
    writeFile(join(facts.repoRoot, "DEVELOPER.md"), renderDeveloperDoc(facts));
    writeFile(join(facts.repoRoot, "TODO.md"), renderTodo(facts));
    writeInternalDocs(facts);
  }

  writeFile(join(catalogRoot, "README.md"), renderCatalogReadme(factsList));
}

function writeRootPackageJson(facts) {
  const existing = JSON.parse(readFileSync(facts.rootPackageJsonPath, "utf8"));
  const nestedRelative = join("framework", "builtin-plugins", facts.packageDirName).replaceAll("\\", "/");
  const orderedScripts = {};

  for (const name of ["build", "typecheck", "lint", "test"]) {
    if (facts.nestedScripts[name]) {
      orderedScripts[name] = `bun --cwd ${nestedRelative} run ${name}`;
    }
  }

  for (const name of Object.keys(facts.nestedScripts).filter((entry) => entry.startsWith("test:")).sort()) {
    orderedScripts[name] = `bun --cwd ${nestedRelative} run ${name}`;
  }

  if (facts.tests.byLane.integration.length && !orderedScripts["test:integration"]) {
    orderedScripts["test:integration"] = `bun --cwd ${nestedRelative} test tests/integration`;
  }

  if (facts.tests.byLane.migrations.length && !orderedScripts["test:migrations"]) {
    orderedScripts["test:migrations"] = `bun --cwd ${nestedRelative} test tests/migrations`;
  }

  orderedScripts["docs:summary"] = "node scripts/docs-summary.mjs";
  orderedScripts["docs:check"] = "node scripts/docs-check.mjs";

  const next = {
    ...existing,
    scripts: orderedScripts
  };

  writeFile(facts.rootPackageJsonPath, `${JSON.stringify(next, null, 2)}\n`);
}

function writeRepoScripts(facts) {
  const scriptsDir = join(facts.repoRoot, "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  writeFile(join(scriptsDir, "docs-summary.mjs"), renderDocsSummaryScript(facts));
  writeFile(join(scriptsDir, "docs-check.mjs"), renderDocsCheckScript(facts));
}

function writeInternalDocs(facts) {
  const docsDir = join(facts.packageDir, "docs");
  mkdirSync(docsDir, { recursive: true });
  writeFile(join(docsDir, "AGENT_CONTEXT.md"), renderAgentContext(facts));
  writeFile(join(docsDir, "BUSINESS_RULES.md"), renderBusinessRules(facts));
  writeFile(join(docsDir, "EDGE_CASES.md"), renderEdgeCases(facts));
  writeFile(join(docsDir, "FLOWS.md"), renderFlowsDoc(facts));
  writeFile(join(docsDir, "GLOSSARY.md"), renderGlossaryDoc(facts));
  writeFile(join(docsDir, "MANDATORY_STEPS.md"), renderMandatoryStepsDoc(facts));
}

function renderReadme(facts) {
  const repoUrl = `https://github.com/gutula/${facts.repoName}`;
  const docLinks = [
    `[DEVELOPER.md](./DEVELOPER.md)`,
    `[TODO.md](./TODO.md)`,
    `[SECURITY.md](./SECURITY.md)`,
    `[CONTRIBUTING.md](./CONTRIBUTING.md)`
  ].join(", ");

  const capabilityRows = [
    [
      "Actions",
      facts.actions.length,
      facts.actions.length ? facts.actions.map((entry) => `\`${entry.id}\``).join(", ") : "None exported today"
    ],
    [
      "Resources",
      facts.resources.length,
      facts.resources.length ? facts.resources.map((entry) => `\`${entry.id}\``).join(", ") : "None exported today"
    ],
    [
      "Jobs",
      facts.jobs.length,
      facts.jobs.length ? facts.jobs.map((entry) => `\`${entry.id}\``).join(", ") : "No job catalog exported"
    ],
    [
      "Workflows",
      facts.workflows.length,
      facts.workflows.length ? facts.workflows.map((entry) => `\`${entry.id}\``).join(", ") : "No workflow catalog exported"
    ],
    [
      "UI",
      facts.surfaces.hasAdminContributions || facts.surfaces.hasUiSurface ? "Present" : "None",
      describeUiSurface(facts)
    ]
  ];

  const dependencyRows = [
    ["Package", `\`${facts.nestedPackageName}\``],
    ["Manifest ID", `\`${facts.packageId}\``],
    ["Repo", `[${facts.repoName}](${repoUrl})`],
    ["Depends On", facts.dependsOn.length ? facts.dependsOn.map((entry) => `\`${entry}\``).join(", ") : "None"],
    [
      "Requested Capabilities",
      facts.requestedCapabilities.length
        ? facts.requestedCapabilities.map((entry) => `\`${entry}\``).join(", ")
        : "None declared"
    ],
    [
      "Provided Capabilities",
      facts.providesCapabilities.length
        ? facts.providesCapabilities.map((entry) => `\`${entry}\``).join(", ")
        : "None declared"
    ],
    ["Runtime", facts.compatibility.runtime || "Not declared"],
    ["Database", facts.compatibility.db.length ? facts.compatibility.db.join(", ") : "No DB contract declared"],
    ["Integration Model", facts.integrationModel]
  ];

  return `# ${facts.displayName}

${facts.description}

${renderBadgeRow(facts)}

## What It Does Now

${facts.profile.architectureRole}

${facts.currentCapabilities.map((entry) => `- ${entry}`).join("\n")}

## Maturity

**Maturity Tier:** \`${facts.maturity}\`

${renderMaturityReason(facts)}

## Verified Capability Summary

- Group: **${facts.profile.group}**
- Verification surface: **${facts.verificationLabel}**
- Tests discovered: **${facts.tests.files.length}** total files across unit, contract${facts.tests.byLane.integration.length ? ", integration" : ""}${facts.tests.byLane.migrations.length ? ", migration" : ""} lanes
- Integration model: **${facts.integrationModel}**
- Database support: **${facts.compatibility.db.length ? facts.compatibility.db.join(" + ") : "None declared"}**

## Dependency And Compatibility Summary

${toMarkdownTable(["Field", "Value"], dependencyRows)}

## Capability Matrix

${toMarkdownTable(["Surface", "Count", "Details"], capabilityRows)}

## Quick Start For Integrators

Use this repo inside a **compatible Gutu workspace** or the **ecosystem certification workspace** so its \`workspace:*\` dependencies resolve honestly.

\`\`\`bash
# from a compatible workspace that already includes this plugin's dependency graph
bun install
bun run build
bun run test
bun run docs:check
\`\`\`

\`\`\`ts
import { ${buildImportList(facts)} } from "${facts.nestedPackageName}";

console.log(manifest.id);
${facts.actions[0] ? `console.log(${facts.actions[0].symbol}.id);` : ""}
${facts.resources[0] ? `console.log(${facts.resources[0].symbol}.id);` : ""}
\`\`\`

Use the root repo scripts for day-to-day work **after the workspace is bootstrapped**, or run the nested package directly from \`${relativeFromRepoRoot(
    facts,
    facts.packageDir
)}\` if you need lower-level control.

## Current Test Coverage

${renderTestCoverageBullets(facts)}

## Known Boundaries And Non-Goals

${facts.nonGoals.map((entry) => `- ${entry}`).join("\n")}
- Cross-plugin composition should use Gutu command, event, job, and workflow primitives. This repo should not be documented as exposing a generic WordPress-style hook system unless one is explicitly exported.

## Recommended Next Milestones

${facts.recommendedNext.map((entry) => `- ${entry}`).join("\n")}

## More Docs

See ${docLinks}. The internal domain sources used to build those docs live under:

${listInternalDocPaths(facts).map((entry) => `- \`${entry}\``).join("\n")}
`;
}

function renderDeveloperDoc(facts) {
  const manifestRows = [
    ["Package Name", `\`${facts.nestedPackageName}\``],
    ["Manifest ID", `\`${facts.packageId}\``],
    ["Display Name", facts.displayName],
    ["Version", `\`${facts.manifestVersion}\``],
    ["Kind", `\`${facts.manifestKind}\``],
    ["Trust Tier", `\`${facts.trustTier}\``],
    ["Review Tier", `\`${facts.reviewTier}\``],
    ["Isolation Profile", `\`${facts.isolationProfile}\``],
    ["Framework Compatibility", facts.compatibility.framework || "Not declared"],
    ["Runtime Compatibility", facts.compatibility.runtime || "Not declared"],
    ["Database Compatibility", facts.compatibility.db.length ? facts.compatibility.db.join(", ") : "None declared"]
  ];

  const dependencyRows = [
    ["Depends On", renderCodeList(facts.dependsOn)],
    ["Requested Capabilities", renderCodeList(facts.requestedCapabilities)],
    ["Provides Capabilities", renderCodeList(facts.providesCapabilities)],
    ["Owns Data", renderCodeList(facts.ownsData)]
  ];

  const surfaceRows = [
    ...facts.actions.map((action) => [
      `Action`,
      `\`${action.id}\``,
      action.permission ? `Permission: \`${action.permission}\`` : "No explicit permission metadata",
      [
        action.description,
        action.businessPurpose ? `Purpose: ${action.businessPurpose}` : "",
        action.idempotent === true ? "Idempotent" : action.idempotent === false ? "Non-idempotent" : "",
        action.audit === true ? "Audited" : ""
      ]
        .filter(Boolean)
        .join("<br>")
    ]),
    ...facts.resources.map((resource) => [
      `Resource`,
      `\`${resource.id}\``,
      resource.portalEnabled === true ? "Portal enabled" : "Portal disabled",
      [
        resource.description,
        resource.businessPurpose ? `Purpose: ${resource.businessPurpose}` : "",
        resource.adminAutoCrud === true ? "Admin auto-CRUD enabled" : "",
        resource.fields.length ? `Fields: ${resource.fields.map((entry) => `\`${entry}\``).join(", ")}` : ""
      ]
        .filter(Boolean)
        .join("<br>")
    ])
  ];

  const jobRows = facts.jobs.map((job) => [
    `\`${job.id}\``,
    `\`${job.queue}\``,
    job.retryAttempts ? `${job.retryAttempts} attempts / ${job.retryBackoff ?? "unspecified"} backoff` : "Retry policy not declared",
    job.timeoutMs ? `${job.timeoutMs} ms` : "No timeout declared"
  ]);

  const workflowRows = facts.workflows.map((workflow) => [
    `\`${workflow.id}\``,
    workflow.actors.length ? workflow.actors.map((entry) => `\`${entry}\``).join(", ") : "No actors declared",
    workflow.states.length ? workflow.states.map((entry) => `\`${entry}\``).join(", ") : "No states declared",
    workflow.businessPurpose || workflow.description || "No description declared"
  ]);

  const uiRows = [
    ["UI Surface", facts.surfaces.hasUiSurface ? "Yes" : "No", facts.surfaces.hasUiSurface ? "A bounded UI surface export is present." : "No UI surface export."],
    [
      "Admin Contributions",
      facts.surfaces.hasAdminContributions ? "Yes" : "No",
      facts.surfaces.hasAdminContributions
        ? "Additional admin workspace contributions are exported."
        : "Only the baseline surface is exported."
    ],
    [
      "Zone/Canvas Extension",
      facts.surfaces.hasZoneContribution ? "Yes" : "No",
      facts.surfaces.hasZoneContribution ? "A dedicated zone or canvas extension export exists." : "No dedicated zone extension export."
    ]
  ];

  return `# ${facts.displayName} Developer Guide

${facts.description}

**Maturity Tier:** \`${facts.maturity}\`

## Purpose And Architecture Role

${facts.profile.architectureRole}

### This plugin is the right fit when

- You need ${facts.profile.focusAreas.map((entry) => `**${entry}**`).join(", ")} as a governed domain boundary.
- You want to integrate through declared actions, resources, jobs, workflows, and UI surfaces instead of implicit side effects.
- You need the host application to keep plugin boundaries honest through manifest capabilities, permissions, and verification lanes.

### This plugin is intentionally not

${facts.nonGoals.map((entry) => `- ${entry}`).join("\n")}

## Repo Map

${toMarkdownTable(
    ["Path", "Purpose"],
    [
      ["`package.json`", "Root extracted-repo manifest, workspace wiring, and repo-level script entrypoints."],
      [`\`${relativeFromRepoRoot(facts, facts.packageDir)}\``, "Nested publishable plugin package."],
      [`\`${relativeFromRepoRoot(facts, join(facts.packageDir, "src"))}\``, "Runtime source, actions, resources, services, and UI exports."],
      [`\`${relativeFromRepoRoot(facts, join(facts.packageDir, "tests"))}\``, "Unit, contract, integration, and migration coverage where present."],
      [`\`${relativeFromRepoRoot(facts, join(facts.packageDir, "docs"))}\``, "Internal domain-doc source set kept in sync with this guide."],
      [renderCodePath(relativeFromRepoRoot(facts, join(facts.packageDir, "db", "schema.ts"))), "Database schema contract when durable state is owned."],
      [renderCodePath(relativeFromRepoRoot(facts, join(facts.packageDir, "src", "postgres.ts"))), "SQL migration and rollback helpers when exported."]
    ]
  )}

## Manifest Contract

${toMarkdownTable(["Field", "Value"], manifestRows)}

## Dependency Graph And Capability Requests

${toMarkdownTable(["Field", "Value"], dependencyRows)}

### Dependency interpretation

- Direct plugin dependencies describe package-level coupling that must already be present in the host graph.
- Requested capabilities tell the host what platform services or sibling plugins this package expects to find.
- Provided capabilities and owned data tell integrators what this package is authoritative for.

## Public Integration Surfaces

${toMarkdownTable(["Type", "ID / Symbol", "Access / Mode", "Notes"], surfaceRows)}

${facts.jobs.length ? `### Job Catalog\n\n${toMarkdownTable(["Job", "Queue", "Retry", "Timeout"], jobRows)}\n` : ""}

${facts.workflows.length ? `### Workflow Catalog\n\n${toMarkdownTable(["Workflow", "Actors", "States", "Purpose"], workflowRows)}\n` : ""}

### UI Surface Summary

${toMarkdownTable(["Surface", "Present", "Notes"], uiRows)}

## Hooks, Events, And Orchestration

This plugin should be integrated through **explicit commands/actions, resources, jobs, workflows, and the surrounding Gutu event runtime**. It must **not** be documented as a generic WordPress-style hook system unless such a hook API is explicitly exported.

${renderOrchestrationDetails(facts)}

## Storage, Schema, And Migration Notes

- Database compatibility: ${facts.compatibility.db.length ? facts.compatibility.db.map((entry) => `\`${entry}\``).join(", ") : "No database contract declared."}
- Schema file: ${renderCodePath(relativeFromRepoRoot(facts, join(facts.packageDir, "db", "schema.ts")))}
- SQL helper file: ${renderCodePath(relativeFromRepoRoot(facts, join(facts.packageDir, "src", "postgres.ts")))}
- Migration lane present: ${facts.tests.byLane.migrations.length ? "Yes" : "No"}

${facts.surfaces.hasPostgresHelpers
    ? "The plugin ships explicit SQL helper exports. Use those helpers as the truth source for database migration or rollback expectations."
    : "The plugin does not export a dedicated SQL helper module today. Treat the schema and resources as the durable contract instead of inventing undocumented SQL behavior."}

## Failure Modes And Recovery

${renderFailureModes(facts)}

## Mermaid Flows

### Primary Lifecycle

\`\`\`mermaid
${renderPrimaryFlow(facts)}
\`\`\`

${facts.workflows.length ? `### Workflow State Machine\n\n\`\`\`mermaid\n${renderWorkflowFlow(facts)}\n\`\`\`\n` : ""}

## Integration Recipes

### 1. Host wiring

\`\`\`ts
import { ${buildImportList(facts)} } from "${facts.nestedPackageName}";

export const pluginSurface = {
  manifest,
  ${facts.actions[0] ? `${facts.actions[0].symbol},` : ""}
  ${facts.resources[0] ? `${facts.resources[0].symbol},` : ""}
  ${facts.jobs.length ? "jobDefinitions," : ""}
  ${facts.workflows.length ? "workflowDefinitions," : ""}
  ${facts.surfaces.hasAdminContributions ? "adminContributions," : ""}
  ${facts.surfaces.hasUiSurface ? "uiSurface" : ""}
};
\`\`\`

Use this pattern when your host needs to register the plugin’s declared exports without reaching into internal file paths.

### 2. Action-first orchestration

\`\`\`ts
import { manifest${facts.actions[0] ? `, ${facts.actions[0].symbol}` : ""} } from "${facts.nestedPackageName}";

console.log("plugin", manifest.id);
${facts.actions[0] ? `console.log("action", ${facts.actions[0].symbol}.id);` : `// No action export is currently published by this plugin.`}
\`\`\`

- Prefer action IDs as the stable integration boundary.
- Respect the declared permission, idempotency, and audit metadata instead of bypassing the service layer.
- Treat resource IDs as the read-model boundary for downstream consumers.

### 3. Cross-plugin composition

${renderCompositionRecipe(facts)}

## Test Matrix

${toMarkdownTable(
    ["Lane", "Present", "Evidence"],
    [
      ["Build", facts.nestedScripts.build ? "Yes" : "No", facts.nestedScripts.build ? "`bun run build`" : "No build script exported"],
      ["Typecheck", facts.nestedScripts.typecheck ? "Yes" : "No", facts.nestedScripts.typecheck ? "`bun run typecheck`" : "No typecheck script exported"],
      ["Lint", facts.nestedScripts.lint ? "Yes" : "No", facts.nestedScripts.lint ? "`bun run lint`" : "No lint script exported"],
      ["Test", facts.nestedScripts.test ? "Yes" : "No", facts.nestedScripts.test ? "`bun run test`" : "No test script exported"],
      ["Unit", facts.tests.byLane.unit.length ? "Yes" : "No", facts.tests.byLane.unit.length ? `${facts.tests.byLane.unit.length} file(s)` : "No unit files found"],
      ["Contracts", facts.tests.byLane.contracts.length ? "Yes" : "No", facts.tests.byLane.contracts.length ? `${facts.tests.byLane.contracts.length} file(s)` : "No contract files found"],
      ["Integration", facts.tests.byLane.integration.length ? "Yes" : "No", facts.tests.byLane.integration.length ? `${facts.tests.byLane.integration.length} file(s)` : "No integration files found"],
      ["Migrations", facts.tests.byLane.migrations.length ? "Yes" : "No", facts.tests.byLane.migrations.length ? `${facts.tests.byLane.migrations.length} file(s)` : "No migration files found"]
    ]
  )}

### Verification commands

${facts.verificationCommands.map((entry) => `- \`${entry}\``).join("\n")}

## Current Truth And Recommended Next

### Current truth

${facts.currentCapabilities.map((entry) => `- ${entry}`).join("\n")}

### Current gaps

${facts.currentGaps.length ? facts.currentGaps.map((entry) => `- ${entry}`).join("\n") : "- No extra gaps were discovered beyond the plugin’s declared boundaries."}

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

${facts.currentGaps.length ? facts.currentGaps.map((entry) => `- ${entry}`).join("\n") : "- No additional gaps were identified beyond the plugin’s stated non-goals."}

## Recommended Next

${facts.recommendedNext.map((entry) => `- ${entry}`).join("\n")}

## Later / Optional

${facts.laterOptional.map((entry) => `- ${entry}`).join("\n")}
`;
}

function renderAgentContext(facts) {
  return `# ${facts.displayName} Agent Context

## Mission

${facts.profile.architectureRole}

## Code map

- Package root: \`${relativeFromRepoRoot(facts, facts.packageDir)}\`
- Service layer: ${renderCodePath(relativeFromRepoRoot(facts, join(facts.packageDir, "src", "services", "main.service.ts")))}
- Action layer: ${renderCodePath(relativeFromRepoRoot(facts, join(facts.packageDir, "src", "actions", "default.action.ts")))}
- Resource layer: ${renderCodePath(relativeFromRepoRoot(facts, join(facts.packageDir, "src", "resources", "main.resource.ts")))}
- UI layer: ${renderCodePath(relativeFromRepoRoot(facts, join(facts.packageDir, "src", "ui")))}

## Safe assumptions

- Use \`${facts.packageId}\` as the stable plugin identifier and \`${facts.nestedPackageName}\` as the package import name.
- Treat declared actions and resources as the public integration surface before reaching into services.
- Prefer explicit command, event, job, and workflow orchestration over undocumented side effects.

## Forbidden claims

- Do not document generic WordPress-style hooks unless they are explicitly exported.
- Do not promise live external connectors, distributed worker infrastructure, or portal/admin surfaces that are not present in the code.
- Do not claim a higher maturity tier than \`${facts.maturity}\` without adding the missing verification and operational depth first.

## Verification

${facts.verificationCommands.map((entry) => `- \`${entry}\``).join("\n")}
`;
}

function renderBusinessRules(facts) {
  return `# ${facts.displayName} Business Rules

## Invariants

- The plugin remains authoritative only for the data declared in \`${facts.packageId}\` and its owned resource set.
- Integrators must respect the declared permission and idempotency semantics of each exported action.
- Cross-plugin automation must use explicit commands, resources, jobs, or workflows instead of hidden coupling.

## Lifecycle notes

- This plugin currently exports ${facts.actions.length} action(s), ${facts.resources.length} resource(s), ${facts.jobs.length} job definition(s), and ${facts.workflows.length} workflow definition(s).
- Durable data behavior is bounded by the declared schema and compatibility contract: ${facts.compatibility.db.length ? facts.compatibility.db.join(", ") : "no explicit database contract"}.
- Maturity is currently assessed as \`${facts.maturity}\`, which means the documentation and operational promises must stay within that boundary.

## Actor expectations

- Host applications own installation, manifest solving, and runtime registration.
- Operators and automation should invoke exported actions or follow the job/workflow catalog instead of mutating state ad hoc.
- Contributors should keep README, DEVELOPER, TODO, and nested docs synchronized whenever the public contract changes.

## Decision boundaries

- Safe retries are only those already supported by the action/job semantics documented in this repo.
- Human or operator review is still expected whenever the exported surface does not provide an explicit automation contract.
- Future roadmap ideas belong in the recommended-next section, not in current-capability claims.
`;
}

function renderEdgeCases(facts) {
  const bullets = [
    "Validation or permission failures should stop at the action boundary instead of creating partial downstream state.",
    facts.serviceSignals.returnsEvents || facts.serviceSignals.returnsJobs
      ? "If the service returns lifecycle events or jobs, hosts must treat those envelopes as part of the result contract and not silently drop them."
      : "This plugin does not currently publish a separate lifecycle event or job envelope from its services, so hosts should not assume one exists.",
    facts.tests.byLane.migrations.length
      ? "Migration coverage exists; schema changes should keep that lane green."
      : "Schema ownership exists without a dedicated migration lane, so schema changes need extra review and future hardening.",
    facts.surfaces.hasAdminContributions
      ? "Admin contribution regressions can hide critical operator entrypoints even when the core action/resource contracts still compile."
      : "UI regressions remain bounded to the published surface; there is no broader admin contribution layer to fall back on.",
    "Downstream automation must not infer undocumented hooks or side effects from implementation details."
  ];

  return `# ${facts.displayName} Edge Cases

## Known failure modes

${bullets.map((entry) => `- ${entry}`).join("\n")}

## Data anomalies

- Duplicate or replayed requests should be evaluated against the action’s documented idempotency behavior rather than guessed at runtime.
- Stale upstream dependencies should be handled by orchestration around this plugin, not by undocumented mutations inside the plugin boundary.
- If this plugin owns data that depends on another plugin, reconcile through declared dependencies and capability contracts.

## Recovery expectations

- Retry only through explicit action, job, or workflow semantics already exported by the plugin.
- Preserve auditability whenever operators need to reconcile a partial or conflicting state.
- Update both public and nested docs if recovery rules change.
`;
}

function renderFlowsDoc(facts) {
  return `# ${facts.displayName} Flows

## Happy paths

${facts.actions.length
    ? facts.actions.map((action) => `- \`${action.id}\`: ${action.description || "Governed action exported by this plugin."}`).join("\n")
    : "- No action surface is exported today."}

## Action-level flows

${facts.actions.length ? facts.actions.map((action) => renderActionFlowBlock(facts, action)).join("\n\n") : "No action flows are documented because the plugin currently exports no actions."}

## Cross-package interactions

- Direct dependencies: ${facts.dependsOn.length ? facts.dependsOn.map((entry) => `\`${entry}\``).join(", ") : "none"}
- Requested capabilities: ${facts.requestedCapabilities.length ? facts.requestedCapabilities.map((entry) => `\`${entry}\``).join(", ") : "none"}
- Integration model: ${facts.integrationModel}
- Recovery ownership should stay with the host orchestration layer when the plugin does not explicitly export jobs, workflows, or lifecycle events.
`;
}

function renderGlossaryDoc(facts) {
  return `# ${facts.displayName} Glossary

${toMarkdownTable(
    ["Term", "Meaning"],
    facts.glossaryTerms.map((entry) => [entry.term, entry.meaning])
  )}
`;
}

function renderMandatoryStepsDoc(facts) {
  return `# ${facts.displayName} Mandatory Steps

## Before shipping a change

1. Update the public contract docs in \`README.md\` and \`DEVELOPER.md\`.
2. Keep the nested docs under \`${relativeFromRepoRoot(facts, join(facts.packageDir, "docs"))}\` synchronized with the same truth.
3. Run the repo-local verification commands:
   - \`bun run build\`
   - \`bun run typecheck\`
   - \`bun run lint\`
   - \`bun run test\`
   - \`bun run docs:check\`
4. Run any extra lanes present for this plugin: ${Object.keys(facts.nestedScripts)
    .filter((entry) => entry.startsWith("test:"))
    .map((entry) => `\`${entry}\``)
    .join(", ") || "none"}.
5. Re-check that the plugin is still described through explicit command/resource/job/workflow contracts and not through undocumented hooks.

## Before integrating from another plugin

1. Depend on the manifest ID \`${facts.packageId}\` and the package import \`${facts.nestedPackageName}\`.
2. Use exported actions and resources first.
3. Treat jobs, workflows, and lifecycle envelopes as explicit contracts only when they are actually exported here.
4. Preserve the current non-goal boundary instead of building cross-plugin shortcuts that the repo does not advertise.
`;
}

function renderCatalogReadme(factsList) {
  const grouped = Object.fromEntries(pluginGroupOrder.map((group) => [group, factsList.filter((facts) => facts.profile.group === group)]));
  const rows = factsList.map((facts) => [
    `[${facts.displayName}](https://github.com/gutula/${facts.repoName})`,
    facts.profile.group,
    `\`${facts.maturity}\``,
    facts.verificationLabel,
    facts.compatibility.db.length ? facts.compatibility.db.join(" + ") : "None",
    facts.integrationModel,
    `[README](https://github.com/gutula/${facts.repoName}#readme) · [DEVELOPER](https://github.com/gutula/${facts.repoName}/blob/main/DEVELOPER.md)`
  ]);

  const sections = pluginGroupOrder
    .map((group) => {
      const groupFacts = grouped[group];
      return `## ${group}\n\n${toMarkdownTable(
        ["Plugin", "Maturity", "Verification", "DB", "Integration", "Highlights"],
        groupFacts.map((facts) => [
          `[${facts.displayName}](https://github.com/gutula/${facts.repoName})`,
          `\`${facts.maturity}\``,
          facts.verificationLabel,
          facts.compatibility.db.length ? facts.compatibility.db.join(" + ") : "None",
          facts.integrationModel,
          facts.description
        ])
      )}`;
    })
    .join("\n\n");

  return `# gutu-plugins

Catalog repository for first-party Gutu plugins.

This catalog is a **truth-first index** for the extracted plugin ecosystem. The badges and maturity labels referenced here are local-status documentation badges backed by repo facts, not live npm or GitHub Actions badges.

## Maturity Matrix

${toMarkdownTable(["Plugin", "Domain", "Maturity", "Verification", "DB", "Integration", "Docs"], rows)}

${sections}

## Notes

- Every plugin repo is expected to publish a public \`README.md\`, a deep \`DEVELOPER.md\`, and a repo-local \`TODO.md\`.
- Maturity is assigned from repo truth, test depth, and documented operational coverage. It is not aspirational marketing.
- Cross-plugin composition should be documented through Gutu command, event, job, and workflow primitives rather than undocumented hook systems.
`;
}

function renderBadgeRow(facts) {
  return [
    badgeFor("Maturity", facts.maturity, maturityColor(facts.maturity)),
    badgeFor("Verification", facts.verificationLabel, verificationColor(facts.verificationLabel)),
    badgeFor("DB", facts.compatibility.db.length ? facts.compatibility.db.join("+") : "None", dbColor(facts.compatibility.db)),
    badgeFor("Integration Model", facts.integrationModel, integrationColor(facts.integrationModel))
  ].join(" ");
}

function renderMaturityReason(facts) {
  const reasons = [];
  if (facts.tests.byLane.unit.length) {
    reasons.push("unit coverage exists");
  }
  if (facts.tests.byLane.contracts.length) {
    reasons.push("contract coverage exists");
  }
  if (facts.tests.byLane.integration.length) {
    reasons.push("integration coverage exists");
  }
  if (facts.tests.byLane.migrations.length) {
    reasons.push("migration coverage exists");
  }
  if (facts.jobs.length) {
    reasons.push("job definitions are exported");
  }
  if (facts.workflows.length) {
    reasons.push("workflow definitions are exported");
  }
  if (facts.serviceSignals.returnsEvents || facts.serviceSignals.returnsJobs) {
    reasons.push("service results already carry orchestration signals");
  }

  return reasons.length
    ? `This tier is justified because ${joinWithAnd(reasons)}.`
    : "This tier is currently driven by the documented contract and the baseline verification lanes present in the repo.";
}

function renderTestCoverageBullets(facts) {
  const lines = [
    `- Root verification scripts: ${facts.verificationCommands.map((entry) => `\`${entry}\``).join(", ")}`
  ];

  for (const [lane, files] of Object.entries(facts.tests.byLane)) {
    lines.push(`- ${capitalize(lane)} files: ${files.length ? `${files.length}` : "0"}`);
  }

  return lines.join("\n");
}

function describeUiSurface(facts) {
  const parts = [];
  if (facts.surfaces.hasUiSurface) {
    parts.push("base UI surface");
  }
  if (facts.surfaces.hasAdminContributions) {
    parts.push("admin contributions");
  }
  if (facts.surfaces.hasZoneContribution) {
    parts.push("zone or canvas extension");
  }
  return parts.length ? parts.join(", ") : "No UI surface exported";
}

function renderOrchestrationDetails(facts) {
  const lines = [];

  if (facts.serviceSignals.returnsEvents) {
    lines.push(
      "- Service results already return lifecycle event envelopes. Hosts should treat those envelopes as explicit orchestration outputs, not as incidental metadata."
    );
  } else {
    lines.push("- No standalone plugin-owned lifecycle event feed is exported today.");
  }

  if (facts.serviceSignals.returnsJobs || facts.jobs.length > 0) {
    lines.push(
      `- Job surface: ${facts.jobs.length ? facts.jobs.map((entry) => `\`${entry.id}\``).join(", ") : "service-returned follow-up jobs"}.`
    );
  } else {
    lines.push("- No plugin-owned job catalog is exported today.");
  }

  if (facts.workflows.length > 0) {
    lines.push(`- Workflow surface: ${facts.workflows.map((entry) => `\`${entry.id}\``).join(", ")}.`);
  } else {
    lines.push("- No plugin-owned workflow catalog is exported today.");
  }

  lines.push(
    "- Recommended composition pattern: invoke actions, read resources, then let the surrounding Gutu command/event/job runtime handle downstream automation."
  );

  return lines.join("\n");
}

function renderFailureModes(facts) {
  const bullets = [
    "Action inputs can fail schema validation or permission evaluation before any durable mutation happens.",
    facts.serviceSignals.returnsJobs
      ? "Hosts that ignore returned job envelopes may lose required downstream processing."
      : "If downstream automation is needed, the host must add it explicitly instead of assuming this plugin emits jobs.",
    facts.serviceSignals.returnsEvents
      ? "Hosts that ignore returned lifecycle events may lose traceability or follow-up orchestration."
      : "There is no separate lifecycle-event feed to rely on today; do not build one implicitly from internal details.",
    facts.tests.byLane.migrations.length
      ? "Schema regressions are expected to show up in the migration lane and should block shipment."
      : "Schema-affecting changes need extra care because there is no dedicated migration lane yet."
  ];

  return bullets.map((entry) => `- ${entry}`).join("\n");
}

function renderPrimaryFlow(facts) {
  const primaryAction = facts.actions[0];
  const primaryResource = facts.resources[0];
  const uiTarget = facts.surfaces.hasAdminContributions ? "Admin contributions" : facts.surfaces.hasUiSurface ? "UI surface" : "Host integration";
  const storageTarget = primaryResource ? primaryResource.id : facts.ownsData[0] || "domain state";
  const lines = [
    "flowchart LR",
    `  caller["Host or operator"] --> action["${primaryAction ? primaryAction.id : facts.packageId}"]`,
    '  action --> validation["Schema + permission guard"]',
    `  validation --> service["${facts.displayName} service layer"]`,
    `  service --> state["${storageTarget}"]`
  ];

  if (facts.serviceSignals.returnsEvents) {
    lines.push('  service --> events["Lifecycle event envelopes"]');
  }
  if (facts.serviceSignals.returnsJobs || facts.jobs.length > 0) {
    lines.push('  service --> jobs["Follow-up jobs / queue definitions"]');
  }
  if (facts.workflows.length > 0) {
    lines.push('  service --> workflows["Workflow state transitions"]');
  }
  lines.push(`  state --> ui["${uiTarget}"]`);
  return lines.join("\n");
}

function renderWorkflowFlow(facts) {
  const workflow = facts.workflows[0];
  if (!workflow) {
    return "stateDiagram-v2\n  [*] --> idle";
  }

  const lines = ["stateDiagram-v2"];
  if (workflow.states.length > 0) {
    lines.push(`  [*] --> ${workflow.states[0]}`);
    for (const state of workflow.states.slice(1)) {
      lines.push(`  ${workflow.states[0]} --> ${state}`);
    }
  }
  return lines.join("\n");
}

function renderCompositionRecipe(facts) {
  if (facts.workflows.length > 0) {
    return [
      "- Register the workflow definitions with the host runtime instead of re-encoding state transitions outside the plugin.",
      "- Drive follow-up automation from explicit workflow transitions and resource reads.",
      "- Pair workflow decisions with notifications or jobs in the outer orchestration layer when humans must be kept in the loop."
    ].join("\n");
  }

  if (facts.jobs.length > 0 || facts.serviceSignals.returnsJobs) {
    return [
      "- Treat actions as the write boundary and jobs as the asynchronous follow-up boundary.",
      "- Use the exported job definitions or returned job envelopes instead of inventing hidden background work.",
      "- Keep retries and queue semantics outside the plugin only when the plugin does not already export them."
    ].join("\n");
  }

  if (facts.serviceSignals.returnsEvents) {
    return [
      "- Consume the returned lifecycle events as explicit orchestration outputs.",
      "- Route downstream reactions through Gutu’s event and command primitives instead of patching direct service calls together."
    ].join("\n");
  }

  return [
    "- Compose this plugin through action invocations and resource reads.",
    "- If downstream automation becomes necessary, add it in the surrounding Gutu command/event/job runtime instead of assuming this plugin already exports a hook surface."
  ].join("\n");
}

function renderActionFlowBlock(facts, action) {
  const sideEffects = [];
  if (facts.resources.length) {
    sideEffects.push(`Mutates or validates state owned by ${facts.resources.map((entry) => `\`${entry.id}\``).join(", ")}.`);
  }
  if (facts.serviceSignals.returnsEvents) {
    sideEffects.push("May return lifecycle event envelopes to the host runtime.");
  }
  if (facts.serviceSignals.returnsJobs || facts.jobs.length > 0) {
    sideEffects.push("May schedule or describe follow-up background work.");
  }

  return `### \`${action.id}\`

${action.description || "Governed action exported by this plugin."}

Permission: \`${action.permission || "not declared"}\`

Business purpose: ${action.businessPurpose || "Expose the plugin’s write boundary through a validated, auditable action contract."}

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s ${action.idempotent ? "idempotent" : "non-idempotent"} semantics.

Side effects:

${sideEffects.length ? sideEffects.map((entry) => `- ${entry}`).join("\n") : "- No extra side effects are documented beyond the direct action result."}

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.
`;
}

function renderDocsSummaryScript(facts) {
  const nestedRelative = join("framework", "builtin-plugins", facts.packageDirName).replaceAll("\\", "/");
  return `#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const nestedRelative = "${nestedRelative}";
const nestedRoot = join(repoRoot, nestedRelative);
const packageTs = readFileSync(join(nestedRoot, "package.ts"), "utf8");
const readme = existsSync(join(repoRoot, "README.md")) ? readFileSync(join(repoRoot, "README.md"), "utf8") : "";
const developer = existsSync(join(repoRoot, "DEVELOPER.md")) ? readFileSync(join(repoRoot, "DEVELOPER.md"), "utf8") : "";
const todo = existsSync(join(repoRoot, "TODO.md")) ? readFileSync(join(repoRoot, "TODO.md"), "utf8") : "";

function parse(field) {
  const match = packageTs.match(new RegExp(field + String.raw\`\\s*:\\s*"([^"]+)"\`));
  return match ? match[1] : "";
}

function countBadges(text) {
  return (text.match(/img\\.shields\\.io/g) || []).length;
}

const summary = {
  repo: "${facts.repoName}",
  packageId: parse("id"),
  displayName: parse("displayName"),
  version: parse("version"),
  hasReadme: readme.length > 0,
  hasDeveloper: developer.length > 0,
  hasTodo: todo.length > 0,
  badgeCount: countBadges(readme)
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(summary.displayName + " (" + summary.packageId + ")");
  console.log("README:", summary.hasReadme ? "yes" : "no");
  console.log("DEVELOPER:", summary.hasDeveloper ? "yes" : "no");
  console.log("TODO:", summary.hasTodo ? "yes" : "no");
  console.log("Badges:", summary.badgeCount);
}
`;
}

function renderDocsCheckScript(facts) {
  const nestedRelative = join("framework", "builtin-plugins", facts.packageDirName).replaceAll("\\", "/");
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

  return `#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const nestedRoot = join(repoRoot, "${nestedRelative}");
const requiredInternalDocs = ${JSON.stringify(requiredInternalDocs())};
const requiredReadmeHeadings = ${JSON.stringify(requiredReadmeHeadings)};
const requiredDeveloperHeadings = ${JSON.stringify(requiredDeveloperHeadings)};
const requiredTodoHeadings = ${JSON.stringify(requiredTodoHeadings)};
const placeholderPatterns = [/This folder is the intended standalone git repository/i, /_Document\\b[^_]*_/i, /_Explain\\b[^_]*_/i, /_Describe\\b[^_]*_/i, /_No workflows were discovered\\._/i];

const failures = [];

function requireFile(path) {
  if (!existsSync(path)) {
    failures.push("Missing file: " + path.replace(repoRoot + "/", ""));
    return "";
  }
  return readFileSync(path, "utf8");
}

function requireHeadings(text, headings, label) {
  for (const heading of headings) {
    if (!text.includes(heading)) {
      failures.push(label + " is missing heading: " + heading);
    }
  }
}

function checkPlaceholders(text, label) {
  for (const pattern of placeholderPatterns) {
    if (pattern.test(text)) {
      failures.push(label + " still contains placeholder or extraction-stub text matching " + pattern);
    }
  }
}

const readme = requireFile(join(repoRoot, "README.md"));
const developer = requireFile(join(repoRoot, "DEVELOPER.md"));
const todo = requireFile(join(repoRoot, "TODO.md"));
const packageTs = requireFile(join(nestedRoot, "package.ts"));

requireHeadings(readme, requiredReadmeHeadings, "README.md");
requireHeadings(developer, requiredDeveloperHeadings, "DEVELOPER.md");
requireHeadings(todo, requiredTodoHeadings, "TODO.md");
checkPlaceholders(readme, "README.md");
checkPlaceholders(developer, "DEVELOPER.md");
checkPlaceholders(todo, "TODO.md");

if ((readme.match(/img\\.shields\\.io/g) || []).length < 4) {
  failures.push("README.md must contain four local-status badges.");
}

for (const docName of requiredInternalDocs) {
  const content = requireFile(join(nestedRoot, "docs", docName));
  checkPlaceholders(content, "docs/" + docName);
}

if (!packageTs.includes("id:")) {
  failures.push("package.ts is missing the plugin id field.");
}

if (!readme.includes("**Maturity Tier:**") || !developer.includes("**Maturity Tier:**") || !todo.includes("**Maturity Tier:**")) {
  failures.push("README.md, DEVELOPER.md, and TODO.md must all declare the maturity tier.");
}

if (failures.length > 0) {
  console.error("Documentation check failed for ${facts.repoName}:");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("Documentation check passed for ${facts.repoName}.");
`;
}

function buildImportList(facts) {
  const names = ["manifest"];
  if (facts.actions[0]) {
    names.push(facts.actions[0].symbol);
  }
  if (facts.resources[0]) {
    names.push(facts.resources[0].symbol);
  }
  if (facts.jobs.length && hasExportName(facts, "jobDefinitions")) {
    names.push("jobDefinitions");
  }
  if (facts.workflows.length && hasExportName(facts, "workflowDefinitions")) {
    names.push("workflowDefinitions");
  }
  if (facts.surfaces.hasAdminContributions && hasExportName(facts, "adminContributions")) {
    names.push("adminContributions");
  }
  if (facts.surfaces.hasUiSurface && hasExportName(facts, "uiSurface")) {
    names.push("uiSurface");
  }
  return names.join(", ");
}

function hasExportName(facts, name) {
  return facts.indexExports.some((entry) => entry.names.includes(name));
}

function relativeFromRepoRoot(facts, absolutePath) {
  return absolutePath.replace(`${facts.repoRoot}/`, "");
}

function renderCodeList(items) {
  return items.length ? items.map((entry) => `\`${entry}\``).join(", ") : "None";
}

function renderCodePath(value) {
  return value.includes("undefined") ? "Not exported" : `\`${value}\``;
}

function joinWithAnd(items) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function writeFile(filePath, content) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

function requiredInternalDocs() {
  return [
    "AGENT_CONTEXT.md",
    "BUSINESS_RULES.md",
    "EDGE_CASES.md",
    "FLOWS.md",
    "GLOSSARY.md",
    "MANDATORY_STEPS.md"
  ];
}
