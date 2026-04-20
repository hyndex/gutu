import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import { getProfile, maturityOrder, pluginGroupOrder } from "./profiles.mjs";

export const requiredRootDocs = ["README.md", "DEVELOPER.md", "TODO.md"];
export const requiredInternalDocs = [
  "AGENT_CONTEXT.md",
  "BUSINESS_RULES.md",
  "EDGE_CASES.md",
  "FLOWS.md",
  "GLOSSARY.md",
  "MANDATORY_STEPS.md"
];

export const placeholderPatterns = [
  /_Document\b[^_]*_/gi,
  /_Explain\b[^_]*_/gi,
  /_Describe\b[^_]*_/gi,
  /_No workflows were discovered\._/gi,
  /_Document what this action does in business terms\._/gi,
  /_Explain why operators or automation invoke this action\._/gi,
  /_Document the checks that must pass before this action runs\._/gi,
  /_Document emitted events, writes, notifications, and follow-up jobs\._/gi,
  /_Document any paths agents must never bypass\._/gi
];

export function discoverPluginRepos(workspaceRoot) {
  const pluginsRoot = resolve(workspaceRoot, "plugins");
  if (!existsSync(pluginsRoot)) {
    return [];
  }

  return readdirSync(pluginsRoot)
    .map((entry) => join(pluginsRoot, entry))
    .filter((entry) => statSync(entry).isDirectory())
    .sort((left, right) => left.localeCompare(right));
}

export function discoverPluginFacts(workspaceRoot) {
  return discoverPluginRepos(workspaceRoot).map((repoRoot) => extractPluginFacts(repoRoot));
}

