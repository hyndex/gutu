import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

import {
  createFirstPartyRepoReference,
  defineCompatibilityChannel,
  resolveVendoredPackages,
  validateGutuLockfile,
  validateGutuOverrides,
  type EcosystemCatalogEntry
} from "../../src";

describe("ecosystem contracts", () => {
  it("derives canonical gutula repo names for first-party libraries and plugins", () => {
    expect(createFirstPartyRepoReference({ kind: "library", id: "communication" })).toEqual({
      owner: "gutula",
      name: "gutu-lib-communication",
      url: "https://github.com/gutula/gutu-lib-communication"
    });

    expect(createFirstPartyRepoReference({ kind: "plugin", id: "notifications-core" })).toEqual({
      owner: "gutula",
      name: "gutu-plugin-notifications-core",
      url: "https://github.com/gutula/gutu-plugin-notifications-core"
    });
  });

  it("validates lockfiles and local override files", () => {
    expect(
      validateGutuLockfile({
        formatVersion: 1,
        compatibilityChannel: "stable",
        requests: {
          libraries: ["communication"],
          plugins: ["notifications-core"]
        },
        framework: {
          repo: {
            owner: "gutula",
            name: "gutu-core",
            url: "https://github.com/gutula/gutu-core"
          },
          version: "0.1.0",
          vendorPath: "vendor/framework/gutu"
        },
        resolved: {
          libraries: [],
          plugins: []
        }
      }).success
    ).toBe(true);

    expect(
      validateGutuOverrides({
        formatVersion: 1,
        packages: {
          communication: {
            path: "/tmp/gutu-lib-communication"
          }
        }
      }).success
    ).toBe(true);
  });

  it("resolves vendored package plans with transitive dependencies and local overrides", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "gutu-ecosystem-"));
    const adminContractsPath = join(tempRoot, "admin-contracts");
    const authCorePath = join(tempRoot, "auth-core");
    const notificationsPath = join(tempRoot, "notifications-core");
    const overridePath = join(tempRoot, "notifications-core-override");
    for (const directory of [adminContractsPath, authCorePath, notificationsPath, overridePath]) {
      mkdirSync(join(directory, "src"), { recursive: true });
      writeFileSync(join(directory, "package.json"), JSON.stringify({ name: directory }, null, 2));
    }

    const catalog: EcosystemCatalogEntry[] = [
      {
        id: "admin-contracts",
        kind: "library",
        packageName: "@platform/admin-contracts",
        version: "0.1.0",
        repo: createFirstPartyRepoReference({ kind: "library", id: "admin-contracts" }),
        sourcePath: adminContractsPath,
        vendorPath: "vendor/libraries/admin-contracts",
        dependencies: {
          core: ["kernel"],
          libraries: [],
          plugins: []
        },
        channels: ["stable"],
        tier: "official-first-party"
      },
      {
        id: "auth-core",
        kind: "plugin",
        packageName: "@plugins/auth-core",
        version: "0.1.0",
        repo: createFirstPartyRepoReference({ kind: "plugin", id: "auth-core" }),
        sourcePath: authCorePath,
        vendorPath: "vendor/plugins/auth-core",
        dependencies: {
          core: ["kernel"],
          libraries: ["admin-contracts"],
          plugins: []
        },
        channels: ["stable"],
        tier: "official-first-party"
      },
      {
        id: "notifications-core",
        kind: "plugin",
        packageName: "@plugins/notifications-core",
        version: "0.1.0",
        repo: createFirstPartyRepoReference({ kind: "plugin", id: "notifications-core" }),
        sourcePath: notificationsPath,
        vendorPath: "vendor/plugins/notifications-core",
        dependencies: {
          core: ["kernel"],
          libraries: ["admin-contracts"],
          plugins: ["auth-core"]
        },
        channels: ["stable"],
        tier: "official-first-party"
      }
    ];

    const channel = defineCompatibilityChannel({
      id: "stable",
      label: "Stable",
      frameworkVersion: "^0.1.0",
      packages: ["admin-contracts", "auth-core", "notifications-core"]
    });

    const plan = resolveVendoredPackages({
      catalog,
      compatibilityChannel: channel,
      requests: {
        libraries: [],
        plugins: ["notifications-core"]
      },
      overrides: {
        "notifications-core": {
          path: overridePath
        }
      }
    });

    expect(plan.libraries.map((entry) => entry.id)).toEqual(["admin-contracts"]);
    expect(plan.plugins.map((entry) => entry.id)).toEqual(["auth-core", "notifications-core"]);
    expect(plan.plugins.find((entry) => entry.id === "notifications-core")?.sourcePath).toBe(overridePath);
  });

  it("resolves relative catalog source paths against the catalog root instead of the workspace root", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "gutu-ecosystem-relative-"));
    const packageRoot = join(tempRoot, "framework", "libraries", "communication");
    mkdirSync(join(packageRoot, "src"), { recursive: true });
    writeFileSync(
      join(packageRoot, "package.json"),
      JSON.stringify({ name: "@platform/communication", version: "0.1.0", type: "module" }, null, 2)
    );

    const catalog: EcosystemCatalogEntry[] = [
      {
        id: "communication",
        kind: "library",
        packageName: "@platform/communication",
        version: "0.1.0",
        repo: createFirstPartyRepoReference({ kind: "library", id: "communication" }),
        sourcePath: "framework/libraries/communication",
        vendorPath: "vendor/libraries/communication",
        dependencies: {
          core: [],
          libraries: [],
          plugins: []
        },
        channels: ["stable"],
        tier: "official-first-party"
      }
    ];

    const channel = defineCompatibilityChannel({
      id: "stable",
      label: "Stable",
      frameworkVersion: "^0.1.0",
      packages: ["communication"]
    });

    const plan = resolveVendoredPackages({
      catalog,
      catalogRoot: tempRoot,
      compatibilityChannel: channel,
      requests: {
        libraries: ["communication"],
        plugins: []
      }
    });

    expect(plan.libraries).toHaveLength(1);
    expect(plan.libraries[0]?.sourcePath).toBe(packageRoot);
  });
});
