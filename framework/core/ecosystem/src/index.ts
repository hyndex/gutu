import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import path from "node:path";

import { z } from "zod";

export const packageId = "ecosystem" as const;
export const packageDisplayName = "Ecosystem" as const;
export const packageDescription =
  "Split-repo ecosystem contracts, compatibility channels, vendoring plans, and catalog generation for Gutu." as const;

const stringArray = z.array(z.string().min(1)).default([]);
const repoReferenceSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url()
});

const dependencySetSchema = z.object({
  core: stringArray,
  libraries: stringArray,
  plugins: stringArray
});

export const ecosystemTierValues = [
  "official-first-party",
  "experimental",
  "deprecated",
  "community"
] as const;

const ecosystemTierSchema = z.enum(ecosystemTierValues);
const ecosystemKindSchema = z.enum(["library", "plugin"]);

export const ecosystemCatalogEntrySchema = z.object({
  id: z.string().min(1),
  kind: ecosystemKindSchema,
  packageName: z.string().min(1),
  version: z.string().min(1),
  repo: repoReferenceSchema,
  sourcePath: z.string().min(1),
  vendorPath: z.string().min(1),
  dependencies: dependencySetSchema,
  channels: stringArray,
  tier: ecosystemTierSchema,
  docsPath: z.string().min(1).optional()
});

export type EcosystemCatalogEntry = z.infer<typeof ecosystemCatalogEntrySchema>;

export const compatibilityChannelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  frameworkVersion: z.string().min(1),
  packages: stringArray
});

export type CompatibilityChannel = z.infer<typeof compatibilityChannelSchema>;

const frameworkLockSchema = z.object({
  repo: repoReferenceSchema,
  version: z.string().min(1),
  vendorPath: z.string().min(1),
  integrity: z.string().min(1).optional()
});

const resolvedPackageSchema = z.object({
  id: z.string().min(1),
  kind: ecosystemKindSchema,
  packageName: z.string().min(1),
  version: z.string().min(1),
  repo: repoReferenceSchema,
  sourcePath: z.string().min(1),
  vendorPath: z.string().min(1),
  integrity: z.string().min(1),
  channels: stringArray,
  tier: ecosystemTierSchema,
  dependencies: dependencySetSchema,
  fromOverride: z.boolean().default(false),
  docsPath: z.string().min(1).optional()
});

export type ResolvedVendoredPackage = z.infer<typeof resolvedPackageSchema>;

export const gutuLockfileSchema = z.object({
  formatVersion: z.literal(1),
  compatibilityChannel: z.string().min(1),
  requests: z.object({
    libraries: stringArray,
    plugins: stringArray
  }),
  framework: frameworkLockSchema,
  resolved: z.object({
    libraries: z.array(resolvedPackageSchema).default([]),
    plugins: z.array(resolvedPackageSchema).default([])
  })
});

export type GutuLockfile = z.infer<typeof gutuLockfileSchema>;

export const gutuOverridesSchema = z.object({
  formatVersion: z.literal(1),
  packages: z.record(
    z.string().min(1),
    z.object({
      path: z.string().min(1)
    })
  )
});

export type GutuOverrides = z.infer<typeof gutuOverridesSchema>;

export type PackageRequests = {
  libraries?: string[] | undefined;
  plugins?: string[] | undefined;
};

export type VendoredPackagePlan = {
  libraries: ResolvedVendoredPackage[];
  plugins: ResolvedVendoredPackage[];
};

export type BuildCatalogOptions = {
  owner?: string | undefined;
};

export type ExportCatalogRepositoriesOptions = {
  outDir: string;
  catalog: EcosystemCatalogEntry[];
  channels: CompatibilityChannel[];
};

export type ScaffoldStandalonePackageRepositoryOptions = {
  packageId: string;
  catalog: EcosystemCatalogEntry[];
  sourceRoot: string;
  outDir: string;
};

const frameworkDistributionIgnoreTopLevel = new Set([
  "artifacts",
  "coverage",
  "node_modules",
  "playwright-report",
  "test-results",
  ".git"
]);

