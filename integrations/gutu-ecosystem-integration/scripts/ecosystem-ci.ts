import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

type PackageKind = "app" | "library" | "plugin";

type PackageRecord = {
  id: string;
  kind: PackageKind;
  private: boolean;
  repoRootRelative: string;
  packageRelative: string;
  packageAbsolute: string;
  scripts: Record<string, string>;
  workspaceDependencies: string[];
};

type CommandResult = {
  ok: boolean;
  command: string;
  code: number;
  stdout: string;
  stderr: string;
};

type PackageMatrixResult = {
  id: string;
  kind: PackageKind;
  packageRelative: string;
  commands: CommandResult[];
};

type AuditReport = {
  generatedAt: string;
  workspaceRoot: string;
  integrationRoot: string;
  packages: PackageRecord[];
  compatPackageIds: string[];
  unresolvedWorkspaceDependencies: Array<{
    packageId: string;
    missing: string[];
  }>;
  manifestDrift: Array<{
    packageId: string;
    missing: string[];
  }>;
  unresolvedImports: string[];
};

type CertificationReport = {
  generatedAt: string;
  workspaceRoot: string;
  certificationWorkspace: string;
  install: CommandResult;
  packageResults: PackageMatrixResult[];
  failures: Array<{
    packageId: string;
    command: string;
    code: number;
  }>;
};

type ConsumerSmokeReport = {
  generatedAt: string;
  exampleRoot: string;
  init: CommandResult;
  vendorSync: CommandResult;
  verifiedPaths: string[];
  packagedArtifacts: string[];
};

const integrationRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(integrationRoot, "..", "..");
const reportsRoot = join(integrationRoot, "reports");
const tempRoot = join(integrationRoot, ".tmp");
const certificationWorkspaceRoot = join(tempRoot, "certify-workspace");
const consumerSmokeRoot = join(tempRoot, "consumer-smoke");
const extractedRoots = {
  apps: join(workspaceRoot, "apps"),
  libraries: join(workspaceRoot, "libraries"),
  plugins: join(workspaceRoot, "plugins")
};
const compatRoot = join(integrationRoot, "compat");
const coreRoot = join(workspaceRoot, "gutu-core");

const scriptOrder = ["lint", "typecheck", "test", "build"] as const;

async function main() {
  const command = process.argv[2] ?? "audit";
  mkdirSync(reportsRoot, { recursive: true });
  mkdirSync(tempRoot, { recursive: true });

  if (command === "audit") {
    const report = createAuditReport();
    writeAuditReport(report);
    assertAuditHealthy(report);
    return;
  }

  if (command === "certify") {
    const report = runCertification();
    writeCertificationReport(report);
    assertCertificationHealthy(report);
    return;
  }

  if (command === "consumer-smoke") {
    const report = runConsumerSmoke();
    writeConsumerSmokeReport(report);
    assertConsumerSmokeHealthy(report);
    return;
  }

  throw new Error(`Unknown command '${command}'. Expected audit, certify, or consumer-smoke.`);
}

function createAuditReport(): AuditReport {
  const packages = discoverPackages();
  const compatPackageIds = discoverCompatPackageIds();
  const availablePackageIds = new Set<string>([
    ...packages.map((entry) => entry.id),
    ...compatPackageIds
  ]);

  const unresolvedWorkspaceDependencies = packages
    .map((entry) => ({
      packageId: entry.id,
      missing: entry.workspaceDependencies.filter((dependency) => !availablePackageIds.has(dependency))
    }))
    .filter((entry) => entry.missing.length > 0);

  const manifestDrift = findManifestDrift(packages, availablePackageIds);
  const unresolvedImports = findUnresolvedImports(availablePackageIds);

  return {
    generatedAt: new Date().toISOString(),
    workspaceRoot,
    integrationRoot,
    packages,
    compatPackageIds,
    unresolvedWorkspaceDependencies,
    manifestDrift,
    unresolvedImports
  };
}

