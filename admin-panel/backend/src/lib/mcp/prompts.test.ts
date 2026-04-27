import { describe, test, expect, beforeEach } from "bun:test";
import {
  getPrompt,
  interpolate,
  listPrompts,
  registerBuiltInPrompts,
  registerPrompt,
  _resetPrompts_forTest,
} from "./prompts";

describe("interpolate", () => {
  test("substitutes {{name}} placeholders", () => {
    expect(interpolate("Hello {{name}}!", { name: "world" })).toBe("Hello world!");
  });
  test("missing args render as empty", () => {
    expect(interpolate("a={{a}}, b={{b}}", { a: "1" })).toBe("a=1, b=");
  });
  test("tolerates whitespace inside braces", () => {
    expect(interpolate("x={{ x }}", { x: "y" })).toBe("x=y");
  });
});

describe("registry", () => {
  beforeEach(() => _resetPrompts_forTest());

  test("register + lookup roundtrip", () => {
    registerPrompt({
      definition: { name: "test", description: "desc" },
      render: () => ({ messages: [{ role: "system", content: { type: "text", text: "ok" } }] }),
    });
    expect(getPrompt("test")?.definition.name).toBe("test");
  });

  test("list returns sorted names", () => {
    registerPrompt({
      definition: { name: "b", description: "" },
      render: () => ({ messages: [] }),
    });
    registerPrompt({
      definition: { name: "a", description: "" },
      render: () => ({ messages: [] }),
    });
    expect(listPrompts().map((p) => p.definition.name)).toEqual(["a", "b"]);
  });
});

describe("built-in packs", () => {
  beforeEach(() => _resetPrompts_forTest());

  test("registerBuiltInPrompts adds the framework's prompts", () => {
    registerBuiltInPrompts();
    const names = listPrompts().map((p) => p.definition.name);
    expect(names).toContain("crm.weekly-summary");
    expect(names).toContain("accounting.month-end-checklist");
    expect(names).toContain("support.triage-ticket");
    expect(names).toContain("ops.incident-response");
  });

  test("required-arg prompts throw when arg missing", () => {
    registerBuiltInPrompts();
    const p = getPrompt("accounting.month-end-checklist")!;
    expect(() => p.render({})).toThrow(/month/);
    const ok = p.render({ month: "2026-04" });
    expect(ok.messages[0]!.content.text).toContain("2026-04");
  });
});