const packageSnapshotIgnoredDirectories = new Set([
  "artifacts",
  "coverage",
  "dist",
  "node_modules",
  ".git"
]);

export function createFirstPartyRepoReference(input: {
  kind: "library" | "plugin";
  id: string;
  owner?: string | undefined;
}): z.infer<typeof repoReferenceSchema> {
  const owner = input.owner ?? "gutula";
  const name = input.kind === "library" ? `gutu-lib-${input.id}` : `gutu-plugin-${input.id}`;

  return {
    owner,
    name,
    url: `https://github.com/${owner}/${name}`
  };
}

export function defineCompatibilityChannel(input: CompatibilityChannel): CompatibilityChannel {
  return compatibilityChannelSchema.parse({
    ...input,
    packages: sortUnique(input.packages)
  });
}

export function validateGutuLockfile(input: unknown) {
  return gutuLockfileSchema.safeParse(input);
}

export function validateGutuOverrides(input: unknown) {
  return gutuOverridesSchema.safeParse(input);
}

export function resolveVendoredPackages(input: {
  catalog: EcosystemCatalogEntry[];
  compatibilityChannel: CompatibilityChannel;
  requests: PackageRequests;
  implicitRequests?: PackageRequests | undefined;
  overrides?: Record<string, { path: string }> | undefined;
  catalogRoot?: string | undefined;
}): VendoredPackagePlan {
  const allowedPackages = new Set(input.compatibilityChannel.packages);
  const catalogById = new Map(input.catalog.map((entry) => [entry.id, entry]));
  const libraries = new Map<string, ResolvedVendoredPackage>();
  const plugins = new Map<string, ResolvedVendoredPackage>();
  const overrides = input.overrides ?? {};

  for (const packageId of sortUnique([
    ...(input.requests.libraries ?? []),
    ...(input.implicitRequests?.libraries ?? [])
  ])) {
    visit(packageId);
  }

  for (const packageId of sortUnique([
    ...(input.requests.plugins ?? []),
    ...(input.implicitRequests?.plugins ?? [])
  ])) {
    visit(packageId);
  }

  return {
    libraries: [...libraries.values()].sort((left, right) => left.id.localeCompare(right.id)),
    plugins: [...plugins.values()].sort((left, right) => left.id.localeCompare(right.id))
  };

  function visit(packageId: string) {
    if (!allowedPackages.has(packageId)) {
      throw new Error(
        `Package '${packageId}' is not available in compatibility channel '${input.compatibilityChannel.id}'.`
      );
    }

    const catalogEntry = catalogById.get(packageId);
    if (!catalogEntry) {
      throw new Error(`Package '${packageId}' is missing from the ecosystem catalog.`);
    }

    const targetMap = catalogEntry.kind === "library" ? libraries : plugins;
    if (targetMap.has(packageId)) {
      return;
    }

    const sourcePath = resolveSourcePath(catalogEntry.sourcePath, input.catalogRoot);
    const overridePath = overrides[packageId]?.path;
    const effectiveSourcePath = overridePath ? resolveAbsolutePath(overridePath) : sourcePath;
    if (!existsSync(effectiveSourcePath)) {
      throw new Error(`Package '${packageId}' source path '${effectiveSourcePath}' does not exist.`);
    }

    targetMap.set(packageId, {
      ...catalogEntry,
      sourcePath: effectiveSourcePath,
      integrity: computeDirectoryDigest(effectiveSourcePath),
      fromOverride: Boolean(overridePath)
    });

    for (const dependencyId of catalogEntry.dependencies.libraries) {
      visit(dependencyId);
    }

    for (const dependencyId of catalogEntry.dependencies.plugins) {
      visit(dependencyId);
    }
  }
}

export function readGutuLockfile(workspaceRoot: string): GutuLockfile | undefined {
  const filePath = path.join(workspaceRoot, "gutu.lock.json");
  if (!existsSync(filePath)) {
    return undefined;
  }

  const parsed = validateGutuLockfile(readJson(filePath));
  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
}