export function extractPluginFacts(repoRoot) {
  const rootPackageJsonPath = join(repoRoot, "package.json");
  const rootPackageJson = readJson(rootPackageJsonPath);
  const nestedPluginsRoot = join(repoRoot, "framework", "builtin-plugins");
  const packageDirName = readdirSync(nestedPluginsRoot).find((entry) =>
    statSync(join(nestedPluginsRoot, entry)).isDirectory()
  );

  if (!packageDirName) {
    throw new Error(`Could not resolve plugin package directory for '${repoRoot}'.`);
  }

  const packageDir = join(nestedPluginsRoot, packageDirName);
  const nestedPackageJson = readJson(join(packageDir, "package.json"));
  const manifestPath = join(packageDir, "package.ts");
  const manifestText = readText(manifestPath);
  const profile = getProfile(parseStringField(manifestText, "id"));
  const docsDir = join(packageDir, "docs");
  const rootDocsState = collectDocsState(repoRoot, requiredRootDocs);
  const internalDocsState = collectDocsState(docsDir, requiredInternalDocs);
  const nestedScripts = nestedPackageJson.scripts ?? {};
  const indexExports = collectIndexExports(join(packageDir, "src", "index.ts"));

  const actions = collectDefineBlocks(packageDir, "actions", "defineAction").map((block) => ({
    symbol: block.symbol,
    id: parseStringField(block.body, "id"),
    description: parseOptionalStringField(block.body, "description"),
    businessPurpose: parseOptionalStringField(block.body, "businessPurpose"),
    permission: parseOptionalStringField(block.body, "permission"),
    idempotent: parseOptionalBooleanField(block.body, "idempotent"),
    audit: parseOptionalBooleanField(block.body, "audit")
  }));

  const resources = collectDefineBlocks(packageDir, "resources", "defineResource").map((block) => {
    const fieldsBody = parseObjectField(block.body, "fields");
    return {
      symbol: block.symbol,
      id: parseStringField(block.body, "id"),
      description: parseOptionalStringField(block.body, "description"),
      businessPurpose: parseOptionalStringField(block.body, "businessPurpose"),
      table: parseOptionalIdentifierField(block.body, "table"),
      adminAutoCrud: parseNestedBooleanField(block.body, "admin", "autoCrud"),
      adminDefaultColumns: parseNestedArrayField(block.body, "admin", "defaultColumns"),
      portalEnabled: parseNestedBooleanField(block.body, "portal", "enabled"),
      fields: fieldsBody ? [...fieldsBody.matchAll(/^\s*([A-Za-z0-9_]+)\s*:/gm)].map((match) => match[1]) : []
    };
  });

  const jobs = collectCatalogBlocks(join(packageDir, "src", "jobs", "catalog.ts"), "defineJob").map((block) => ({
    id: block.id,
    queue: parseStringField(block.body, "queue"),
    concurrency: parseOptionalNumberField(block.body, "concurrency"),
    timeoutMs: parseOptionalNumberField(block.body, "timeoutMs"),
    retryAttempts: parseNestedNumberField(block.body, "retryPolicy", "attempts"),
    retryBackoff: parseNestedStringField(block.body, "retryPolicy", "backoff")
  }));

  const workflows = collectCatalogBlocks(join(packageDir, "src", "workflows", "catalog.ts"), "defineWorkflow").map(
    (block) => ({
      id: block.id,
      description: parseOptionalStringField(block.body, "description"),
      businessPurpose: parseOptionalStringField(block.body, "businessPurpose"),
      actors: parseArrayField(block.body, "actors"),
      invariants: parseArrayField(block.body, "invariants"),
      mandatorySteps: parseArrayField(block.body, "mandatorySteps"),
      states: collectWorkflowStates(block.body)
    })
  );

  const tests = collectTests(join(packageDir, "tests"));
  const serviceMainPath = join(packageDir, "src", "services", "main.service.ts");
  const serviceMainText = existsSync(serviceMainPath) ? readText(serviceMainPath) : "";
  const packageId = parseStringField(manifestText, "id");
  const compatibilityDb = parseNestedArrayField(manifestText, "compatibility", "db");

  const facts = {
    repoName: basename(repoRoot),
    repoRoot,
    repoRelative: relativeToWorkspace(repoRoot),
    rootPackageJson,
    rootPackageJsonPath,
    packageDirName,
    packageDir,
    packageRelative: relativeToWorkspace(packageDir),
    nestedPackageJson,
    nestedPackageName: nestedPackageJson.name,
    nestedScripts,
    indexExports,
    manifestPath,
    manifestText,
    packageId,
    manifestKind: parseStringField(manifestText, "kind"),
    manifestVersion: parseStringField(manifestText, "version"),
    displayName: parseStringField(manifestText, "displayName"),
    description: parseStringField(manifestText, "description"),
    trustTier: parseStringField(manifestText, "trustTier"),
    reviewTier: parseStringField(manifestText, "reviewTier"),
    isolationProfile: parseStringField(manifestText, "isolationProfile"),
    dependsOn: parseArrayField(manifestText, "dependsOn"),
    requestedCapabilities: parseArrayField(manifestText, "requestedCapabilities"),
    providesCapabilities: parseArrayField(manifestText, "providesCapabilities"),
    ownsData: parseArrayField(manifestText, "ownsData"),
    compatibility: {
      framework: parseNestedStringField(manifestText, "compatibility", "framework"),
      runtime: parseNestedStringField(manifestText, "compatibility", "runtime"),
      db: compatibilityDb
    },
    profile,
    actions,
    resources,
    jobs,
    workflows,
    tests,
    serviceSignals: {
      returnsEvents: /\bevents:\s*\[/.test(serviceMainText) || /LifecycleEvent/.test(serviceMainText),
      returnsJobs: /\bjobs:\s*\[/.test(serviceMainText) || /DispatchJob/.test(serviceMainText),
      usesCommunicationRuntime: /CommunicationRuntime/.test(serviceMainText),
      usesValidationErrors: /ValidationError/.test(serviceMainText)
    },
    surfaces: {
      hasUiSurface: existsSync(join(packageDir, "src", "ui", "surfaces.ts")),
      hasAdminContributions: existsSync(join(packageDir, "src", "ui", "admin.contributions.ts")),
      hasZoneContribution: existsSync(join(packageDir, "src", "ui", "zone.ts")),
      hasPostgresHelpers: existsSync(join(packageDir, "src", "postgres.ts")),
      hasDbSchema: existsSync(join(packageDir, "db", "schema.ts"))
    },
    docsState: {
      root: rootDocsState,
      internal: internalDocsState
    }
  };

  return {
    ...facts,
    integrationModel: deriveIntegrationModel(facts),
    verificationLabel: deriveVerificationLabel(facts),
    verificationCommands: deriveVerificationCommands(facts),
    maturity: computeMaturity(facts),
    currentGaps: deriveCurrentGaps(facts),
    recommendedNext: dedupeList([...facts.profile.recommendedNext, ...deriveRecommendedNext(facts)]),
    laterOptional: dedupeList(facts.profile.laterOptional),
    nonGoals: dedupeList(facts.profile.nonGoals),
    currentCapabilities: deriveCurrentCapabilities(facts),
    glossaryTerms: deriveGlossaryTerms(facts)
  };
}

export function sortFactsByGroup(factsList) {
  return [...factsList].sort((left, right) => {
    const leftGroupIndex = pluginGroupOrder.indexOf(left.profile.group);
    const rightGroupIndex = pluginGroupOrder.indexOf(right.profile.group);
    if (leftGroupIndex !== rightGroupIndex) {
      return leftGroupIndex - rightGroupIndex;
    }

    return left.packageId.localeCompare(right.packageId);
  });
}

export function summarizeFacts(facts) {
  return {
    repoName: facts.repoName,
    packageId: facts.packageId,
    displayName: facts.displayName,
    group: facts.profile.group,
    maturity: facts.maturity,
    description: facts.description,
    actions: facts.actions.length,
    resources: facts.resources.length,
    jobs: facts.jobs.length,
    workflows: facts.workflows.length,
    verificationLabel: facts.verificationLabel,
    integrationModel: facts.integrationModel,
    db: facts.compatibility.db
  };
}

export function badgeFor(label, value, color) {
  return `![${label}: ${value}](https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(value)}-${color})`;
}

export function maturityColor(maturity) {
  switch (maturity) {
    case "Production Candidate":
      return "0f766e";
    case "Hardened":
      return "2563eb";
    case "Baseline":
      return "7c3aed";
    default:
      return "6b7280";
  }
}

export function integrationColor(model) {
  if (model.includes("Events")) {
    return "0f766e";
  }
  if (model.includes("Workflows") || model.includes("Jobs")) {
    return "2563eb";
  }
  return "6b7280";
}

export function verificationColor(label) {
  return label.includes("Integration") || label.includes("Migrations") ? "2563eb" : "6b7280";
}

export function dbColor(dbValues) {
  if (dbValues.includes("postgres") && dbValues.includes("sqlite")) {
    return "2563eb";
  }
  if (dbValues.includes("postgres")) {
    return "0f766e";
  }
  return "6b7280";
}

export function toTitle(value) {
  return value
    .split(/[-_.]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function toMarkdownTable(headers, rows) {
  const safeRows = rows.length > 0 ? rows : [["-", "-", "-"]];
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...safeRows.map((row) => `| ${row.map((cell) => String(cell).replace(/\n/g, "<br>")).join(" | ")} |`)
  ].join("\n");
}

export function listInternalDocPaths(facts) {
  return requiredInternalDocs.map((entry) => join(facts.packageRelative, "docs", entry));
}

function deriveCurrentCapabilities(facts) {
  const bullets = [];

  if (facts.actions.length > 0) {
    bullets.push(
      `Exports ${facts.actions.length} governed action${facts.actions.length === 1 ? "" : "s"}: ${facts.actions
        .map((entry) => `\`${entry.id}\``)
        .join(", ")}.`
    );
  }

  if (facts.resources.length > 0) {
    bullets.push(
      `Owns ${facts.resources.length} resource contract${facts.resources.length === 1 ? "" : "s"}: ${facts.resources
        .map((entry) => `\`${entry.id}\``)
        .join(", ")}.`
    );
  }

  if (facts.jobs.length > 0) {
    bullets.push(
      `Publishes ${facts.jobs.length} job definition${facts.jobs.length === 1 ? "" : "s"} with explicit queue and retry policy metadata.`
    );
  }

  if (facts.workflows.length > 0) {
    bullets.push(
      `Publishes ${facts.workflows.length} workflow definition${facts.workflows.length === 1 ? "" : "s"} with state-machine descriptions and mandatory steps.`
    );
  }

  if (facts.surfaces.hasAdminContributions) {
    bullets.push("Adds richer admin workspace contributions on top of the base UI surface.");
  } else if (facts.surfaces.hasUiSurface) {
    bullets.push("Registers a bounded UI surface that can be hosted by the surrounding admin or portal shell.");
  }

  if (facts.surfaces.hasPostgresHelpers) {
    bullets.push("Ships explicit SQL migration or rollback helpers alongside the domain model.");
  } else if (facts.surfaces.hasDbSchema) {
    bullets.push("Defines a durable data schema contract even though no explicit SQL helper module is exported.");
  }

  if (facts.serviceSignals.returnsEvents || facts.serviceSignals.returnsJobs) {
    const surfaces = [];
    if (facts.serviceSignals.returnsEvents) {
      surfaces.push("lifecycle events");
    }
    if (facts.serviceSignals.returnsJobs) {
      surfaces.push("follow-up jobs");
    }
    bullets.push(`Service results already expose ${surfaces.join(" and ")} for orchestration-aware hosts.`);
  }

  return bullets;
}

function deriveCurrentGaps(facts) {
  const gaps = [];

  if (!facts.tests.byLane.integration.length) {
    gaps.push("No dedicated integration test lane is exported in this repo today; validation currently leans on build, lint, typecheck, and test lanes.");
  }

  if (!facts.tests.byLane.migrations.length && facts.surfaces.hasDbSchema) {
    gaps.push("The plugin owns durable data state, but it does not yet ship a dedicated migration verification lane in this repo.");
  }

  if (!facts.serviceSignals.returnsEvents && !facts.jobs.length && !facts.workflows.length) {
    gaps.push("No standalone plugin-owned event, job, or workflow catalog is exported yet; compose it through actions, resources, and the surrounding Gutu runtime.");
  }

  if (!facts.surfaces.hasAdminContributions && facts.surfaces.hasUiSurface) {
    gaps.push("The plugin exposes a UI surface, but not a richer admin workspace contribution module.");
  }

  if (facts.rootPackageJson.scripts?.["docs:check"] === undefined) {
    gaps.push("Repo-local documentation verification entrypoints were missing before this pass and need to stay green as the repo evolves.");
  }

  return dedupeList(gaps);
}

function deriveRecommendedNext(facts) {
  const next = [];

  if (!facts.tests.byLane.integration.length) {
    next.push("Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.");
  }

  if (!facts.tests.byLane.migrations.length && facts.surfaces.hasDbSchema) {
    next.push("Add explicit migration or rollback coverage if this domain becomes more operationally sensitive.");
  }

  if (!facts.serviceSignals.returnsEvents && !facts.jobs.length && !facts.workflows.length) {
    next.push("Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.");
  }

  if (!facts.surfaces.hasAdminContributions && facts.surfaces.hasUiSurface) {
    next.push("Broaden the admin entry surface only if operators need more than the current embedded view or resource listing.");
  }

  return dedupeList(next);
}

function deriveIntegrationModel(facts) {
  const parts = ["Actions", "Resources"];
  if (facts.serviceSignals.returnsEvents) {
    parts.push("Events");
  }
  if (facts.jobs.length > 0 || facts.serviceSignals.returnsJobs || facts.requestedCapabilities.some((entry) => entry.includes("jobs."))) {
    parts.push("Jobs");
  }
  if (facts.workflows.length > 0) {
    parts.push("Workflows");
  }
  if (facts.surfaces.hasAdminContributions || facts.surfaces.hasUiSurface) {
    parts.push("UI");
  }

  return dedupeList(parts).join("+");
}

function deriveVerificationLabel(facts) {
  const lanes = ["Build", "Typecheck", "Lint", "Test"];
  if (facts.nestedScripts["test:contracts"]) {
    lanes.push("Contracts");
  }
  if (facts.nestedScripts["test:migrations"] || facts.tests.byLane.migrations.length) {
    lanes.push("Migrations");
  }
  if (facts.tests.byLane.integration.length) {
    lanes.push("Integration");
  }

  return lanes.join("+");
}

function deriveVerificationCommands(facts) {
  const commands = [
    "bun run build",
    "bun run typecheck",
    "bun run lint",
    "bun run test"
  ];

  for (const scriptName of Object.keys(facts.nestedScripts).filter((entry) => entry.startsWith("test:")).sort()) {
    commands.push(`bun run ${scriptName}`);
  }

  if (facts.tests.byLane.integration.length && !facts.nestedScripts["test:integration"]) {
    commands.push("bun run test:integration");
  }

  if (facts.tests.byLane.migrations.length && !facts.nestedScripts["test:migrations"]) {
    commands.push("bun run test:migrations");
  }

  commands.push("bun run docs:check");
  return dedupeList(commands);
}

function deriveGlossaryTerms(facts) {
  const terms = [
    {
      term: facts.displayName,
      meaning: facts.description
    }
  ];

  for (const capability of facts.providesCapabilities) {
    terms.push({
      term: capability,
      meaning: "Capability published by this plugin manifest."
    });
  }

  for (const action of facts.actions) {
    terms.push({
      term: action.id,
      meaning: action.description ?? "Governed action exported by this plugin."
    });
  }

  for (const resource of facts.resources) {
    terms.push({
      term: resource.id,
      meaning: resource.description ?? "Resource contract exported by this plugin."
    });
  }

  for (const job of facts.jobs) {
    terms.push({
      term: job.id,
      meaning: `Job definition queued on \`${job.queue}\`.`
    });
  }

  for (const workflow of facts.workflows) {
    terms.push({
      term: workflow.id,
      meaning: workflow.description ?? "Workflow definition exported by this plugin."
    });
  }

  for (const focusArea of facts.profile.focusAreas ?? []) {
    terms.push({
      term: toTitle(focusArea),
      meaning: `Primary focus area for ${facts.displayName}.`
    });
  }

  return dedupeObjects(terms, (entry) => entry.term);
}

