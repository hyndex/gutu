import { describe, test, expect } from "bun:test";
import { createExtensionRegistries, seedBuiltInRegistries } from "./registries";

describe("Registry<K,V>", () => {
  test("register / get / has / keys / list", () => {
    const r = createExtensionRegistries();
    r.fieldKinds.register("custom", { label: "Custom" });
    expect(r.fieldKinds.has("custom")).toBe(true);
    expect(r.fieldKinds.get("custom")?.label).toBe("Custom");
    expect(r.fieldKinds.keys()).toContain("custom");
    expect(r.fieldKinds.list().map((e) => e.key)).toContain("custom");
  });

  test("register returns a disposer that unregisters", () => {
    const r = createExtensionRegistries();
    const off = r.fieldKinds.register("foo", { label: "Foo" });
    expect(r.fieldKinds.has("foo")).toBe(true);
    off();
    expect(r.fieldKinds.has("foo")).toBe(false);
  });

  test("re-registering the same key shadows and warns", () => {
    const r = createExtensionRegistries();
    const warn = console.warn;
    let warned = false;
    console.warn = () => { warned = true; };
    r.fieldKinds.register("bar", { label: "First" });
    r.fieldKinds.register("bar", { label: "Second" });
    console.warn = warn;
    expect(warned).toBe(true);
    expect(r.fieldKinds.get("bar")?.label).toBe("Second");
  });

  test("contributor attribution via _withContributor", () => {
    const r = createExtensionRegistries();
    r._withContributor("plugin.a", () => {
      r.fieldKinds.register("a-kind", { label: "A" });
    });
    r._withContributor("plugin.b", () => {
      r.fieldKinds.register("b-kind", { label: "B" });
    });
    const entries = r.fieldKinds.list();
    expect(entries.find((e) => e.key === "a-kind")?.contributor).toBe("plugin.a");
    expect(entries.find((e) => e.key === "b-kind")?.contributor).toBe("plugin.b");
  });

  test("onChange fires on register + unregister", () => {
    const r = createExtensionRegistries();
    const events: string[] = [];
    r.fieldKinds.onChange((ev) => events.push(`${ev.kind}:${ev.key}`));
    const off = r.fieldKinds.register("x", { label: "X" });
    off();
    expect(events).toEqual(["register:x", "unregister:x"]);
  });

  test("registerMany registers a batch", () => {
    const r = createExtensionRegistries();
    const off = r.fieldKinds.registerMany({
      a: { label: "A" },
      b: { label: "B" },
    });
    expect(r.fieldKinds.has("a")).toBe(true);
    expect(r.fieldKinds.has("b")).toBe(true);
    off();
    expect(r.fieldKinds.has("a")).toBe(false);
    expect(r.fieldKinds.has("b")).toBe(false);
  });

  test("disposer only unregisters when the contributor still owns the key", () => {
    const r = createExtensionRegistries();
    let dispA!: () => void;
    r._withContributor("plugin.a", () => {
      dispA = r.fieldKinds.register("shared", { label: "A" });
    });
    r._withContributor("plugin.b", () => {
      r.fieldKinds.register("shared", { label: "B" }); // shadows
    });
    dispA(); // shouldn't remove — plugin.b now owns it
    expect(r.fieldKinds.has("shared")).toBe(true);
    expect(r.fieldKinds.get("shared")?.label).toBe("B");
  });
});

describe("seedBuiltInRegistries", () => {
  test("seeds the 15 default field kinds", () => {
    const r = createExtensionRegistries();
    seedBuiltInRegistries(r);
    const keys = r.fieldKinds.keys();
    expect(keys).toContain("text");
    expect(keys).toContain("currency");
    expect(keys).toContain("enum");
    expect(keys.length).toBeGreaterThanOrEqual(15);
  });

  test("attributes built-ins to 'shell'", () => {
    const r = createExtensionRegistries();
    seedBuiltInRegistries(r);
    const textEntry = r.fieldKinds.list().find((e) => e.key === "text");
    expect(textEntry?.contributor).toBe("shell");
  });

  test("seeds csv + json exporters", () => {
    const r = createExtensionRegistries();
    seedBuiltInRegistries(r);
    expect(r.exporters.has("csv")).toBe(true);
    expect(r.exporters.has("json")).toBe(true);
  });
});