function runCertification(): CertificationReport {
  const audit = createAuditReport();
  writeAuditReport(audit);

  ensureCleanDirectory(certificationWorkspaceRoot);
  copyRepoRoots(certificationWorkspaceRoot, audit.packages);
  cpSync(compatRoot, join(certificationWorkspaceRoot, "compat"), {
    recursive: true
  });
  writeCertificationWorkspacePackageJson(certificationWorkspaceRoot);
  normalizeCertificationWorkspace(certificationWorkspaceRoot);

  const install = runCommand(certificationWorkspaceRoot, ["bun", "install"]);
  const packageResults = new Map<string, PackageMatrixResult>();
  for (const entry of audit.packages) {
    packageResults.set(entry.id, {
      id: entry.id,
      kind: entry.kind,
      packageRelative: entry.packageRelative,
      commands: []
    });
  }

  if (install.ok) {
    for (const entry of audit.packages.sort((left, right) => left.id.localeCompare(right.id))) {
      const packagePath = join(certificationWorkspaceRoot, entry.packageRelative);
      const result = packageResults.get(entry.id);
      if (!result) {
        continue;
      }

      if (entry.scripts.lint) {
        result.commands.push(runCommand(packagePath, ["bun", "run", "lint"]));
      }
    }

    for (const entry of topologicalSortPackages(audit.packages)) {
      const packagePath = join(certificationWorkspaceRoot, entry.packageRelative);
      const result = packageResults.get(entry.id);
      if (entry.scripts.build) {
        result?.commands.push(runCommand(packagePath, ["bun", "run", "build"]));
      }
    }

    for (const entry of audit.packages.sort((left, right) => left.id.localeCompare(right.id))) {
      const packagePath = join(certificationWorkspaceRoot, entry.packageRelative);
      const result = packageResults.get(entry.id);
      if (!result) {
        continue;
      }

      for (const scriptName of scriptOrder) {
        if (scriptName === "build" || scriptName === "lint" || !entry.scripts[scriptName]) {
          continue;
        }

        result.commands.push(runCommand(packagePath, ["bun", "run", scriptName]));
      }

      if (!entry.private) {
        result.commands.push(runCommand(packagePath, ["npm", "pack", "--json", "--dry-run"]));
      }
    }
  }

  const packageResultsList = [...packageResults.values()];
  const failures = packageResultsList.flatMap((entry) =>
    entry.commands
      .filter((command) => !command.ok)
      .map((command) => ({
        packageId: entry.id,
        command: command.command,
        code: command.code
      }))
  );

  if (!install.ok) {
    failures.unshift({
      packageId: "workspace",
      command: install.command,
      code: install.code
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    workspaceRoot,
    certificationWorkspace: certificationWorkspaceRoot,
    install,
    packageResults: packageResultsList,
    failures
  };
}

function runConsumerSmoke(): ConsumerSmokeReport {
  if (!existsSync(certificationWorkspaceRoot)) {
    const certification = runCertification();
    writeCertificationReport(certification);
    assertCertificationHealthy(certification);
  }

  ensureCleanDirectory(consumerSmokeRoot);
  const exampleRoot = join(consumerSmokeRoot, "demo-consumer");
  const init = runCommand(coreRoot, ["bun", "run", "framework/core/cli/src/bin.ts", "init", exampleRoot]);

  const packagedArtifacts = [
    packPublishedPackage(join(certificationWorkspaceRoot, "libraries", "gutu-lib-communication", "framework", "libraries", "communication")),
    packPublishedPackage(
      join(
        certificationWorkspaceRoot,
        "plugins",
        "gutu-plugin-notifications-core",
        "framework",
        "builtin-plugins",
        "notifications-core"
      )
    )
  ];

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

  const libraries = [createLockEntry("@platform/communication", "library", packagedArtifacts[0], privateKey, publicKeyPem)];
  const plugins = [createLockEntry("@plugins/notifications-core", "plugin", packagedArtifacts[1], privateKey, publicKeyPem)];

  writeFileSync(
    join(exampleRoot, "gutu.lock.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        channel: "stable",
        core: {
          package: "gutu-core",
          version: "0.0.1"
        },
        libraries,
        plugins
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  const vendorSync = runCommand(coreRoot, [
    "bun",
    "run",
    "framework/core/cli/src/bin.ts",
    "vendor",
    "sync",
    exampleRoot
  ]);

  const verifiedPaths = [
    join(exampleRoot, "vendor", "libraries", "communication", "package.json"),
    join(exampleRoot, "vendor", "plugins", "notifications-core", "package.json")
  ].filter((entry) => existsSync(entry));

  return {
    generatedAt: new Date().toISOString(),
    exampleRoot,
    init,
    vendorSync,
    verifiedPaths,
    packagedArtifacts
  };
}

function discoverPackages(): PackageRecord[] {
  return [
    ...scanPackageRoots(extractedRoots.apps, "app", ["apps"]),
    ...scanPackageRoots(extractedRoots.libraries, "library", ["framework", "libraries"]),
    ...scanPackageRoots(extractedRoots.plugins, "plugin", ["framework", "builtin-plugins"])
  ];
}

function scanPackageRoots(baseRoot: string, kind: PackageKind, nestedSegments: string[]): PackageRecord[] {
  if (!existsSync(baseRoot)) {
    return [];
  }

  const records: PackageRecord[] = [];
  for (const repoName of readdirSync(baseRoot)) {
    const repoRoot = join(baseRoot, repoName);
    const nestedRoot = join(repoRoot, ...nestedSegments);
    if (!existsSync(nestedRoot)) {
      continue;
    }

    for (const packageFolder of readdirSync(nestedRoot)) {
      const packageRoot = join(nestedRoot, packageFolder);
      const packageJsonPath = join(packageRoot, "package.json");
      if (!existsSync(packageJsonPath)) {
        continue;
      }

      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
        name: string;
        private?: boolean;
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };

      const dependencies = {
        ...(packageJson.dependencies ?? {}),
        ...(packageJson.devDependencies ?? {})
      };

      records.push({
        id: packageJson.name,
        kind,
        private: Boolean(packageJson.private),
        repoRootRelative: relative(workspaceRoot, repoRoot),
        packageRelative: relative(workspaceRoot, packageRoot),
        packageAbsolute: packageRoot,
        scripts: packageJson.scripts ?? {},
        workspaceDependencies: Object.entries(dependencies)
          .filter(([, version]) => version.startsWith("workspace:"))
          .map(([dependency]) => dependency)
          .sort()
      });
    }
  }

  return records.sort((left, right) => left.id.localeCompare(right.id));
}

function discoverCompatPackageIds(): string[] {
  if (!existsSync(compatRoot)) {
    return [];
  }

  return readdirSync(compatRoot)
    .map((entry) => join(compatRoot, entry, "package.json"))
    .filter((entry) => existsSync(entry))
    .map((entry) => JSON.parse(readFileSync(entry, "utf8")) as { name: string })
    .map((entry) => entry.name)
    .sort();
}

function findUnresolvedImports(availablePackageIds: Set<string>): string[] {
  const unresolved = new Set<string>();
  const importPattern = /from\s+["']([^"']+)["']/g;

  for (const root of [extractedRoots.apps, extractedRoots.libraries, extractedRoots.plugins]) {
    for (const file of walkFiles(root)) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) {
        continue;
      }

      const contents = readFileSync(file, "utf8");
      let match: RegExpExecArray | null = null;
      while ((match = importPattern.exec(contents)) !== null) {
        const dependency = match[1];
        if (
          (dependency.startsWith("@platform/") || dependency.startsWith("@plugins/") || dependency.startsWith("@apps/")) &&
          !availablePackageIds.has(dependency)
        ) {
          unresolved.add(dependency);
        }
      }
    }
  }

  return [...unresolved].sort();
}

function findManifestDrift(packages: PackageRecord[], availablePackageIds: Set<string>) {
  const firstPartyPattern = /^@(platform|plugins|apps)\//;

  return packages
    .map((entry) => {
      const imported = new Set<string>();
      const importPattern = /from\s+["']([^"']+)["']/g;

      for (const file of walkFiles(entry.packageAbsolute)) {
        if (!file.endsWith(".ts") && !file.endsWith(".tsx")) {
          continue;
        }

        const contents = readFileSync(file, "utf8");
        let match: RegExpExecArray | null = null;
        while ((match = importPattern.exec(contents)) !== null) {
          const dependency = match[1];
          if (firstPartyPattern.test(dependency) && availablePackageIds.has(dependency) && dependency !== entry.id) {
            imported.add(dependency);
          }
        }
      }

      const missing = [...imported].filter((dependency) => !entry.workspaceDependencies.includes(dependency)).sort();
      return {
        packageId: entry.id,
        missing
      };
    })
    .filter((entry) => entry.missing.length > 0);
}

function walkFiles(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }

  const files: string[] = [];
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.pop() as string;
    for (const entry of readdirSync(current)) {
      const absolute = join(current, entry);
      if (entry === "node_modules" || entry === "dist" || entry === "coverage") {
        continue;
      }
      const fileStat = statSync(absolute);
      if (fileStat.isDirectory()) {
        queue.push(absolute);
      } else {
        files.push(absolute);
      }
    }
  }

  return files;
}