function computeMaturity(facts) {
  const hasBaselineVerification =
    Boolean(facts.nestedScripts.build) &&
    Boolean(facts.nestedScripts.typecheck) &&
    Boolean(facts.nestedScripts.lint) &&
    Boolean(facts.nestedScripts.test) &&
    facts.tests.byLane.unit.length > 0 &&
    facts.tests.byLane.contracts.length > 0;

  if (!hasBaselineVerification) {
    return "Scaffolded";
  }

  if (
    facts.packageId === "notifications-core" &&
    facts.tests.byLane.integration.length > 0 &&
    facts.tests.byLane.migrations.length > 0 &&
    facts.serviceSignals.returnsEvents &&
    facts.serviceSignals.returnsJobs
  ) {
    return "Production Candidate";
  }

  if (
    facts.tests.byLane.integration.length > 0 ||
    facts.tests.byLane.migrations.length > 0 ||
    facts.jobs.length > 0 ||
    facts.workflows.length > 0 ||
    facts.serviceSignals.returnsEvents ||
    facts.serviceSignals.returnsJobs ||
    facts.surfaces.hasPostgresHelpers
  ) {
    return "Hardened";
  }

  return "Baseline";
}

function collectTests(testsRoot) {
  const files = existsSync(testsRoot)
    ? walkFiles(testsRoot).filter((entry) => entry.endsWith(".ts") || entry.endsWith(".tsx"))
    : [];

  const byLane = {
    unit: files.filter((entry) => entry.includes("/unit/")),
    contracts: files.filter((entry) => entry.includes("/contracts/")),
    integration: files.filter((entry) => entry.includes("/integration/")),
    migrations: files.filter((entry) => entry.includes("/migrations/"))
  };

  return {
    files,
    byLane
  };
}