export function writeGutuLockfile(workspaceRoot: string, lockfile: GutuLockfile) {
  const parsed = gutuLockfileSchema.parse(lockfile);
  writeJson(path.join(workspaceRoot, "gutu.lock.json"), parsed);
}

export function readGutuOverrides(workspaceRoot: string): GutuOverrides | undefined {
  const filePath = path.join(workspaceRoot, "gutu.overrides.json");
  if (!existsSync(filePath)) {
    return undefined;
  }

  const parsed = validateGutuOverrides(readJson(filePath));
  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
}

export function writeGutuOverrides(workspaceRoot: string, overrides: GutuOverrides) {
  const parsed = gutuOverridesSchema.parse(overrides);
  writeJson(path.join(workspaceRoot, "gutu.overrides.json"), parsed);
}

export function createEmptyGutuOverrides(): GutuOverrides {
  return {
    formatVersion: 1,
    packages: {}
  };
}

export function createGutuLockfile(input: {
  compatibilityChannel: string;
  framework: GutuLockfile["framework"];
  requests?: PackageRequests | undefined;
  resolved?: Partial<VendoredPackagePlan> | undefined;
}): GutuLockfile {
  return gutuLockfileSchema.parse({
    formatVersion: 1,
    compatibilityChannel: input.compatibilityChannel,
    requests: {
      libraries: sortUnique(input.requests?.libraries ?? []),
      plugins: sortUnique(input.requests?.plugins ?? [])
    },
    framework: input.framework,
    resolved: {
      libraries: (input.resolved?.libraries ?? []).map((entry) => resolvedPackageSchema.parse(entry)),
      plugins: (input.resolved?.plugins ?? []).map((entry) => resolvedPackageSchema.parse(entry))
    }
  });
}

export function computeDirectoryDigest(directoryPath: string): string {
  const hash = createHash("sha256");
  for (const relativePath of listPackageSnapshotFiles(directoryPath)) {
    hash.update(relativePath);
    hash.update(readFileSync(path.join(directoryPath, relativePath)));
  }
  return hash.digest("hex");
}

export function computePathSetDigest(root: string, entries: string[]): string {
  const hash = createHash("sha256");

  for (const relativeEntry of sortUnique(entries)) {
    const absoluteEntry = path.join(root, relativeEntry);
    if (!existsSync(absoluteEntry)) {
      continue;
    }

    if (statSync(absoluteEntry).isDirectory()) {
      for (const relativeFile of listPackageSnapshotFiles(absoluteEntry)) {
        hash.update(path.join(relativeEntry, relativeFile).replace(/\\/g, "/"));
        hash.update(readFileSync(path.join(absoluteEntry, relativeFile)));
      }
      continue;
    }

    hash.update(relativeEntry.replace(/\\/g, "/"));
    hash.update(readFileSync(absoluteEntry));
  }

  return hash.digest("hex");
}

export function syncVendoredPackages(workspaceRoot: string, plan: VendoredPackagePlan) {
  const libraryRoot = path.join(workspaceRoot, "vendor", "libraries");
  const pluginRoot = path.join(workspaceRoot, "vendor", "plugins");
  mkdirSync(libraryRoot, { recursive: true });
  mkdirSync(pluginRoot, { recursive: true });

  pruneVendorDirectory(libraryRoot, new Set(plan.libraries.map((entry) => path.basename(entry.vendorPath))));
  pruneVendorDirectory(pluginRoot, new Set(plan.plugins.map((entry) => path.basename(entry.vendorPath))));

  for (const entry of plan.libraries) {
    const targetPath = path.join(workspaceRoot, entry.vendorPath);
    rmSync(targetPath, { recursive: true, force: true });
    copyPackageSnapshot(entry.sourcePath, targetPath);
  }

  for (const entry of plan.plugins) {
    const targetPath = path.join(workspaceRoot, entry.vendorPath);
    rmSync(targetPath, { recursive: true, force: true });
    copyPackageSnapshot(entry.sourcePath, targetPath);
  }

  ensureGitKeep(libraryRoot);
  ensureGitKeep(pluginRoot);
}