function ensureCleanDirectory(target: string) {
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
}

function copyRepoRoots(targetRoot: string, packages: PackageRecord[]) {
  const repoRoots = new Set(packages.map((entry) => entry.repoRootRelative));
  for (const repoRootRelative of repoRoots) {
    const source = join(workspaceRoot, repoRootRelative);
    const destination = join(targetRoot, repoRootRelative);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination, {
      recursive: true,
      filter(entry) {
        return !entry.endsWith("/node_modules") && !entry.endsWith("/dist") && !entry.endsWith("/coverage");
      }
    });
  }
}

function writeCertificationWorkspacePackageJson(targetRoot: string) {
  writeFileSync(
    join(targetRoot, "package.json"),
    JSON.stringify(
      {
        name: "gutu-ecosystem-certify-workspace",
        private: true,
        type: "module",
        workspaces: [
          "apps/*/apps/*",
          "libraries/*/framework/libraries/*",
          "plugins/*/framework/builtin-plugins/*",
          "compat/*"
        ],
        devDependencies: {
          "@eslint/js": "^9.25.1",
          "@types/react": "^19.2.2",
          "@types/react-dom": "^19.2.2",
          "bun-types": "^1.3.12",
          "eslint": "^9.25.1",
          "globals": "^16.0.0",
          "playwright": "^1.55.0",
          "react": "^19.1.0",
          "react-dom": "^19.1.0",
          "typescript": "5.8.3",
          "typescript-eslint": "^8.30.1",
          "zod": "^3.24.3"
        }
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
}

function normalizeCertificationWorkspace(targetRoot: string) {
  for (const repoGroup of ["apps", "libraries", "plugins"] as const) {
    const groupRoot = join(targetRoot, repoGroup);
    if (!existsSync(groupRoot)) {
      continue;
    }

    for (const repoName of readdirSync(groupRoot)) {
      const repoRoot = join(groupRoot, repoName);
      const tsconfigBasePath = join(repoRoot, "tsconfig.base.json");
      if (!existsSync(tsconfigBasePath)) {
        continue;
      }

      writeFileSync(
        tsconfigBasePath,
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2022",
              module: "ESNext",
              moduleResolution: "Bundler",
              strict: true,
              noUncheckedIndexedAccess: true,
              exactOptionalPropertyTypes: true,
              verbatimModuleSyntax: true,
              skipLibCheck: true,
              jsx: "react-jsx",
              declaration: true,
              lib: ["ES2022", "DOM"],
              types: ["bun-types", "react", "react-dom"],
              baseUrl: ".",
              paths: {
                "@gutu/kernel": ["framework/core/kernel/src/index.ts"],
                "@gutu/ecosystem": ["framework/core/ecosystem/src/index.ts"],
                "@gutu/cli": ["framework/core/cli/src/index.ts"],
                "@gutu/release": ["framework/core/release/src/index.ts"]
              }
            }
          },
          null,
          2
        ) + "\n",
        "utf8"
      );
    }
  }

  const harnessPath = join(
    targetRoot,
    "apps",
    "gutu-app-platform-dev-console",
    "apps",
    "platform-dev-console",
    "src",
    "harness.tsx"
  );
  if (existsSync(harnessPath)) {
    const source = readFileSync(harnessPath, "utf8");
    writeFileSync(harnessPath, source.replace("/* eslint-disable react-refresh/only-export-components */\n", ""), "utf8");
  }
}