function collectDocsState(baseDir, docs) {
  return Object.fromEntries(
    docs.map((docName) => {
      const target = join(baseDir, docName);
      const exists = existsSync(target);
      const content = exists ? readText(target) : "";
      return [
        docName,
        {
          path: target,
          exists,
          placeholderMatches: findPlaceholders(content),
          content
        }
      ];
    })
  );
}

function collectDefineBlocks(packageDir, segment, factoryName) {
  const targetDir = join(packageDir, "src", segment);
  if (!existsSync(targetDir)) {
    return [];
  }

  const blocks = [];
  for (const file of walkFiles(targetDir).filter((entry) => entry.endsWith(".ts"))) {
    const text = readText(file);
    const matcher = new RegExp(`export const\\s+([A-Za-z0-9_]+)\\s*=\\s*${factoryName}\\(\\{([\\s\\S]*?)\\n\\}\\);`, "g");
    let match = matcher.exec(text);
    while (match) {
      blocks.push({
        file,
        symbol: match[1],
        body: match[2]
      });
      match = matcher.exec(text);
    }
  }

  return blocks;
}

function collectCatalogBlocks(filePath, factoryName) {
  if (!existsSync(filePath)) {
    return [];
  }

  const text = readText(filePath);
  const matcher = new RegExp(`"([^"]+)"\\s*:\\s*${factoryName}\\(\\{([\\s\\S]*?)\\n\\s*\\}\\)`, "g");
  const blocks = [];
  let match = matcher.exec(text);
  while (match) {
    blocks.push({
      id: match[1],
      body: match[2]
    });
    match = matcher.exec(text);
  }

  return blocks;
}