export function validateWorkspaceEcosystem(input: {
  workspaceRoot: string;
  lockfile: GutuLockfile;
  overrides: GutuOverrides;
  catalog: EcosystemCatalogEntry[];
  compatibilityChannel: CompatibilityChannel;
}): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const allowedPackages = new Set(input.compatibilityChannel.packages);

  for (const packageId of [
    ...input.lockfile.requests.libraries,
    ...input.lockfile.requests.plugins,
    ...Object.keys(input.overrides.packages)
  ]) {
    if (!allowedPackages.has(packageId)) {
      issues.push(
        `Package '${packageId}' is outside compatibility channel '${input.compatibilityChannel.id}'.`
      );
    }
  }

  for (const entry of [...input.lockfile.resolved.libraries, ...input.lockfile.resolved.plugins]) {
    const vendorPath = path.join(input.workspaceRoot, entry.vendorPath);
    if (!existsSync(vendorPath)) {
      issues.push(`Vendored package '${entry.id}' is missing from '${entry.vendorPath}'.`);
      continue;
    }

    const digest = computeDirectoryDigest(vendorPath);
    if (digest !== entry.integrity) {
      issues.push(`Vendored package '${entry.id}' digest does not match the lockfile.`);
    }
  }

  for (const packageId of Object.keys(input.overrides.packages)) {
    const overridePath = resolveAbsolutePath(input.overrides.packages[packageId]?.path ?? "");
    if (!existsSync(overridePath)) {
      issues.push(`Override path for '${packageId}' is missing: ${overridePath}`);
    }
  }

  for (const packageId of [...input.lockfile.requests.libraries, ...input.lockfile.requests.plugins]) {
    if (!input.catalog.some((entry) => entry.id === packageId)) {
      issues.push(`Requested package '${packageId}' is missing from the catalog.`);
    }
  }

  return {
    ok: issues.length === 0,
    issues
  };
}

export function exportCatalogRepositories(options: ExportCatalogRepositoriesOptions) {
  const libraries = options.catalog.filter((entry) => entry.kind === "library");
  const plugins = options.catalog.filter((entry) => entry.kind === "plugin");
  const librariesDir = path.join(options.outDir, "gutu-libraries");
  const pluginsDir = path.join(options.outDir, "gutu-plugins");

  rmSync(options.outDir, { recursive: true, force: true });
  mkdirSync(librariesDir, { recursive: true });
  mkdirSync(pluginsDir, { recursive: true });

  writeFileSync(path.join(librariesDir, "README.md"), renderCatalogReadme("libraries", libraries, options.channels), "utf8");
  writeFileSync(path.join(librariesDir, "catalog.json"), JSON.stringify(libraries, null, 2), "utf8");
  writeFileSync(path.join(pluginsDir, "README.md"), renderCatalogReadme("plugins", plugins, options.channels), "utf8");
  writeFileSync(path.join(pluginsDir, "catalog.json"), JSON.stringify(plugins, null, 2), "utf8");
}

