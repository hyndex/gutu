import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  buildFirstPartyCatalogFromWorkspace,
  computeDirectoryDigest,
  createEmptyGutuOverrides,
  createFirstPartyRepoReference,
  createGutuLockfile,
  deriveImplicitRequestsFromWorkspace,
  exportCatalogRepositories,
  loadCompatibilityChannel,
  loadFirstPartyCatalog,
  readGutuLockfile,
  readGutuOverrides,
  resolveVendoredPackages,
  scaffoldStandalonePackageRepository,
  syncVendoredPackages,
  validateWorkspaceEcosystem,
  writeGutuLockfile,
  writeGutuOverrides,
  type EcosystemCatalogEntry,
  type GutuLockfile,
  type PackageRequests,
  type VendoredPackagePlan
} from "@platform/ecosystem";

import { detectFrameworkSourceRoot, frameworkDistributionEntries } from "./project";

export function bootstrapWorkspaceEcosystem(projectRoot: string) {
  writeGutuOverrides(projectRoot, createEmptyGutuOverrides());
  writeGutuLockfile(
    projectRoot,
    createGutuLockfile({
      compatibilityChannel: "stable",
      framework: createFrameworkLockRecord(resolveFrameworkVendorRoot(projectRoot)),
      requests: {
        libraries: [],
        plugins: []
      }
    })
  );

  return syncWorkspaceEcosystem(projectRoot);
}

export function addWorkspaceEcosystemPackage(
  workspaceRoot: string,
  kind: "library" | "plugin",
  packageId: string
) {
  return syncWorkspaceEcosystem(workspaceRoot, {
    requestsMutator(requests) {
      const nextRequests = {
        libraries: [...(requests.libraries ?? [])],
        plugins: [...(requests.plugins ?? [])]
      };

      const target = kind === "library" ? nextRequests.libraries : nextRequests.plugins;
      if (!target.includes(packageId)) {
        target.push(packageId);
      }

      return {
        libraries: nextRequests.libraries.sort((left, right) => left.localeCompare(right)),
        plugins: nextRequests.plugins.sort((left, right) => left.localeCompare(right))
      };
    }
  });
}

export function updateWorkspaceEcosystem(
  workspaceRoot: string,
  options: {
    packageId?: string | undefined;
    channelId?: string | undefined;
  } = {}
) {
  const result = syncWorkspaceEcosystem(workspaceRoot, {
    channelId: options.channelId
  });

  if (options.packageId) {
    if (
      !result.lockfile.requests.libraries.includes(options.packageId) &&
      !result.lockfile.requests.plugins.includes(options.packageId) &&
      !result.lockfile.resolved.libraries.some((entry) => entry.id === options.packageId) &&
      !result.lockfile.resolved.plugins.some((entry) => entry.id === options.packageId)
    ) {
      throw new Error(`Package '${options.packageId}' is not installed in this workspace.`);
    }
  }

  return result;
}

export function addWorkspaceOverride(workspaceRoot: string, packageId: string, overridePath: string) {
  return syncWorkspaceEcosystem(workspaceRoot, {
    overridesMutator(overrides) {
      return {
        ...overrides,
        packages: {
          ...overrides.packages,
          [packageId]: {
            path: path.resolve(workspaceRoot, overridePath)
          }
        }
      };
    }
  });
}

export function removeWorkspaceOverride(workspaceRoot: string, packageId: string) {
  return syncWorkspaceEcosystem(workspaceRoot, {
    overridesMutator(overrides) {
      const nextPackages = { ...overrides.packages };
      delete nextPackages[packageId];
      return {
        ...overrides,
        packages: nextPackages
      };
    }
  });
}

export function doctorWorkspaceEcosystem(workspaceRoot: string) {
  const context = loadWorkspaceEcosystemContext(workspaceRoot);
  const result = validateWorkspaceEcosystem({
    workspaceRoot,
    lockfile: context.lockfile,
    overrides: context.overrides,
    catalog: context.catalog,
    compatibilityChannel: context.compatibilityChannel
  });

  return {
    ok: result.ok,
    compatibilityChannel: context.compatibilityChannel.id,
    issueCount: result.issues.length,
    issues: result.issues
  };
}

export function exportEcosystemCatalogs(cwd: string, outDir: string) {
  const sourceRoot = resolveMaintainerSourceRoot(cwd);
  const catalog = buildFirstPartyCatalogFromWorkspace(sourceRoot);
  const packageJson = readJson(path.join(sourceRoot, "package.json")) as { version: string };
  exportCatalogRepositories({
    outDir,
    catalog,
    channels: [
      {
        id: "stable",
        label: "Stable",
        frameworkVersion: `^${packageJson.version}`,
        packages: catalog.map((entry) => entry.id)
      },
      {
        id: "next",
        label: "Next",
        frameworkVersion: `^${packageJson.version}`,
        packages: catalog.map((entry) => entry.id)
      }
    ]
  });

  return {
    ok: true,
    outDir
  };
}

export function scaffoldEcosystemPackageRepository(cwd: string, packageId: string, outDir: string) {
  const sourceRoot = resolveMaintainerSourceRoot(cwd);
  const catalog = buildFirstPartyCatalogFromWorkspace(sourceRoot);
  scaffoldStandalonePackageRepository({
    packageId,
    catalog,
    sourceRoot,
    outDir
  });

  return {
    ok: true,
    packageId,
    outDir
  };
}