function collectIndexExports(filePath) {
  if (!existsSync(filePath)) {
    return [];
  }

  const text = readText(filePath);
  const exports = [];
  const matcher = /export\s*\{([^}]+)\}\s*from\s*"([^"]+)";/g;
  let match = matcher.exec(text);
  while (match) {
    const names = match[1]
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => entry.replace(/^default as /, "").trim());
    exports.push({
      source: match[2],
      names
    });
    match = matcher.exec(text);
  }

  return exports;
}

function collectWorkflowStates(blockBody) {
  const statesBody = parseObjectField(blockBody, "states");
  if (!statesBody) {
    return [];
  }

  return [...statesBody.matchAll(/^\s*([A-Za-z0-9_]+)\s*:/gm)].map((match) => match[1]);
}

function parseArrayField(text, fieldName) {
  const matcher = new RegExp(`${escapeRegex(fieldName)}\\s*:\\s*\\[([\\s\\S]*?)\\]`);
  const match = text.match(matcher);
  if (!match) {
    return [];
  }

  return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

function parseNestedArrayField(text, parentField, childField) {
  const parentBody = parseObjectField(text, parentField);
  return parentBody ? parseArrayField(parentBody, childField) : [];
}

function parseObjectField(text, fieldName) {
  const startPattern = new RegExp(`${escapeRegex(fieldName)}\\s*:\\s*\\{`);
  const match = startPattern.exec(text);
  if (!match || match.index < 0) {
    return "";
  }

  const startIndex = match.index + match[0].length;
  let depth = 1;
  let cursor = startIndex;
  while (cursor < text.length && depth > 0) {
    const char = text[cursor];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
    }
    cursor += 1;
  }

  return text.slice(startIndex, cursor - 1);
}