export function scaffoldStandalonePackageRepository(options: ScaffoldStandalonePackageRepositoryOptions) {
  const catalogEntry = options.catalog.find((entry) => entry.id === options.packageId);
  if (!catalogEntry) {
    throw new Error(`Unknown ecosystem package '${options.packageId}'.`);
  }

  const sourcePath = resolveSourcePath(catalogEntry.sourcePath, options.sourceRoot);
  if (!existsSync(sourcePath)) {
    throw new Error(`Package source '${sourcePath}' does not exist.`);
  }

  mkdirSync(options.outDir, { recursive: true });
  copyPackageSnapshot(sourcePath, options.outDir);
  ensureDir(path.join(options.outDir, ".github", "workflows"));
  writeFileSync(path.join(options.outDir, ".github", "workflows", "ci.yml"), createRepoCiWorkflow(), "utf8");
  writeFileSync(path.join(options.outDir, ".github", "workflows", "release.yml"), createRepoReleaseWorkflow(), "utf8");
  ensureDir(path.join(options.outDir, ".github"));
  writeFileSync(path.join(options.outDir, ".github", "dependabot.yml"), createRepoDependabotConfig(), "utf8");
  if (!existsSync(path.join(options.outDir, "README.md"))) {
    writeFileSync(
      path.join(options.outDir, "README.md"),
      `# ${toDisplayName(catalogEntry.id)}\n\nCanonical standalone package snapshot for \`${catalogEntry.packageName}\`.\n`,
      "utf8"
    );
  }
  if (!existsSync(path.join(options.outDir, "CHANGELOG.md"))) {
    writeFileSync(path.join(options.outDir, "CHANGELOG.md"), "# Changelog\n\n## 0.1.0\n\n- Initial extracted package snapshot.\n", "utf8");
  }
  if (!existsSync(path.join(options.outDir, "SECURITY.md"))) {
    writeFileSync(
      path.join(options.outDir, "SECURITY.md"),
      "# Security\n\nReport security issues privately to the Gutu maintainers before opening a public issue.\n",
      "utf8"
    );
  }
  if (!existsSync(path.join(options.outDir, "CONTRIBUTING.md"))) {
    writeFileSync(
      path.join(options.outDir, "CONTRIBUTING.md"),
      "# Contributing\n\nRun `bun run typecheck`, `bun run lint`, and `bun run test` before publishing changes.\n",
      "utf8"
    );
  }
  if (!existsSync(path.join(options.outDir, "CODEOWNERS"))) {
    writeFileSync(path.join(options.outDir, "CODEOWNERS"), "* @gutula/maintainers\n", "utf8");
  }
}

