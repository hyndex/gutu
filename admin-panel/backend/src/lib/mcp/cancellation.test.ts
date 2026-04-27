import { describe, test, expect, beforeEach } from "bun:test";
import { track, untrack, cancel, _resetCancellation_forTest } from "./cancellation";

describe("cancellation", () => {
  beforeEach(() => _resetCancellation_forTest());

  test("track returns an AbortController whose signal is unaborted", () => {
    const ctrl = track("req-1");
    expect(ctrl.signal.aborted).toBe(false);
  });

  test("cancel aborts the signal", () => {
    const ctrl = track("req-2");
    expect(cancel("req-2", "user pressed Esc")).toBe(true);
    expect(ctrl.signal.aborted).toBe(true);
  });

  test("cancel returns false for unknown requests", () => {
    expect(cancel("nope", "x")).toBe(false);
  });

  test("untrack drops the controller", () => {
    track("req-3");
    untrack("req-3");
    expect(cancel("req-3", "x")).toBe(false);
  });

  test("cancel auto-untracks (subsequent cancel is a no-op)", () => {
    track("req-4");
    expect(cancel("req-4", "first")).toBe(true);
    expect(cancel("req-4", "second")).toBe(false);
  });
});
