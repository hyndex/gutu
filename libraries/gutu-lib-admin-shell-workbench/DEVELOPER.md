# Admin Shell Workbench Developer Guide

Admin Shell Workbench reusable library exports.

**Maturity Tier:** `Hardened`

## Purpose And Architecture Role

Provides the shared workbench primitives that host apps use to mount consistent operator workspaces and admin navigation.

### This library is the right fit when

- You need **workspace shell**, **admin navigation**, **operator workbench** as a reusable, package-level boundary.
- You want to consume typed exports from `@platform/admin-shell-workbench` instead of reaching into app-specific internals.
- You want documentation, verification, and package boundaries to stay aligned in the extracted-repo model.

### This library is intentionally not

- Not a full product shell or admin application by itself.
- Not a replacement for plugin-owned business logic or data lifecycles.

## Repo Map

| Path | Purpose |
| --- | --- |
| `package.json` | Root extracted-repo manifest, workspace wiring, and repo-level script entrypoints. |
| `framework/libraries/admin-shell-workbench` | Nested publishable library package. |
| `framework/libraries/admin-shell-workbench/src` | Public runtime source and exported modules. |
| `framework/libraries/admin-shell-workbench/tests` | Unit and contract verification where present. |

## Package Contract

| Field | Value |
| --- | --- |
| Package ID | `admin-shell-workbench` |
| Display Name | Admin Shell Workbench |
| Import Name | `@platform/admin-shell-workbench` |
| Version | `0.1.0` |
| UI Surface | React UI + typed helpers |
| Consumption Model | Imports + typed UI primitives |

## Dependency Graph And Compatibility

| Field | Value |
| --- | --- |
| Direct Dependencies | `@platform/admin-builders`, `@platform/admin-contracts`, `@platform/admin-formview`, `@platform/admin-listview`, `@platform/admin-reporting`, `@platform/admin-widgets`, `@platform/chart`, `@platform/command-palette`, `@platform/router`, `@platform/telemetry-ui`, `@platform/ui`, `@platform/ui-kit`, `@platform/ui-router`, `@platform/ui-shell`, `react` |
| Peer Dependencies | None |
| Dev Dependencies | None |
| React Runtime | Yes |
| Workspace Scoped | Yes |

### Dependency interpretation

- Direct dependencies describe what the library needs at runtime to satisfy its public exports.
- Workspace-scoped dependencies mean extracted repos should be consumed through a compatible Gutu workspace or vendor-synced environment.
- Peer dependencies should be satisfied by the host when the library is integrated outside the certification workspace.

## Public API Surface

| Module | File | Named Exports |
| --- | --- | --- |
| `./main` | `src/main.tsx` | `packageId`, `packageDisplayName`, `packageDescription`, `createMemoryAdminPreferenceStore`, `createFileAdminPreferenceStore`, `composeAdminRegistry`, `filterAdminRegistryForPermissions`, `resolveAdminDeskRoute` |

### Source module map

| Source File | Exported Symbols |
| --- | --- |
| `index.ts` | No exports detected |
| `main.tsx` | `packageId`, `packageDisplayName`, `packageDescription`, `createMemoryAdminPreferenceStore`, `createFileAdminPreferenceStore`, `composeAdminRegistry`, `filterAdminRegistryForPermissions`, `resolveAdminDeskRoute` |

## React, UI, And Extensibility Notes

- UI surface: **React UI + typed helpers**
- Consumption model: **Imports + typed UI primitives**
- Extensibility points: explicit imports, props, callbacks, registries, providers, and typed helper APIs.
- This repo must **not** be documented as exposing a generic WordPress-style hook bus unless such a hook surface is explicitly exported through the public entrypoint.

## Failure Modes And Recovery

- Version drift between extracted repos can surface as missing `workspace:*` dependency resolution. Use a compatible Gutu workspace or vendor lock when integrating.
- Hosts should import from `@platform/admin-shell-workbench`, not deep internal file paths, so refactors inside `src/` do not become accidental breaking changes.
- React-facing hosts should mount providers, registries, and callback surfaces exactly as documented by the public exports instead of depending on internal implementation details.
- When a host needs orchestration, keep it in the surrounding application or plugin runtime; this library does not promise hidden side effects outside what its public API exports.

## Mermaid Flows

### Primary Consumption Flow

```mermaid
graph TD
  host["Host app or plugin"] --> import["Import from @platform/admin-shell-workbench"]
  import --> api["Public modules and named exports"]
  api --> compose["Compose react ui + typed helpers"]
  compose --> verify["Verify with build, test, and docs checks"]
```

## Integration Recipes

### 1. Package identity

```ts
import { packageId, packageDisplayName, createMemoryAdminPreferenceStore } from "@platform/admin-shell-workbench";

console.log(packageId, packageDisplayName);
console.log(typeof createMemoryAdminPreferenceStore);
```

### 2. Safe consumption pattern

- Import from the package entrypoint, not `src/` internals.
- Compose through documented modules such as `./main`.
- Let host applications own orchestration, persistence, and cross-package business logic unless this library explicitly exports those concerns.

### 3. Cross-package composition

- Pair this library with sibling packages through typed imports and documented contracts, not hidden globals.
- If a plugin or app depends on this library, keep compatibility pinned through the workspace lock/vendor flow.
- Treat this library as a reusable foundation layer, not as a substitute for domain ownership.

## Test Matrix

| Lane | Present | Evidence |
| --- | --- | --- |
| Build | Yes | `bun run build` |
| Typecheck | Yes | `bun run typecheck` |
| Lint | Yes | `bun run lint` |
| Test | Yes | `bun run test` |
| Unit | Yes | 1 file(s) |
| Contracts | No | No contract files found |
| Integration | No | No integration files found |
| Migrations | No | No migration files found |

### Verification commands

- `bun run build`
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run docs:check`
- `bun run test:unit`

## Current Truth And Recommended Next

### Current truth

- Publishes 1 public module from `@platform/admin-shell-workbench`: `./main`.
- Exports 26 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `createMemoryAdminPreferenceStore`, `createFileAdminPreferenceStore`, `composeAdminRegistry`, and more.
- Uses a React-aware surface model: React UI + typed helpers.
- Verification lanes present: Build+Typecheck+Lint+Test.

### Current gaps

- Broad public API surface still relies on unit coverage only; there is no separate contract lane yet.
- Standalone consumers still need a compatible Gutu workspace to resolve workspace-scoped dependencies honestly.
- React-facing behavior is covered lightly; the repo does not yet ship deeper interaction or visual verification lanes.

### Recommended next

- Deepen contract coverage around the most reused admin composition paths.
- Add stronger ergonomic guidance where multiple first-party plugins compose the same admin primitives.
- Add contract-focused tests around the most reused public modules and exported helpers.
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

### Later / optional

- Reference themes, presets, and richer visual regression checks once the API shape settles.