export function buildFirstPartyCatalogFromWorkspace(rootDir: string, options: BuildCatalogOptions = {}): EcosystemCatalogEntry[] {
  const owner = options.owner ?? "gutula";
  const packageIndex = new Map<string, { id: string; kind: "core" | "library" | "plugin" }>();
  const rawEntries: Array<{
    id: string;
    kind: "library" | "plugin";
    packageName: string;
    version: string;
    sourcePath: string;
    docsPath?: string | undefined;
    internalDependencyNames: string[];
    pluginDependencyIds: string[];
  }> = [];

  for (const { directory, kind } of [
    { directory: path.join(rootDir, "framework", "core"), kind: "core" as const },
    { directory: path.join(rootDir, "framework", "libraries"), kind: "library" as const },
    { directory: path.join(rootDir, "framework", "builtin-plugins"), kind: "plugin" as const }
  ]) {
    if (!existsSync(directory)) {
      continue;
    }

    for (const entryName of readdirSync(directory)) {
      const packageDir = path.join(directory, entryName);
      if (!statSync(packageDir).isDirectory()) {
        continue;
      }

      const packageJsonPath = path.join(packageDir, "package.json");
      if (!existsSync(packageJsonPath)) {
        continue;
      }

      const packageJson = readJson(packageJsonPath) as {
        name: string;
        version: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const id = packageJson.name.startsWith("@platform/")
        ? packageJson.name.slice("@platform/".length)
        : packageJson.name.startsWith("@plugins/")
          ? packageJson.name.slice("@plugins/".length)
          : entryName;
      packageIndex.set(packageJson.name, { id, kind });

      if (kind === "core") {
        continue;
      }

      rawEntries.push({
        id,
        kind,
        packageName: packageJson.name,
        version: packageJson.version,
        sourcePath: path.relative(rootDir, packageDir).replace(/\\/g, "/"),
        docsPath: existsSync(path.join(packageDir, "docs"))
          ? path.relative(rootDir, path.join(packageDir, "docs")).replace(/\\/g, "/")
          : undefined,
        internalDependencyNames: sortUnique([
          ...Object.keys(packageJson.dependencies ?? {}),
          ...Object.keys(packageJson.devDependencies ?? {})
        ]).filter((dependencyName) =>
          dependencyName.startsWith("@platform/") || dependencyName.startsWith("@plugins/")
        ),
        pluginDependencyIds: readPackageManifestDependsOn(packageDir)
      });
    }
  }

  return rawEntries
    .map((entry) => {
      const dependencies = {
        core: [] as string[],
        libraries: [] as string[],
        plugins: [] as string[]
      };

      for (const dependencyName of entry.internalDependencyNames) {
        const mapped = packageIndex.get(dependencyName);
        if (!mapped) {
          continue;
        }

        if (mapped.kind === "core") {
          dependencies.core.push(mapped.id);
        } else if (mapped.kind === "library") {
          dependencies.libraries.push(mapped.id);
        } else {
          dependencies.plugins.push(mapped.id);
        }
      }

      for (const dependencyId of entry.pluginDependencyIds) {
        if (rawEntries.some((candidate) => candidate.kind === "plugin" && candidate.id === dependencyId)) {
          dependencies.plugins.push(dependencyId);
        }
      }

      const repo = createFirstPartyRepoReference({ kind: entry.kind, id: entry.id, owner });

      return ecosystemCatalogEntrySchema.parse({
        id: entry.id,
        kind: entry.kind,
        packageName: entry.packageName,
        version: entry.version,
        repo,
        sourcePath: entry.sourcePath,
        vendorPath: entry.kind === "library" ? `vendor/libraries/${entry.id}` : `vendor/plugins/${entry.id}`,
        dependencies: {
          core: sortUnique(dependencies.core),
          libraries: sortUnique(dependencies.libraries),
          plugins: sortUnique(dependencies.plugins)
        },
        channels: ["stable", "next"],
        tier: "official-first-party",
        ...(entry.docsPath ? { docsPath: entry.docsPath } : {})
      });
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function buildCompatibilityChannelFromCatalog(input: {
  catalog: EcosystemCatalogEntry[];
  id: string;
  label: string;
  frameworkVersion: string;
}): CompatibilityChannel {
  return defineCompatibilityChannel({
    id: input.id,
    label: input.label,
    frameworkVersion: input.frameworkVersion,
    packages: input.catalog.map((entry) => entry.id)
  });
}

export function loadFirstPartyCatalog(rootDir: string): EcosystemCatalogEntry[] {
  const catalogPath = path.join(rootDir, "ecosystem", "catalog", "first-party-packages.json");
  if (existsSync(catalogPath)) {
    const parsed = z.array(ecosystemCatalogEntrySchema).safeParse(readJson(catalogPath));
    if (parsed.success) {
      return parsed.data;
    }
  }

  return buildFirstPartyCatalogFromWorkspace(rootDir);
}

export function loadCompatibilityChannel(rootDir: string, channelId: string, catalog?: EcosystemCatalogEntry[]): CompatibilityChannel {
  const channelPath = path.join(rootDir, "ecosystem", "channels", `${channelId}.json`);
  if (existsSync(channelPath)) {
    return defineCompatibilityChannel(readJson(channelPath) as CompatibilityChannel);
  }

  const packageJson = readJson(path.join(rootDir, "package.json")) as { version: string };
  return buildCompatibilityChannelFromCatalog({
    catalog: catalog ?? loadFirstPartyCatalog(rootDir),
    id: channelId,
    label: toDisplayName(channelId),
    frameworkVersion: `^${packageJson.version}`
  });
}

export function deriveImplicitRequestsFromWorkspace(
  workspaceRoot: string,
  catalog: EcosystemCatalogEntry[]
): Required<PackageRequests> {
  const requests = {
    libraries: new Set<string>(),
    plugins: new Set<string>()
  };
  const catalogByPackageName = new Map(catalog.map((entry) => [entry.packageName, entry]));
  const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));

  for (const packageDir of getWorkspacePackageDirs(workspaceRoot)) {
    const relativePackageDir = path.relative(workspaceRoot, packageDir).replace(/\\/g, "/");
    if (
      relativePackageDir.startsWith("vendor/plugins/") ||
      relativePackageDir.startsWith("vendor/libraries/")
    ) {
      continue;
    }

    const packageJsonPath = path.join(packageDir, "package.json");
    if (!existsSync(packageJsonPath)) {
      continue;
    }

    const packageJson = readJson(packageJsonPath) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    for (const dependencyName of sortUnique([
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {})
    ])) {
      const catalogEntry = catalogByPackageName.get(dependencyName);
      if (!catalogEntry) {
        continue;
      }

      if (catalogEntry.kind === "library") {
        requests.libraries.add(catalogEntry.id);
      } else {
        requests.plugins.add(catalogEntry.id);
      }
    }

    for (const dependencyId of readPackageManifestDependsOn(packageDir)) {
      const catalogEntry = catalogById.get(dependencyId);
      if (catalogEntry?.kind === "plugin") {
        requests.plugins.add(catalogEntry.id);
      }
    }
  }

  return {
    libraries: [...requests.libraries].sort((left, right) => left.localeCompare(right)),
    plugins: [...requests.plugins].sort((left, right) => left.localeCompare(right))
  };
}

function readPackageManifestDependsOn(packageDir: string): string[] {
  const packageManifestPath = path.join(packageDir, "package.ts");
  if (!existsSync(packageManifestPath)) {
    return [];
  }

  return parseStringArrayProperty(readFileSync(packageManifestPath, "utf8"), "dependsOn");
}

function parseStringArrayProperty(source: string, propertyName: string): string[] {
  const pattern = new RegExp(`${propertyName}\\s*:\\s*\\[([\\s\\S]*?)\\]`, "m");
  const match = pattern.exec(source);
  if (!match?.[1]) {
    return [];
  }

  return sortUnique(
    [...match[1].matchAll(/["'`]([^"'`]+)["'`]/g)].map((entry) => entry[1]).filter((value): value is string => Boolean(value))
  );
}

function resolveSourcePath(sourcePath: string, rootDir?: string): string {
  if (path.isAbsolute(sourcePath)) {
    return sourcePath;
  }

  return path.resolve(rootDir ?? process.cwd(), sourcePath);
}

function resolveAbsolutePath(value: string): string {
  return path.resolve(value);
}

function pruneVendorDirectory(rootDir: string, expectedEntries: Set<string>) {
  if (!existsSync(rootDir)) {
    return;
  }

  for (const entry of readdirSync(rootDir)) {
    if (entry === ".gitkeep") {
      continue;
    }
    if (expectedEntries.has(entry)) {
      continue;
    }
    rmSync(path.join(rootDir, entry), { recursive: true, force: true });
  }
}

function copyPackageSnapshot(sourceDir: string, targetDir: string) {
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, {
    recursive: true,
    filter: (entryPath) => {
      const relativePath = path.relative(sourceDir, entryPath).replace(/\\/g, "/");
      if (!relativePath) {
        return true;
      }

      const topLevel = relativePath.split("/")[0];
      if (topLevel && packageSnapshotIgnoredDirectories.has(topLevel)) {
        return false;
      }

      return !relativePath.endsWith(".tsbuildinfo");
    }
  });
}

function listPackageSnapshotFiles(rootDir: string): string[] {
  const files: string[] = [];
  walk(rootDir, "");
  return files.sort((left, right) => left.localeCompare(right));

  function walk(currentDir: string, relativeDir: string) {
    for (const entry of readdirSync(currentDir)) {
      if (frameworkDistributionIgnoreTopLevel.has(entry) || packageSnapshotIgnoredDirectories.has(entry)) {
        continue;
      }

      if (entry === ".DS_Store") {
        continue;
      }

      const absolutePath = path.join(currentDir, entry);
      const relativePath = relativeDir ? path.join(relativeDir, entry) : entry;
      const stats = statSync(absolutePath);
      if (stats.isDirectory()) {
        walk(absolutePath, relativePath);
        continue;
      }

      if (relativePath.endsWith(".tsbuildinfo")) {
        continue;
      }

      files.push(relativePath.replace(/\\/g, "/"));
    }
  }
}

function ensureGitKeep(directoryPath: string) {
  mkdirSync(directoryPath, { recursive: true });
  const entries = readdirSync(directoryPath).filter((entry) => entry !== ".gitkeep");
  if (entries.length === 0) {
    writeFileSync(path.join(directoryPath, ".gitkeep"), "", "utf8");
  } else if (existsSync(path.join(directoryPath, ".gitkeep"))) {
    rmSync(path.join(directoryPath, ".gitkeep"), { force: true });
  }
}

function renderCatalogReadme(
  kind: "libraries" | "plugins",
  entries: EcosystemCatalogEntry[],
  channels: CompatibilityChannel[]
): string {
  const title = kind === "libraries" ? "Gutu Libraries" : "Gutu Plugins";
  const rows = entries
    .map(
      (entry) =>
        `| \`${entry.id}\` | \`${entry.packageName}\` | [${entry.repo.name}](${entry.repo.url}) | ${entry.channels.join(", ")} | ${entry.tier} |`
    )
    .join("\n");
  const channelRows = channels
    .map((channel) => `- \`${channel.id}\` -> ${channel.packages.length} compatible packages`)
    .join("\n");

  return [
    `# ${title}`,
    "",
    "Generated showcase catalog for the first-party Gutu ecosystem.",
    "",
    "## Compatibility Channels",
    "",
    channelRows,
    "",
    "## Packages",
    "",
    "| ID | Package | Repo | Channels | Tier |",
    "| --- | --- | --- | --- | --- |",
    rows || "| _none_ | _none_ | _none_ | _none_ | _none_ |",
    ""
  ].join("\n");
}

function createRepoCiWorkflow(): string {
  return [
    "name: CI",
    "",
    "on:",
    "  push:",
    "    branches: [main]",
    "  pull_request:",
    "",
    "jobs:",
    "  verify:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: oven-sh/setup-bun@v2",
    "      - run: bun install",
    "      - run: bun run typecheck",
    "      - run: bun run lint",
    "      - run: bun run test",
    ""
  ].join("\n");
}

function createRepoReleaseWorkflow(): string {
  return [
    "name: Release",
    "",
    "on:",
    "  workflow_dispatch:",
    "  push:",
    "    tags:",
    "      - 'v*'",
    "",
    "jobs:",
    "  release:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: oven-sh/setup-bun@v2",
    "      - run: bun install",
    "      - run: bun run typecheck",
    "      - run: bun run test",
    "      - run: echo 'Attach signed release artifacts in the canonical gutu-core pipeline or repo-local publish workflow.'",
    ""
  ].join("\n");
}

function createRepoDependabotConfig(): string {
  return [
    "version: 2",
    "updates:",
    "  - package-ecosystem: npm",
    "    directory: /",
    "    schedule:",
    "      interval: weekly",
    ""
  ].join("\n");
}

function getWorkspacePackageDirs(rootDir: string): string[] {
  const packageJsonPath = path.join(rootDir, "package.json");
  if (!existsSync(packageJsonPath)) {
    return [];
  }

  const packageJson = readJson(packageJsonPath) as { workspaces?: string[] };
  const patterns = Array.isArray(packageJson.workspaces) ? packageJson.workspaces : [];
  const packageDirs = new Set<string>();

  for (const pattern of patterns) {
    for (const packageDir of expandWorkspacePattern(rootDir, pattern)) {
      packageDirs.add(packageDir);
    }
  }

  return [...packageDirs].sort((left, right) => left.localeCompare(right));
}

function expandWorkspacePattern(rootDir: string, workspacePattern: string): string[] {
  const normalizedPattern = workspacePattern.replace(/\/+$/, "");

  if (normalizedPattern.endsWith("/*")) {
    const parentPath = path.join(rootDir, normalizedPattern.slice(0, -2));
    if (!existsSync(parentPath)) {
      return [];
    }

    return readdirSync(parentPath)
      .map((entry) => path.join(parentPath, entry))
      .filter((entryPath) => statSync(entryPath).isDirectory() && existsSync(path.join(entryPath, "package.json")));
  }

  const absolutePath = path.join(rootDir, normalizedPattern);
  return existsSync(path.join(absolutePath, "package.json")) ? [absolutePath] : [];
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath: string, payload: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function ensureDir(directoryPath: string) {
  mkdirSync(directoryPath, { recursive: true });
}

function sortUnique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toDisplayName(slug: string): string {
  return slug
    .split(/[-_./]+/g)
    .filter(Boolean)
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(" ");
}
