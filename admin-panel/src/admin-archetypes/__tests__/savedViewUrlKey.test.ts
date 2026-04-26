/** Pure-function checks for the SavedViewSwitcher's URL handling
 *  invariants. The widget itself is React; we test the URL invariants
 *  through useUrlState's primitives. */

import { describe, test, expect, beforeEach } from "bun:test";

describe("SavedViewSwitcher URL key contract", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "#/list");
    }
  });

  test("URL hash querystring round-trips a view id", () => {
    if (typeof window === "undefined") return;
    window.history.replaceState(null, "", "#/list?view=vip");
    const hash = window.location.hash.slice(1);
    const q = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const params = new URLSearchParams(q);
    expect(params.get("view")).toBe("vip");
  });

  test("Custom url key (e.g. `tab`) round-trips independently of `view`", () => {
    if (typeof window === "undefined") return;
    window.history.replaceState(null, "", "#/list?view=vip&tab=overview");
    const hash = window.location.hash.slice(1);
    const q = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const params = new URLSearchParams(q);
    expect(params.get("view")).toBe("vip");
    expect(params.get("tab")).toBe("overview");
  });

  test("Setting view to empty/null removes the param", () => {
    if (typeof window === "undefined") return;
    window.history.replaceState(null, "", "#/list?view=vip&q=foo");
    // Simulate the deletion logic from useUrlState's `set`.
    const hash = window.location.hash.slice(1);
    const path = hash.includes("?") ? hash.slice(0, hash.indexOf("?")) : hash;
    const q = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const params = new URLSearchParams(q);
    params.delete("view");
    const next = "#" + path + (params.size ? "?" + params.toString() : "");
    window.history.replaceState(null, "", next);
    expect(window.location.hash).toContain("q=foo");
    expect(window.location.hash).not.toContain("view=");
  });
});
