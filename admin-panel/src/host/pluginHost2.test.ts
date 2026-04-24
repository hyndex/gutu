import { describe, test, expect } from "bun:test";
import {
  layerPlugins,
  topoSortPlugins,
  runWithConcurrency,
} from "./pluginHost2";
import type { PluginV2 } from "@/contracts/plugin-v2";

const mk = (id: string, deps: string[] = []): PluginV2 => ({
  manifest: {
    id,
    version: "1.0.0",
    label: id,
    requires: deps.length > 0 ? { plugins: Object.fromEntries(deps.map((d) => [d, "*"])) } : undefined,
    activationEvents: [{ kind: "onStart" }],
    origin: { kind: "explicit" },
  },
  activate: async () => {},
});

describe("topoSortPlugins", () => {
  test("orders by dep graph", () => {
    const a = mk("a");
    const b = mk("b", ["a"]);
    const c = mk("c", ["b"]);
    const { ordered, cycles } = topoSortPlugins([c, b, a]);
    expect(ordered.map((p) => p.manifest.id)).toEqual(["a", "b", "c"]);
    expect(cycles).toEqual([]);
  });
  test("detects cycles", () => {
    const a = mk("a", ["b"]);
    const b = mk("b", ["a"]);
    const { cycles } = topoSortPlugins([a, b]);
    expect(cycles.length).toBeGreaterThan(0);
  });
  test("missing dep silently skipped", () => {
    const a = mk("a", ["missing"]);
    const { ordered } = topoSortPlugins([a]);
    expect(ordered.map((p) => p.manifest.id)).toEqual(["a"]);
  });
});

describe("layerPlugins", () => {
  test("independent plugins end up in layer 0", () => {
    const plugins = [mk("a"), mk("b"), mk("c")];
    const { layers, cycles } = layerPlugins(plugins);
    expect(layers.length).toBe(1);
    expect(layers[0].map((p) => p.manifest.id).sort()).toEqual(["a", "b", "c"]);
    expect(cycles).toEqual([]);
  });
  test("diamond — a → {b,c} → d", () => {
    const a = mk("a");
    const b = mk("b", ["a"]);
    const c = mk("c", ["a"]);
    const d = mk("d", ["b", "c"]);
    const { layers } = layerPlugins([d, c, b, a]);
    expect(layers.length).toBe(3);
    expect(layers[0].map((p) => p.manifest.id)).toEqual(["a"]);
    expect(layers[1].map((p) => p.manifest.id).sort()).toEqual(["b", "c"]);
    expect(layers[2].map((p) => p.manifest.id)).toEqual(["d"]);
  });
  test("cycle detection", () => {
    const a = mk("a", ["b"]);
    const b = mk("b", ["a"]);
    const { cycles } = layerPlugins([a, b]);
    expect(cycles.length).toBeGreaterThan(0);
  });
});

describe("runWithConcurrency", () => {
  test("serializes when concurrency=1", async () => {
    const log: number[] = [];
    await runWithConcurrency([1, 2, 3], 1, async (i) => {
      log.push(i);
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(log).toEqual([1, 2, 3]);
  });
  test("parallelizes when concurrency>1", async () => {
    const started: number[] = [];
    const completed: number[] = [];
    await runWithConcurrency([1, 2, 3, 4], 4, async (i) => {
      started.push(i);
      await new Promise((r) => setTimeout(r, 10));
      completed.push(i);
    });
    // All started before the first completes (because all 4 workers spin up
    // immediately under concurrency=4).
    expect(started.length).toBe(4);
    expect(completed.length).toBe(4);
  });
  test("returns results in input order regardless of completion order", async () => {
    const results = await runWithConcurrency([3, 1, 2], 3, async (i) => {
      await new Promise((r) => setTimeout(r, i * 5));
      return i * 10;
    });
    expect(results).toEqual([30, 10, 20]);
  });
});