function parseStringField(text, fieldName) {
  const value = parseOptionalStringField(text, fieldName);
  if (value === "") {
    throw new Error(`Missing string field '${fieldName}'.`);
  }
  return value;
}

function parseOptionalStringField(text, fieldName) {
  const matcher = new RegExp(`${escapeRegex(fieldName)}\\s*:\\s*"([^"]+)"`);
  return matcher.exec(text)?.[1] ?? "";
}

function parseOptionalIdentifierField(text, fieldName) {
  const matcher = new RegExp(`${escapeRegex(fieldName)}\\s*:\\s*([A-Za-z0-9_]+)`);
  return matcher.exec(text)?.[1] ?? "";
}

function parseOptionalBooleanField(text, fieldName) {
  const matcher = new RegExp(`${escapeRegex(fieldName)}\\s*:\\s*(true|false)`);
  const value = matcher.exec(text)?.[1];
  return value ? value === "true" : null;
}

function parseOptionalNumberField(text, fieldName) {
  const matcher = new RegExp(`${escapeRegex(fieldName)}\\s*:\\s*([0-9_]+)`);
  const value = matcher.exec(text)?.[1];
  return value ? Number(value.replaceAll("_", "")) : null;
}

function parseNestedBooleanField(text, parentField, childField) {
  const parentBody = parseObjectField(text, parentField);
  return parentBody ? parseOptionalBooleanField(parentBody, childField) : null;
}

function parseNestedStringField(text, parentField, childField) {
  const parentBody = parseObjectField(text, parentField);
  return parentBody ? parseOptionalStringField(parentBody, childField) : "";
}

function parseNestedNumberField(text, parentField, childField) {
  const parentBody = parseObjectField(text, parentField);
  return parentBody ? parseOptionalNumberField(parentBody, childField) : null;
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function findPlaceholders(text) {
  const matches = [];
  for (const pattern of placeholderPatterns) {
    const found = [...text.matchAll(pattern)].map((entry) => entry[0]);
    matches.push(...found);
  }
  return dedupeList(matches);
}

function walkFiles(root) {
  if (!existsSync(root)) {
    return [];
  }

  const queue = [root];
  const files = [];
  while (queue.length > 0) {
    const current = queue.pop();
    for (const entry of readdirSync(current)) {
      if (entry === "node_modules" || entry === "dist" || entry === ".git") {
        continue;
      }
      const absolute = join(current, entry);
      const fileStat = statSync(absolute);
      if (fileStat.isDirectory()) {
        queue.push(absolute);
      } else {
        files.push(absolute);
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function dedupeList(items) {
  return [...new Set(items.filter(Boolean))];
}

function dedupeObjects(items, getKey) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }
  return output;
}

function relativeToWorkspace(targetPath) {
  const workspaceRoot = resolve(dirname(new URL(import.meta.url).pathname), "..", "..");
  return targetPath.replace(`${workspaceRoot}/`, "");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export { maturityOrder };