function topologicalSortPackages(packages: PackageRecord[]): PackageRecord[] {
  const packageMap = new Map(packages.map((entry) => [entry.id, entry]));
  const ordered: PackageRecord[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(entry: PackageRecord) {
    if (visited.has(entry.id) || visiting.has(entry.id)) {
      return;
    }

    visiting.add(entry.id);
    for (const dependency of entry.workspaceDependencies) {
      const dependencyEntry = packageMap.get(dependency);
      if (dependencyEntry) {
        visit(dependencyEntry);
      }
    }
    visiting.delete(entry.id);
    visited.add(entry.id);
    ordered.push(entry);
  }

  for (const entry of packages) {
    visit(entry);
  }

  return ordered;
}

function runCommand(cwd: string, args: string[], extraEnv?: Record<string, string>): CommandResult {
  const [command, ...rest] = args;
  const result = spawnSync(command, rest, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...extraEnv
    }
  });

  return {
    ok: result.status === 0,
    command: args.join(" "),
    code: result.status ?? 1,
    stdout: trimOutput(result.stdout),
    stderr: trimOutput(result.stderr)
  };
}

function trimOutput(output: string | null | undefined, maxChars = 4000): string {
  if (!output) {
    return "";
  }
  if (output.length <= maxChars) {
    return output;
  }
  return `${output.slice(0, maxChars)}\n...[truncated]...`;
}

