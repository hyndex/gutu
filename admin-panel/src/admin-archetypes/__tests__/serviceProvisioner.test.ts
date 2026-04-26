/** Contract tests for the ServiceProvisioner adapter. The default
 *  noop must not crash, and `createExternalProvisioner` must return
 *  the correct handle for known kinds + an "unknown" handle otherwise. */

import { describe, test, expect } from "bun:test";
import {
  createExternalProvisioner,
  type ServiceHandle,
  type ServiceProvisioner,
} from "../cross-plugin/useServiceProvisioner";

describe("createExternalProvisioner", () => {
  test("returns a configured handle for a known kind+tenant", async () => {
    const partial: Omit<ServiceHandle, "spec"> = {
      id: "stalwart-prod",
      url: "https://mail.example.com",
      secrets: { token: "abc" },
      status: "running",
      lastHealthyAt: "2026-04-27T10:00:00.000Z",
    };
    const adapter = createExternalProvisioner(
      new Map([["stalwart-mail:default", partial]]),
    );
    const handle = await adapter.provision({
      kind: "stalwart-mail",
      tenantId: "default",
    });
    expect(handle.id).toBe("stalwart-prod");
    expect(handle.url).toBe("https://mail.example.com");
    expect(handle.status).toBe("running");
    expect(handle.spec.kind).toBe("stalwart-mail");
  });

  test("returns an unconfigured handle for unknown kind", async () => {
    const adapter = createExternalProvisioner(new Map());
    const handle = await adapter.provision({ kind: "yjs-ws", tenantId: "default" });
    expect(handle.url).toBe("");
    expect(handle.status).toBe("unknown");
    expect(handle.error).toBe("service not configured");
  });

  test("list returns every configured handle", async () => {
    const adapter = createExternalProvisioner(
      new Map([
        ["stalwart-mail:default", { id: "a", url: "u1", status: "running" as const }],
        ["yjs-ws:default", { id: "b", url: "u2", status: "starting" as const }],
      ]),
    );
    const handles = await adapter.list();
    expect(handles.length).toBe(2);
    expect(new Set(handles.map((h) => h.id))).toEqual(new Set(["a", "b"]));
  });

  test("destroy forgets the handle", async () => {
    const adapter = createExternalProvisioner(
      new Map([["stalwart-mail:default", { id: "to-destroy", url: "u", status: "running" as const }]]),
    );
    await adapter.destroy("to-destroy");
    expect((await adapter.list()).length).toBe(0);
  });

  test("healthCheck returns the cached handle or throws", async () => {
    const adapter: ServiceProvisioner = createExternalProvisioner(
      new Map([["stalwart-mail:default", { id: "h-1", url: "u", status: "running" as const }]]),
    );
    const h = await adapter.healthCheck("h-1");
    expect(h.id).toBe("h-1");
    await expect(adapter.healthCheck("missing")).rejects.toThrow();
  });
});
