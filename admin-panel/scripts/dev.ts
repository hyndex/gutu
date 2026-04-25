/** Starts backend (bun) + frontend (vite) in one process, forwarding stdout
 *  with prefixes. Shuts both down cleanly on SIGINT. */
import { spawn } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");

function start(
  name: string,
  cmd: string,
  args: string[],
  cwd: string,
  color: string,
) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, FORCE_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const tag = `\x1b[${color}m[${name}]\x1b[0m`;
  const pipe = (stream: NodeJS.ReadableStream, out: NodeJS.WriteStream) => {
    stream.on("data", (buf: Buffer) => {
      const lines = buf.toString().split(/\r?\n/);
      for (const line of lines) if (line) out.write(`${tag} ${line}\n`);
    });
  };
  pipe(child.stdout!, process.stdout);
  pipe(child.stderr!, process.stderr);
  child.on("exit", (code, signal) => {
    console.log(`${tag} exited (code=${code} signal=${signal})`);
    if (signal !== "SIGTERM") process.exit(code ?? 1);
  });
  return child;
}

// Use the plain `start` script (no `--hot`) instead of `dev` because
// bun's hot mode auto-spawns a watcher daemon that respawns on file
// changes — convenient for normal dev, but it conflicts with the
// Claude_Preview launcher which requires a single deterministic
// process. Set DEV_BACKEND_HOT=1 to opt back in for local interactive
// dev outside the preview tool.
const apiScript = process.env.DEV_BACKEND_HOT === "1" ? "dev" : "start";
const api = start("api", "bun", ["run", apiScript], path.join(root, "backend"), "35");
const ui = start("ui", "bun", ["x", "vite"], root, "36");

function shutdown() {
  api.kill("SIGTERM");
  ui.kill("SIGTERM");
  setTimeout(() => process.exit(0), 300);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