function packPublishedPackage(packageRoot: string): string {
  const build = runCommand(packageRoot, ["bun", "run", "build"]);
  if (!build.ok) {
    throw new Error(`Unable to build package before packing: ${packageRoot}\n${build.stderr || build.stdout}`);
  }

  const packed = runCommand(packageRoot, ["npm", "pack", "--json"]);
  if (!packed.ok) {
    throw new Error(`Unable to pack package ${packageRoot}\n${packed.stderr || packed.stdout}`);
  }

  const metadata = JSON.parse(packed.stdout.trim()) as Array<{ filename: string }>;
  const filename = metadata[0]?.filename;
  if (!filename) {
    throw new Error(`npm pack did not return a filename for ${packageRoot}.`);
  }

  return join(packageRoot, filename);
}

function createLockEntry(
  id: string,
  kind: "library" | "plugin",
  artifactPath: string,
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"],
  publicKeyPem: string
) {
  const sha256 = createHash("sha256").update(readFileSync(artifactPath)).digest("hex");
  return {
    id,
    kind,
    repo: `gutula/${kind === "plugin" ? "gutu-plugin" : "gutu-lib"}-${id.split("/").at(-1)}`,
    version: "0.1.0",
    channel: "stable",
    artifact: {
      uri: pathToFileURL(artifactPath).toString(),
      format: "tgz",
      sha256,
      signature: sign(null, Buffer.from(sha256, "utf8"), privateKey).toString("base64"),
      publicKeyPem
    }
  };
}

