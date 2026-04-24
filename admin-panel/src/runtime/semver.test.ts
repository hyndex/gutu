import { describe, test, expect } from "bun:test";
import { parseVersion, compareVersions, satisfies } from "./semver";

describe("parseVersion", () => {
  test("parses X.Y.Z", () => {
    expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3, pre: undefined });
  });
  test("strips leading v", () => {
    expect(parseVersion("v0.1.0")).toEqual({ major: 0, minor: 1, patch: 0, pre: undefined });
  });
  test("parses prerelease", () => {
    expect(parseVersion("1.0.0-rc.1")).toEqual({ major: 1, minor: 0, patch: 0, pre: "rc.1" });
  });
  test("rejects garbage", () => {
    expect(parseVersion("not-a-version")).toBeNull();
    expect(parseVersion("1")).toBeNull();
    expect(parseVersion("1.2")).toBeNull();
  });
});

describe("compareVersions", () => {
  test("orders by major then minor then patch", () => {
    expect(compareVersions(parseVersion("1.0.0")!, parseVersion("2.0.0")!)).toBeLessThan(0);
    expect(compareVersions(parseVersion("1.2.0")!, parseVersion("1.1.0")!)).toBeGreaterThan(0);
    expect(compareVersions(parseVersion("1.0.1")!, parseVersion("1.0.0")!)).toBeGreaterThan(0);
    expect(compareVersions(parseVersion("1.0.0")!, parseVersion("1.0.0")!)).toBe(0);
  });
  test("prerelease sorts before release", () => {
    expect(compareVersions(parseVersion("1.0.0-rc.1")!, parseVersion("1.0.0")!)).toBeLessThan(0);
  });
});

describe("satisfies", () => {
  test("wildcards match anything", () => {
    expect(satisfies("1.2.3", "*")).toBe(true);
    expect(satisfies("99.0.0", "x")).toBe(true);
    expect(satisfies("0.0.1", "")).toBe(true);
  });

  test("caret respects major boundary", () => {
    expect(satisfies("1.2.3", "^1.0.0")).toBe(true);
    expect(satisfies("1.9.9", "^1.0.0")).toBe(true);
    expect(satisfies("2.0.0", "^1.0.0")).toBe(false);
    expect(satisfies("0.9.9", "^1.0.0")).toBe(false);
  });

  test("caret on 0.x locks minor", () => {
    expect(satisfies("0.1.5", "^0.1.0")).toBe(true);
    expect(satisfies("0.2.0", "^0.1.0")).toBe(false);
  });

  test("caret on 0.0.x locks patch", () => {
    expect(satisfies("0.0.5", "^0.0.5")).toBe(true);
    expect(satisfies("0.0.6", "^0.0.5")).toBe(false);
  });

  test("tilde respects minor boundary", () => {
    expect(satisfies("1.2.5", "~1.2.0")).toBe(true);
    expect(satisfies("1.3.0", "~1.2.0")).toBe(false);
  });

  test("comparators", () => {
    expect(satisfies("2.0.0", ">=1.0.0")).toBe(true);
    expect(satisfies("1.0.0", ">=1.0.0")).toBe(true);
    expect(satisfies("0.9.9", ">=1.0.0")).toBe(false);
    expect(satisfies("1.5.0", ">=1.0.0 <2.0.0")).toBe(true);
    expect(satisfies("2.0.0", ">=1.0.0 <2.0.0")).toBe(false);
  });

  test("OR-split alternatives", () => {
    expect(satisfies("1.5.0", "^1.0.0 || ^2.0.0")).toBe(true);
    expect(satisfies("2.5.0", "^1.0.0 || ^2.0.0")).toBe(true);
    expect(satisfies("3.0.0", "^1.0.0 || ^2.0.0")).toBe(false);
  });

  test("invalid version never satisfies", () => {
    expect(satisfies("garbage", "^1.0.0")).toBe(false);
  });
});
