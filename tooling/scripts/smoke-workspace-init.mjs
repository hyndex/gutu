import { existsSync, lstatSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { BUN_BIN, rootDir } from "./workspace-utils.mjs";

const frameworkMode = readFlag(process.argv.slice(2), "--framework-mode", process.platform === "win32" ? "copy" : "symlink");
const tempRoot = mkdtempSync(path.join(tmpdir(), `gutu-init-${frameworkMode}-`));
const workspacePath = path.join(tempRoot, "workspace");

const result = spawnSync(
  BUN_BIN,
  ["run", "gutu", "--", "init", workspacePath, "--framework-mode", frameworkMode],
  {
    cwd: rootDir,
    encoding: "utf8",
    env: { ...process.env, BUN_BIN }
  }
);

if (result.status !== 0) {
  console.error(result.stdout);
  console.error(result.stderr);
  process.exit(result.status ?? 1);
}

const packageJsonPath = path.join(workspacePath, "package.json");
const frameworkPath = path.join(workspacePath, "vendor", "framework", "gutu", "framework");

if (!existsSync(packageJsonPath) || !existsSync(frameworkPath)) {
  console.error("Workspace init smoke failed: expected package.json and vendored framework output.");
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const frameworkIsSymlink = lstatSync(frameworkPath).isSymbolicLink();

if (frameworkMode === "symlink" && !frameworkIsSymlink) {
  console.error("Workspace init smoke failed: expected symlink vendoring.");
  process.exit(1);
}

if (frameworkMode === "copy" && frameworkIsSymlink) {
  console.error("Workspace init smoke failed: expected copy vendoring.");
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      frameworkMode,
      workspacePath,
      packageName: packageJson.name,
      frameworkIsSymlink
    },
    null,
    2
  )
);

function readFlag(args, flag, fallback) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return fallback;
  }
  return args[index + 1] ?? fallback;
}