function writeAuditReport(report: AuditReport) {
  writeJson(join(reportsRoot, "ecosystem-audit.json"), report);
  writeFileSync(
    join(reportsRoot, "ecosystem-audit.md"),
    [
      "# Ecosystem Audit",
      "",
      `Generated: ${report.generatedAt}`,
      "",
      `- Packages discovered: ${report.packages.length}`,
      `- Compatibility shims: ${report.compatPackageIds.length}`,
      `- Unresolved workspace dependencies: ${report.unresolvedWorkspaceDependencies.length}`,
      `- Manifest drift findings: ${report.manifestDrift.length}`,
      `- Unresolved imports: ${report.unresolvedImports.length}`,
      "",
      "## Compatibility Shims",
      "",
      ...report.compatPackageIds.map((entry) => `- \`${entry}\``),
      "",
      "## Unresolved Workspace Dependencies",
      "",
      ...(report.unresolvedWorkspaceDependencies.length === 0
        ? ["- none"]
        : report.unresolvedWorkspaceDependencies.map(
            (entry) => `- \`${entry.packageId}\`: ${entry.missing.map((item) => `\`${item}\``).join(", ")}`
          )),
      "",
      "## Manifest Drift",
      "",
      ...(report.manifestDrift.length === 0
        ? ["- none"]
        : report.manifestDrift.map((entry) => `- \`${entry.packageId}\`: ${entry.missing.map((item) => `\`${item}\``).join(", ")}`)),
      "",
      "## Unresolved Imports",
      "",
      ...(report.unresolvedImports.length === 0 ? ["- none"] : report.unresolvedImports.map((entry) => `- \`${entry}\``))
    ].join("\n") + "\n",
    "utf8"
  );
}

function writeCertificationReport(report: CertificationReport) {
  writeJson(join(reportsRoot, "ecosystem-certify.json"), report);

  const totalCommands = report.packageResults.reduce((count, entry) => count + entry.commands.length, 0);
  const failedCommands = report.failures.length;
  writeFileSync(
    join(reportsRoot, "ecosystem-certify.md"),
    [
      "# Ecosystem Certification",
      "",
      `Generated: ${report.generatedAt}`,
      "",
      `- Certification workspace: \`${report.certificationWorkspace}\``,
      `- Workspace install: ${report.install.ok ? "pass" : "fail"}`,
      `- Packages checked: ${report.packageResults.length}`,
      `- Commands executed: ${totalCommands}`,
      `- Failed commands: ${failedCommands}`,
      "",
      "## Failures",
      "",
      ...(report.failures.length === 0
        ? ["- none"]
        : report.failures.map((entry) => `- \`${entry.packageId}\` failed \`${entry.command}\` with exit code ${entry.code}`)),
      "",
      "## Package Results",
      "",
      ...report.packageResults.flatMap((entry) => [
        `### ${entry.id}`,
        ...entry.commands.map(
          (command) => `- ${command.ok ? "pass" : "fail"} \`${command.command}\` (${command.code})`
        ),
        ""
      ])
    ].join("\n") + "\n",
    "utf8"
  );
}

function writeConsumerSmokeReport(report: ConsumerSmokeReport) {
  writeJson(join(reportsRoot, "consumer-smoke.json"), report);
  writeFileSync(
    join(reportsRoot, "consumer-smoke.md"),
    [
      "# Consumer Smoke",
      "",
      `Generated: ${report.generatedAt}`,
      "",
      `- Example root: \`${report.exampleRoot}\``,
      `- Init: ${report.init.ok ? "pass" : "fail"}`,
      `- Vendor sync: ${report.vendorSync.ok ? "pass" : "fail"}`,
      "",
      "## Verified Paths",
      "",
      ...report.verifiedPaths.map((entry) => `- \`${entry}\``),
      "",
      "## Packaged Artifacts",
      "",
      ...report.packagedArtifacts.map((entry) => `- \`${entry}\``)
    ].join("\n") + "\n",
    "utf8"
  );
}

function assertAuditHealthy(report: AuditReport) {
  if (report.unresolvedWorkspaceDependencies.length > 0 || report.manifestDrift.length > 0 || report.unresolvedImports.length > 0) {
    throw new Error("Ecosystem audit found dependency or import drift. See reports/ecosystem-audit.md.");
  }
}

function assertCertificationHealthy(report: CertificationReport) {
  if (!report.install.ok || report.failures.length > 0) {
    throw new Error("Ecosystem certification failed. See reports/ecosystem-certify.md.");
  }
}

function assertConsumerSmokeHealthy(report: ConsumerSmokeReport) {
  if (!report.init.ok || !report.vendorSync.ok || report.verifiedPaths.length !== 2) {
    throw new Error("Consumer smoke verification failed. See reports/consumer-smoke.md.");
  }
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
