import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

export function resolveStateDirectory(): string {
  return path.resolve(process.env.GUTU_STATE_DIR ?? path.join(process.cwd(), ".gutu", "state"));
}

export function resolveStateFile(fileName: string): string {
  return path.join(resolveStateDirectory(), fileName);
}

export function loadJsonState<TState>(fileName: string, seedFactory: () => TState): TState {
  const filePath = resolveStateFile(fileName);
  if (!existsSync(filePath)) {
    const seededState = seedFactory();
    saveJsonState(fileName, seededState);
    return structuredClone(seededState);
  }

  return JSON.parse(readFileSync(filePath, "utf8")) as TState;
}

export function saveJsonState<TState>(fileName: string, state: TState): void {
  const filePath = resolveStateFile(fileName);
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  renameSync(tempPath, filePath);
}

export function updateJsonState<TState>(
  fileName: string,
  seedFactory: () => TState,
  updater: (current: TState) => TState
): TState {
  const current = loadJsonState(fileName, seedFactory);
  const next = updater(structuredClone(current));
  saveJsonState(fileName, next);
  return structuredClone(next);
}