type WorkspaceEcosystemContext = {
  frameworkRoot: string;
  catalog: EcosystemCatalogEntry[];
  compatibilityChannel: ReturnType<typeof loadCompatibilityChannel>;
  lockfile: GutuLockfile;
  overrides: ReturnType<typeof createEmptyGutuOverrides>;
  implicitRequests: Required<PackageRequests>;
  plan: VendoredPackagePlan;
};

function loadWorkspaceEcosystemContext(
  workspaceRoot: string,
  options: {
    channelId?: string | undefined;
    requestsMutator?: ((requests: Required<PackageRequests>) => Required<PackageRequests>) | undefined;
    overridesMutator?: ((overrides: ReturnType<typeof createEmptyGutuOverrides>) => ReturnType<typeof createEmptyGutuOverrides>) | undefined;
  } = {}
): WorkspaceEcosystemContext {
  const frameworkRoot = resolveFrameworkVendorRoot(workspaceRoot);
  if (!existsSync(frameworkRoot)) {
    throw new Error(`Workspace '${workspaceRoot}' is missing vendor/framework/gutu.`);
  }

  const catalog = loadFirstPartyCatalog(frameworkRoot);
  const currentLockfile =
    readGutuLockfile(workspaceRoot) ??
    createGutuLockfile({
      compatibilityChannel: options.channelId ?? "stable",
      framework: createFrameworkLockRecord(frameworkRoot),
      requests: {
        libraries: [],
        plugins: []
      }
    });
  const overrides = options.overridesMutator
    ? options.overridesMutator(readGutuOverrides(workspaceRoot) ?? createEmptyGutuOverrides())
    : readGutuOverrides(workspaceRoot) ?? createEmptyGutuOverrides();
  const requests = options.requestsMutator
    ? options.requestsMutator({
        libraries: [...currentLockfile.requests.libraries],
        plugins: [...currentLockfile.requests.plugins]
      })
    : {
        libraries: [...currentLockfile.requests.libraries],
        plugins: [...currentLockfile.requests.plugins]
      };
  const compatibilityChannel = loadCompatibilityChannel(
    frameworkRoot,
    options.channelId ?? currentLockfile.compatibilityChannel,
    catalog
  );
  const implicitRequests = deriveImplicitRequestsFromWorkspace(workspaceRoot, catalog);
  const plan = resolveVendoredPackages({
    catalog,
    compatibilityChannel,
    requests,
    implicitRequests,
    overrides: overrides.packages,
    catalogRoot: frameworkRoot
  });

  return {
    frameworkRoot,
    catalog,
    compatibilityChannel,
    lockfile: createGutuLockfile({
      compatibilityChannel: compatibilityChannel.id,
      framework: createFrameworkLockRecord(frameworkRoot),
      requests,
      resolved: plan
    }),
    overrides,
    implicitRequests,
    plan
  };
}

function syncWorkspaceEcosystem(
  workspaceRoot: string,
  options: {
    channelId?: string | undefined;
    requestsMutator?: ((requests: Required<PackageRequests>) => Required<PackageRequests>) | undefined;
    overridesMutator?: ((overrides: ReturnType<typeof createEmptyGutuOverrides>) => ReturnType<typeof createEmptyGutuOverrides>) | undefined;
  } = {}
) {
  const context = loadWorkspaceEcosystemContext(workspaceRoot, options);

  syncVendoredPackages(workspaceRoot, context.plan);
  const frameworkLock = createFrameworkLockRecord(context.frameworkRoot);
  const lockfile = createGutuLockfile({
    compatibilityChannel: context.compatibilityChannel.id,
    framework: frameworkLock,
    requests: context.lockfile.requests,
    resolved: context.plan
  });

  writeGutuLockfile(workspaceRoot, lockfile);
  writeGutuOverrides(workspaceRoot, context.overrides);

  return {
    ok: true,
    compatibilityChannel: context.compatibilityChannel.id,
    implicitRequests: context.implicitRequests,
    resolved: {
      libraries: lockfile.resolved.libraries.map((entry) => entry.id),
      plugins: lockfile.resolved.plugins.map((entry) => entry.id)
    },
    lockfile
  };
}

function createFrameworkLockRecord(frameworkRoot: string): GutuLockfile["framework"] {
  const packageJson = readJson(path.join(frameworkRoot, "package.json")) as { version: string };

  return {
    repo: {
      ...createFirstPartyRepoReference({
        kind: "plugin",
        id: "core"
      }),
      name: "gutu-core",
      url: "https://github.com/gutula/gutu-core"
    },
    version: packageJson.version,
    vendorPath: "vendor/framework/gutu",
    integrity: computeDirectoryDigest(frameworkRoot)
  };
}

function resolveFrameworkVendorRoot(workspaceRoot: string) {
  return path.join(workspaceRoot, "vendor", "framework", "gutu");
}

function resolveMaintainerSourceRoot(cwd: string) {
  const directCandidate = path.resolve(cwd);
  if (
    existsSync(path.join(directCandidate, "framework", "libraries")) &&
    existsSync(path.join(directCandidate, "framework", "builtin-plugins"))
  ) {
    return directCandidate;
  }

  const frameworkRoot = detectFrameworkSourceRoot();
  if (
    existsSync(path.join(frameworkRoot, "framework", "libraries")) &&
    existsSync(path.join(frameworkRoot, "framework", "builtin-plugins"))
  ) {
    return frameworkRoot;
  }

  throw new Error("A full gutu-core checkout is required for catalog export and repo scaffolding.");
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function getFrameworkDistributionEntries() {
  return [...frameworkDistributionEntries];
}
