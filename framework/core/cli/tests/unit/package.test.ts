import { lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PassThrough } from "node:stream";

import { describe, expect, it } from "bun:test";

import { runCli, scaffoldAiPack } from "../../src/index";
import { resolveDefaultFrameworkMode } from "../../src/project";

const repoRoot = resolve(import.meta.dir, "../../../../../");

function createMemoryIo(cwd = process.cwd()) {
  let stdout = "";
  let stderr = "";
  return {
    cwd,
    env: process.env,
    stdin: process.stdin,
    stdout: {
      write(chunk: string) {
        stdout += chunk;
      }
    },
    stderr: {
      write(chunk: string) {
        stderr += chunk;
      }
    },
    readStdout() {
      return stdout;
    },
    readStderr() {
      return stderr;
    }
  };
}

describe("platform cli", () => {
  it("runs an AI agent command and prints JSON", async () => {
    const io = createMemoryIo();
    const exitCode = await runCli(["agent", "run", "--goal", "Summarize open escalations with grounded next steps."], io);

    expect(exitCode).toBe(0);
    expect(io.readStdout()).toContain("\"runId\"");
  });

  it("diffs prompt bodies", async () => {
    const io = createMemoryIo();
    const exitCode = await runCli(
      [
        "prompt",
        "diff",
        "--left",
        "prompt-version:ops-triage:v3",
        "--right",
        "prompt-version:ops-triage:v4"
      ],
      io
    );

    expect(exitCode).toBe(0);
    expect(io.readStdout()).toContain("\"added\"");
  });

  it("inspects MCP descriptors", async () => {
    const io = createMemoryIo();
    const exitCode = await runCli(["mcp", "inspect", "--tool", "ai.memory.retrieve"], io);

    expect(exitCode).toBe(0);
    expect(io.readStdout()).toContain("\"ai.memory.retrieve\"");
  });

  it("serves MCP over stdio until the client closes stdin", async () => {
    const stateDir = mkdtempSync(join(tmpdir(), "gutu-mcp-state-"));
    const stdin = new PassThrough();
    let stdout = "";
    let stderr = "";
    const io = {
      cwd: repoRoot,
      env: {
        ...process.env,
        GUTU_STATE_DIR: stateDir
      },
      stdin,
      stdout: {
        write(chunk: string) {
          stdout += chunk;
        }
      },
      stderr: {
        write(chunk: string) {
          stderr += chunk;
        }
      }
    };

    const servePromise = runCli(["mcp", "serve"], io);
    stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: {
            name: "unit-test",
            version: "1.0.0"
          }
        }
      })}\n`
    );
    stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
    stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })}\n`);
    stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 3, method: "prompts/list" })}\n`);
    stdin.end();

    const exitCode = await servePromise;
    const messages = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(exitCode).toBe(0);
    expect(messages[0]?.result).toBeTruthy();
    expect(JSON.stringify(messages[0]?.result)).toContain("2025-03-26");
    expect(JSON.stringify(messages[1]?.result)).toContain("ai.memory.retrieve");
    expect(JSON.stringify(messages[2]?.result)).toContain("prompt-version:ops-triage:v4");
    expect(stderr).toBe("");

    rmSync(stateDir, { recursive: true, force: true });
  });

  it("scaffolds a new ai-pack", () => {
    const cwd = mkdtempSync(join(tmpdir(), "platform-cli-"));
    const target = scaffoldAiPack(cwd, "assistant-pack");

    expect(readFileSync(join(target, "package.ts"), "utf8")).toContain('id: "assistant-pack"');
    expect(readFileSync(join(target, "package.json"), "utf8")).toContain('"name": "@plugins/assistant-pack"');
    expect(readFileSync(join(target, "docs", "AGENT_CONTEXT.md"), "utf8")).toContain("Assistant Pack");
  });

  it("chooses a safe default framework mode by platform", () => {
    expect(resolveDefaultFrameworkMode("win32")).toBe("copy");
    expect(resolveDefaultFrameworkMode("linux")).toBe("symlink");
  });

  it("initializes a clean Gutu project workspace", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "gutu-workspace-init-"));
    const target = join(cwd, "sample-product");
    const io = createMemoryIo(repoRoot);

    const exitCode = await runCli(["init", target, "--framework-mode", "symlink"], io);

    expect(exitCode).toBe(0);
    expect(readFileSync(join(target, "package.json"), "utf8")).toContain('"name": "@workspace/sample-product"');
    expect(readFileSync(join(target, "package.json"), "utf8")).toContain('"gutu": "bun run vendor/framework/gutu/framework/core/cli/src/bin.ts"');
    expect(readFileSync(join(target, "package.json"), "utf8")).not.toContain('vendor/framework/gutu/framework/libraries/*');
    expect(readFileSync(join(target, "package.json"), "utf8")).not.toContain('vendor/framework/gutu/framework/builtin-plugins/*');
    expect(readFileSync(join(target, "plugins", "sample-product-core", "package.ts"), "utf8")).toContain('id: "sample-product-core"');
    expect(readFileSync(join(target, "plugins", "sample-product-core", "docs", "AGENT_CONTEXT.md"), "utf8")).toContain(
      "Sample Product Core"
    );
    expect(readFileSync(join(target, "apps", "sample-product-studio", "package.json"), "utf8")).toContain('"name": "@apps/sample-product-studio"');
    expect(readFileSync(join(target, "apps", "sample-product-studio", "docs", "AGENT_CONTEXT.md"), "utf8")).toContain(
      "Sample Product Studio"
    );
    expect(readFileSync(join(target, "gutu.project.json"), "utf8")).toContain('"name": "sample-product"');
    expect(readFileSync(join(target, "gutu.lock.json"), "utf8")).toContain('"compatibilityChannel": "stable"');
    expect(readFileSync(join(target, "gutu.overrides.json"), "utf8")).toContain('"formatVersion": 1');
    expect(lstatSync(join(target, "vendor", "framework", "gutu", "framework", "core")).isSymbolicLink()).toBe(true);
    expect(readFileSync(join(target, "vendor", "plugins", "auth-core", "package.json"), "utf8")).toContain('"name": "@plugins/auth-core"');
    expect(readFileSync(join(target, "vendor", "libraries", "admin-contracts", "package.json"), "utf8")).toContain('"name": "@platform/admin-contracts"');
    expect(io.readStdout()).toContain('"starterPluginId": "sample-product-core"');
  });

  it("adds vendored ecosystem packages, supports local overrides, and validates workspace health", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "gutu-ecosystem-workspace-"));
    const target = join(cwd, "sample-product");
    const initIo = createMemoryIo(repoRoot);

    expect(await runCli(["init", target, "--framework-mode", "copy"], initIo)).toBe(0);

    const addIo = createMemoryIo(target);
    expect(await runCli(["add", "library", "communication"], addIo)).toBe(0);
    expect(readFileSync(join(target, "vendor", "libraries", "communication", "package.json"), "utf8")).toContain(
      '"name": "@platform/communication"'
    );
    expect(readFileSync(join(target, "gutu.lock.json"), "utf8")).toContain('"communication"');

    const overrideSource = join(cwd, "gutu-lib-communication");
    mkdirSync(join(overrideSource, "src"), { recursive: true });
    writeFileSync(
      join(overrideSource, "package.json"),
      JSON.stringify({ name: "@platform/communication", version: "9.9.9", type: "module" }, null, 2)
    );
    writeFileSync(join(overrideSource, "src", "index.ts"), 'export const override = "communication";\n');

    const overrideIo = createMemoryIo(target);
    expect(
      await runCli(["override", "add", "--package", "communication", "--path", overrideSource], overrideIo)
    ).toBe(0);
    expect(readFileSync(join(target, "gutu.overrides.json"), "utf8")).toContain(overrideSource);

    const syncIo = createMemoryIo(target);
    expect(await runCli(["vendor", "sync"], syncIo)).toBe(0);
    expect(readFileSync(join(target, "vendor", "libraries", "communication", "src", "index.ts"), "utf8")).toContain(
      'override = "communication"'
    );

    const doctorIo = createMemoryIo(target);
    expect(await runCli(["ecosystem", "doctor"], doctorIo)).toBe(0);
    expect(doctorIo.readStdout()).toContain('"ok": true');

    const removeOverrideIo = createMemoryIo(target);
    expect(await runCli(["override", "remove", "--package", "communication"], removeOverrideIo)).toBe(0);
    expect(readFileSync(join(target, "gutu.overrides.json"), "utf8")).not.toContain(overrideSource);
  });

  it("exports ecosystem catalogs and scaffolds standalone repo snapshots", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "gutu-ecosystem-export-"));
    const catalogsDir = join(cwd, "catalogs");
    const repoDir = join(cwd, "repo");

    const catalogIo = createMemoryIo(repoRoot);
    expect(await runCli(["ecosystem", "export-catalogs", "--out", catalogsDir], catalogIo)).toBe(0);
    expect(readFileSync(join(catalogsDir, "gutu-libraries", "README.md"), "utf8")).toContain("Gutu Libraries");
    expect(readFileSync(join(catalogsDir, "gutu-plugins", "catalog.json"), "utf8")).toContain("notifications-core");

    const repoIo = createMemoryIo(repoRoot);
    expect(
      await runCli(["ecosystem", "scaffold-repo", "--package", "notifications-core", "--out", repoDir], repoIo)
    ).toBe(0);
    expect(readFileSync(join(repoDir, "package.json"), "utf8")).toContain('"name": "@plugins/notifications-core"');
    expect(readFileSync(join(repoDir, ".github", "workflows", "ci.yml"), "utf8")).toContain("bun run test");
    expect(readFileSync(join(repoDir, ".github", "workflows", "release.yml"), "utf8")).toContain("workflow_dispatch");
    expect(readFileSync(join(repoDir, ".github", "dependabot.yml"), "utf8")).toContain("package-ecosystem: npm");
    expect(readFileSync(join(repoDir, "README.md"), "utf8")).toContain("Notifications Core");
  });

  it("indexes and validates understanding docs for a known target", async () => {
    const io = createMemoryIo(repoRoot);
    const cwd = mkdtempSync(join(tmpdir(), "platform-cli-index-"));
    const indexPath = join(cwd, "understanding.json");
    const target = "framework/core/agent-understanding";

    const scaffoldIo = createMemoryIo(repoRoot);
    const scaffoldExitCode = await runCli(["docs", "scaffold", "--target", target], scaffoldIo);

    expect(scaffoldExitCode).toBe(0);

    const indexExitCode = await runCli(["docs", "index", "--target", target, "--out", indexPath], io);

    expect(indexExitCode).toBe(0);
    expect(readFileSync(indexPath, "utf8")).toContain("\"agent-understanding\"");

    const validateIo = createMemoryIo(repoRoot);
    const validateExitCode = await runCli(["docs", "validate", "--target", target], validateIo);

    expect(validateExitCode).toBe(0);
    expect(validateIo.readStdout()).toContain("\"ok\": true");
  });
});
