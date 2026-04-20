import { createRequire } from "node:module";
import { builtinModules } from "node:module";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { getWorkspacePackageDirs, readJson, rootDir } from "./workspace-utils.mjs";

const ignoredSpecifiers = new Set([
  "bun",
  "bun:test",
  "bun:sqlite"
]);
const builtins = new Set([...builtinModules, ...builtinModules.map((entry) => `node:${entry}`)]);
const require = createRequire(import.meta.url);
const ts = require("typescript");

const packageDirs = getWorkspacePackageDirs(rootDir);
const rootDevDependencies = new Set(Object.keys(readJson(path.join(rootDir, "package.json")).devDependencies ?? {}));
const workspacePackageNames = new Set(
  packageDirs
    .map((packageDir) => {
      const packageJsonPath = path.join(packageDir, "package.json");
      return existsSync(packageJsonPath) ? readJson(packageJsonPath).name : null;
    })
    .filter(Boolean)
);
const problems = [];

for (const packageDir of packageDirs) {
  const packageJsonPath = path.join(packageDir, "package.json");
  if (!existsSync(packageJsonPath)) {
    continue;
  }

  const packageJson = readJson(packageJsonPath);
  const declaredProdDeps = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {})
  ]);
  const declaredTestDeps = new Set([
    ...declaredProdDeps,
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...rootDevDependencies,
    ...workspacePackageNames
  ]);

  for (const filePath of walkPackageFiles(packageDir)) {
    const isTestFile =
      filePath.includes(`${path.sep}tests${path.sep}`) ||
      filePath.endsWith(".test.ts") ||
      filePath.endsWith(".test.tsx");
    const allowedDeps = isTestFile ? declaredTestDeps : declaredProdDeps;
    for (const specifier of collectImportSpecifiers(readFileSync(filePath, "utf8"))) {
      const dependencyName = toDependencyName(specifier);
      if (!dependencyName) {
        continue;
      }

      if (!allowedDeps.has(dependencyName)) {
        problems.push({
          packageName: packageJson.name ?? path.basename(packageDir),
          file: path.relative(rootDir, filePath),
          dependencyName,
          requiredSection: isTestFile ? "dependencies/peerDependencies/optionalDependencies/devDependencies" : "dependencies/peerDependencies/optionalDependencies"
        });
      }
    }
  }
}

if (problems.length > 0) {
  console.error("Workspace package manifest drift detected:");
  for (const problem of problems) {
    console.error(
      `- ${problem.packageName} imports '${problem.dependencyName}' in ${problem.file} but does not declare it in ${problem.requiredSection}`
    );
  }
  process.exit(1);
}

console.log("Workspace package manifest declarations match imported external dependencies.");

function walkPackageFiles(directoryPath) {
  const files = [];
  const pending = [directoryPath];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) {
      continue;
    }

    for (const entry of readdirSync(current)) {
      if (entry === "dist" || entry === "node_modules" || entry === "coverage" || entry === "artifacts") {
        continue;
      }

      const absolutePath = path.join(current, entry);
      const stats = statSync(absolutePath);
      if (stats.isDirectory()) {
        pending.push(absolutePath);
        continue;
      }

      if (!absolutePath.match(/\.(?:[cm]?ts|tsx|[cm]?js|jsx|mjs)$/)) {
        continue;
      }

      files.push(absolutePath);
    }
  }

  return files;
}

function collectImportSpecifiers(contents) {
  const processed = ts.preProcessFile(contents, true, true);
  return [
    ...processed.importedFiles.map((entry) => entry.fileName),
    ...processed.referencedFiles.map((entry) => entry.fileName)
  ];
}

function toDependencyName(specifier) {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    builtins.has(specifier) ||
    ignoredSpecifiers.has(specifier) ||
    specifier.startsWith("file:") ||
    specifier.startsWith("data:")
  ) {
    return null;
  }

  if (specifier.startsWith("@")) {
    const [scope, name] = specifier.split("/", 3);
    return scope && name ? `${scope}/${name}` : specifier;
  }

  return specifier.split("/", 1)[0] ?? null;
}
