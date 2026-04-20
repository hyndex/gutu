import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

import { getProfile, libraryGroupOrder, maturityOrder } from "./profiles.mjs";

export const requiredRootDocs = ["README.md", "DEVELOPER.md", "TODO.md"];

export const placeholderPatterns = [
  /This folder is the intended standalone git repository/i,
  /_Document\b[^_]*_/gi,
  /_Explain\b[^_]*_/gi,
  /_Describe\b[^_]*_/gi
];

export function discoverLibraryRepos(workspaceRoot) {
  const librariesRoot = resolve(workspaceRoot, "libraries");
  if (!existsSync(librariesRoot)) {
    return [];
  }

  return readdirSync(librariesRoot)
    .map((entry) => join(librariesRoot, entry))
    .filter((entry) => statSync(entry).isDirectory())
    .sort((left, right) => left.localeCompare(right));
}

export function discoverLibraryFacts(workspaceRoot) {
  return discoverLibraryRepos(workspaceRoot).map((repoRoot) => extractLibraryFacts(repoRoot, workspaceRoot));
}

export function extractLibraryFacts(repoRoot, workspaceRoot = resolve(repoRoot, "..", "..")) {
  const rootPackageJsonPath = join(repoRoot, "package.json");
  const rootPackageJson = readJson(rootPackageJsonPath);
  const nestedLibrariesRoot = join(repoRoot, "framework", "libraries");
  const packageDirName = readdirSync(nestedLibrariesRoot).find((entry) =>
    statSync(join(nestedLibrariesRoot, entry)).isDirectory()
  );

  if (!packageDirName) {
    throw new Error(`Could not resolve library package directory for '${repoRoot}'.`);
  }

  const packageDir = join(nestedLibrariesRoot, packageDirName);
  const nestedPackageJson = readJson(join(packageDir, "package.json"));
  const nestedScripts = nestedPackageJson.scripts ?? {};
  const indexPath = join(packageDir, "src", "index.ts");
  const indexText = existsSync(indexPath) ? readText(indexPath) : "";
  const packageId = parseConstString(indexText, "packageId") || nestedPackageJson.name.replace(/^@platform\//, "");
  const displayName = parseConstString(indexText, "packageDisplayName") || toTitle(packageId);
  const description =
    parseConstString(indexText, "packageDescription") ||
    `${displayName} reusable library exports.`;
  const profile = getProfile(packageId);
  const rootDocsState = collectDocsState(repoRoot, requiredRootDocs);
  const publicModules = collectPublicModules(indexText);
  const moduleFacts = publicModules.map((modulePath) => collectModuleFact(packageDir, modulePath)).filter(Boolean);
  const sourceFiles = collectSourceFiles(join(packageDir, "src"));
  const tests = collectTests(join(packageDir, "tests"));
  const dependencies = Object.keys(nestedPackageJson.dependencies ?? {});
  const peerDependencies = Object.keys(nestedPackageJson.peerDependencies ?? {});
  const devDependencies = Object.keys(nestedPackageJson.devDependencies ?? {});
  const packageConstants = collectIndexConstants(indexText);
  const exportedSymbols = dedupeSymbols([
    ...packageConstants,
    ...moduleFacts.flatMap((entry) => entry.exports)
  ]);

  const facts = {
    repoName: basename(repoRoot),
    repoRoot,
    repoRelative: relative(workspaceRoot, repoRoot).replaceAll("\\", "/"),
    rootPackageJson,
    rootPackageJsonPath,
    packageDirName,
    packageDir,
    packageRelative: relative(workspaceRoot, packageDir).replaceAll("\\", "/"),
    packageRepoRelative: relative(repoRoot, packageDir).replaceAll("\\", "/"),
    nestedPackageJson,
    nestedPackageName: nestedPackageJson.name,
    nestedScripts,
    packageId,
    displayName,
    description,
    profile,
    rootDocsState,
    publicModules,
    moduleFacts,
    sourceFiles,
    tests,
    dependencies,
    peerDependencies,
    devDependencies,
    exportedSymbols,
    packageConstants,
    reactDependency: dependencies.includes("react") || peerDependencies.includes("react"),
    tsxSourceFiles: sourceFiles.filter((entry) => entry.path.endsWith(".tsx")),
    nestedIndexPath: indexPath,
    nestedIndexText: indexText
  };

  const uiSurface = deriveUiSurface(facts);
  const consumptionModel = deriveConsumptionModel({
    ...facts,
    uiSurface
  });
  const verificationLabel = deriveVerificationLabel(facts);
  const verificationCommands = deriveVerificationCommands(facts);
  const maturity = computeMaturity(facts);
  const enrichedFacts = {
    ...facts,
    uiSurface,
    consumptionModel,
    verificationLabel,
    verificationCommands,
    maturity
  };

  return {
    ...enrichedFacts,
    currentCapabilities: deriveCurrentCapabilities(enrichedFacts),
    currentGaps: deriveCurrentGaps(enrichedFacts),
    recommendedNext: dedupeList([...facts.profile.recommendedNext, ...deriveRecommendedNext(enrichedFacts)]),
    laterOptional: dedupeList(facts.profile.laterOptional),
    nonGoals: dedupeList(facts.profile.nonGoals),
    glossaryTerms: deriveGlossaryTerms(enrichedFacts)
  };
}

export function sortFactsByGroup(factsList) {
  return [...factsList].sort((left, right) => {
    const leftGroupIndex = libraryGroupOrder.indexOf(left.profile.group);
    const rightGroupIndex = libraryGroupOrder.indexOf(right.profile.group);
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
    publicModules: facts.publicModules.length,
    exportedSymbols: facts.exportedSymbols.length,
    verificationLabel: facts.verificationLabel,
    uiSurface: facts.uiSurface,
    consumptionModel: facts.consumptionModel
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

export function verificationColor(label) {
  return label.includes("Contracts") ? "2563eb" : "6b7280";
}

export function uiColor(surface) {
  if (surface.includes("React")) {
    return "0f766e";
  }
  if (surface.includes("Mixed")) {
    return "2563eb";
  }
  return "6b7280";
}

export function consumptionColor(model) {
  if (model.includes("providers")) {
    return "0f766e";
  }
  if (model.includes("typed")) {
    return "2563eb";
  }
  return "6b7280";
}

export function toMarkdownTable(headers, rows) {
  const safeRows = rows.length ? rows : [new Array(headers.length).fill("-")];
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...safeRows.map((row) => `| ${row.map((cell) => String(cell).replace(/\n/g, "<br>")).join(" | ")} |`)
  ].join("\n");
}

export function toTitle(value) {
  return value
    .split(/[-_.]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function deriveUiSurface(facts) {
  const uiGroup =
    facts.profile.group === "UI Foundation" ||
    facts.profile.group === "Admin Experience";

  if (uiGroup && facts.reactDependency && facts.tsxSourceFiles.length > 0) {
    return "React UI + typed helpers";
  }
  if (uiGroup && facts.reactDependency) {
    return "Mixed runtime helpers";
  }
  if (facts.reactDependency && facts.tsxSourceFiles.length > 0) {
    return "React-aware helpers";
  }
  return "Headless typed exports";
}

function deriveConsumptionModel(facts) {
  if (facts.uiSurface.includes("React UI") && facts.publicModules.some((entry) => entry.includes("providers") || entry.includes("shells"))) {
    return "Imports + providers + callbacks";
  }
  if (facts.uiSurface.includes("React") || facts.uiSurface.includes("Mixed")) {
    return "Imports + typed UI primitives";
  }
  return "Imports + typed helpers";
}

function deriveVerificationLabel(facts) {
  const parts = [];
  if (facts.nestedScripts.build) {
    parts.push("Build");
  }
  if (facts.nestedScripts.typecheck) {
    parts.push("Typecheck");
  }
  if (facts.nestedScripts.lint) {
    parts.push("Lint");
  }
  if (facts.nestedScripts.test) {
    parts.push("Test");
  }
  if (facts.tests.byLane.contracts.length > 0) {
    parts.push("Contracts");
  }
  return parts.join("+") || "Docs";
}

function deriveVerificationCommands(facts) {
  const commands = [
    "bun run build",
    "bun run typecheck",
    "bun run lint",
    "bun run test",
    "bun run docs:check"
  ];

  for (const scriptName of Object.keys(facts.nestedScripts).sort()) {
    if (scriptName.startsWith("test:") && scriptName !== "test" && !commands.includes(`bun run ${scriptName}`)) {
      commands.push(`bun run ${scriptName}`);
    }
  }

  return commands;
}

function computeMaturity(facts) {
  if (!facts.nestedScripts.build || !facts.nestedScripts.typecheck || !facts.nestedScripts.lint || !facts.nestedScripts.test) {
    return "Scaffolded";
  }

  if (facts.tests.totalFiles === 0) {
    return "Scaffolded";
  }

  const broadApi =
    facts.publicModules.length >= 4 ||
    facts.exportedSymbols.length >= 12 ||
    facts.sourceFiles.length >= 6;
  const strongerEvidence =
    facts.tests.byLane.contracts.length > 0 ||
    facts.tests.totalFiles >= 2;

  if (strongerEvidence || broadApi) {
    return "Hardened";
  }

  return "Baseline";
}

function deriveCurrentCapabilities(facts) {
  const bullets = [];

  bullets.push(
    `Publishes ${facts.publicModules.length} public module${facts.publicModules.length === 1 ? "" : "s"} from \`${facts.nestedPackageName}\`${facts.publicModules.length ? `: ${facts.publicModules.map((entry) => `\`${entry}\``).join(", ")}.` : "."}`
  );

  bullets.push(
    `Exports ${facts.exportedSymbols.length} named symbol${facts.exportedSymbols.length === 1 ? "" : "s"} through the public entrypoint${facts.exportedSymbols.length ? `, including ${facts.exportedSymbols.slice(0, 6).map((entry) => `\`${entry.name}\``).join(", ")}${facts.exportedSymbols.length > 6 ? ", and more." : "."}` : "."}`
  );

  if (facts.reactDependency) {
    bullets.push(`Uses a React-aware surface model: ${facts.uiSurface}.`);
  } else {
    bullets.push("Keeps the public surface headless and import-driven rather than requiring a UI runtime.");
  }

  bullets.push(
    `Verification lanes present: ${facts.verificationLabel || "docs-only"}${facts.tests.byLane.contracts.length ? ` with ${facts.tests.byLane.contracts.length} contract file(s).` : "."}`
  );

  return bullets;
}

function deriveCurrentGaps(facts) {
  const gaps = [];
  const broadApi =
    facts.publicModules.length >= 4 ||
    facts.exportedSymbols.length >= 12 ||
    facts.sourceFiles.length >= 6;

  if (broadApi && facts.tests.byLane.contracts.length === 0) {
    gaps.push("Broad public API surface still relies on unit coverage only; there is no separate contract lane yet.");
  }

  if (facts.dependencies.some((entry) => entry.startsWith("@platform/") || entry.startsWith("@plugins/"))) {
    gaps.push("Standalone consumers still need a compatible Gutu workspace to resolve workspace-scoped dependencies honestly.");
  }

  if (facts.reactDependency && facts.tests.totalFiles < 2) {
    gaps.push("React-facing behavior is covered lightly; the repo does not yet ship deeper interaction or visual verification lanes.");
  }

  return dedupeList(gaps);
}

function deriveRecommendedNext(facts) {
  const next = [];
  const broadApi =
    facts.publicModules.length >= 4 ||
    facts.exportedSymbols.length >= 12 ||
    facts.sourceFiles.length >= 6;

  if (broadApi && facts.tests.byLane.contracts.length === 0) {
    next.push("Add contract-focused tests around the most reused public modules and exported helpers.");
  }

  if (facts.reactDependency) {
    next.push("Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.");
  }

  if (facts.dependencies.some((entry) => entry.startsWith("@platform/"))) {
    next.push("Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.");
  }

  return dedupeList(next);
}

function deriveGlossaryTerms(facts) {
  return dedupeList(
    [
      facts.packageId,
      ...facts.publicModules.map((entry) => entry.replace(/^\.\//, "")),
      ...facts.exportedSymbols.slice(0, 12).map((entry) => entry.name)
    ].filter(Boolean)
  ).map((term) => ({
    term,
    meaning: glossaryMeaningFor(facts, term)
  }));
}

function glossaryMeaningFor(facts, term) {
  if (term === facts.packageId) {
    return "Stable package identifier declared by the public entrypoint.";
  }

  const moduleFact = facts.moduleFacts.find((entry) => entry.modulePath.replace(/^\.\//, "") === term);
  if (moduleFact) {
    return `Public module re-exported from \`${moduleFact.fileRelative}\`.`;
  }

  const symbol = facts.exportedSymbols.find((entry) => entry.name === term);
  if (symbol) {
    return `Public ${symbol.kind} exported through the root entrypoint.`;
  }

  return "Public term documented by the library docs generator.";
}

function collectDocsState(rootPath, filenames) {
  return filenames.map((filename) => {
    const absolutePath = join(rootPath, filename);
    const exists = existsSync(absolutePath);
    const content = exists ? readText(absolutePath) : "";
    return {
      filename,
      absolutePath,
      exists,
      content,
      hasPlaceholder: exists ? placeholderPatterns.some((pattern) => pattern.test(content)) : false
    };
  });
}

function collectPublicModules(indexText) {
  const modules = [];
  const patterns = [
    /export\s+\*\s+from\s+["']([^"']+)["']/g,
    /export\s*\{[^}]+\}\s*from\s*["']([^"']+)["']/g
  ];

  for (const pattern of patterns) {
    for (const match of indexText.matchAll(pattern)) {
      modules.push(match[1]);
    }
  }

  return [...new Set(modules)];
}

function collectIndexConstants(indexText) {
  const constants = [];
  for (const kind of ["const", "function", "class", "type", "interface", "enum"]) {
    const regex =
      kind === "function"
        ? /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g
        : new RegExp(`export\\s+${kind}\\s+([A-Za-z0-9_]+)`, "g");
    for (const match of indexText.matchAll(regex)) {
      constants.push({ name: match[1], kind });
    }
  }
  return dedupeSymbols(constants);
}

function collectModuleFact(packageDir, modulePath) {
  const moduleFile = resolveModuleFile(join(packageDir, "src"), modulePath);
  if (!moduleFile || !existsSync(moduleFile)) {
    return null;
  }

  const exports = collectExportedSymbols(readText(moduleFile));
  return {
    modulePath,
    filePath: moduleFile,
    fileRelative: relative(packageDir, moduleFile).replaceAll("\\", "/"),
    exports
  };
}

function collectSourceFiles(srcDir) {
  if (!existsSync(srcDir)) {
    return [];
  }

  const files = [];
  walk(srcDir, (entry) => {
    if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) {
      return;
    }
    files.push({
      path: relative(srcDir, entry).replaceAll("\\", "/"),
      exports: collectExportedSymbols(readText(entry))
    });
  });

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function collectTests(testsDir) {
  const byLane = {
    unit: [],
    contracts: [],
    integration: [],
    migrations: []
  };

  if (!existsSync(testsDir)) {
    return {
      byLane,
      totalFiles: 0
    };
  }

  walk(testsDir, (entry) => {
    if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) {
      return;
    }

    const rel = relative(testsDir, entry).replaceAll("\\", "/");
    if (rel.startsWith("contracts/")) {
      byLane.contracts.push(rel);
    } else if (rel.startsWith("integration/")) {
      byLane.integration.push(rel);
    } else if (rel.startsWith("migrations/")) {
      byLane.migrations.push(rel);
    } else {
      byLane.unit.push(rel);
    }
  });

  return {
    byLane,
    totalFiles:
      byLane.unit.length +
      byLane.contracts.length +
      byLane.integration.length +
      byLane.migrations.length
  };
}

function collectExportedSymbols(text) {
  const results = [];
  const patterns = [
    { kind: "const", regex: /export\s+const\s+([A-Za-z0-9_]+)/g },
    { kind: "function", regex: /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g },
    { kind: "class", regex: /export\s+class\s+([A-Za-z0-9_]+)/g },
    { kind: "type", regex: /export\s+type\s+([A-Za-z0-9_]+)/g },
    { kind: "interface", regex: /export\s+interface\s+([A-Za-z0-9_]+)/g },
    { kind: "enum", regex: /export\s+enum\s+([A-Za-z0-9_]+)/g }
  ];

  for (const { kind, regex } of patterns) {
    for (const match of text.matchAll(regex)) {
      results.push({ name: match[1], kind });
    }
  }

  for (const match of text.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const raw of match[1].split(",")) {
      const part = raw.trim();
      if (!part) {
        continue;
      }
      const name = part.includes(" as ") ? part.split(/\s+as\s+/).at(-1) : part;
      results.push({ name, kind: "symbol" });
    }
  }

  return dedupeSymbols(results);
}

function resolveModuleFile(srcDir, modulePath) {
  const normalized = modulePath.replace(/^\.\//, "");
  const candidates = [
    join(srcDir, `${normalized}.ts`),
    join(srcDir, `${normalized}.tsx`),
    join(srcDir, normalized, "index.ts"),
    join(srcDir, normalized, "index.tsx")
  ];

  return candidates.find((entry) => existsSync(entry)) ?? null;
}

function parseConstString(text, fieldName) {
  const pattern = new RegExp(`export\\s+const\\s+${fieldName}\\s*=\\s*["'\`]([^"'\`]+)["'\`]`);
  const match = text.match(pattern);
  return match ? match[1] : null;
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function walk(root, visitor) {
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    if (statSync(current).isDirectory()) {
      for (const entry of readdirSync(current).sort().reverse()) {
        stack.push(join(current, entry));
      }
      continue;
    }

    visitor(current);
  }
}

function dedupeList(values) {
  return [...new Set(values)];
}

function dedupeSymbols(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const key = `${value.kind}:${value.name}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}

export { maturityOrder, libraryGroupOrder };
