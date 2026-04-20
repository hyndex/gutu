# UI Zone Static Developer Guide

Static React zone adapter.

**Maturity Tier:** `Baseline`

## Purpose And Architecture Role

Provides the static UI zone primitives used by simpler host surfaces that need bounded pluggable composition without a more dynamic runtime.

### This library is the right fit when

- You need **static zones**, **pluggable regions**, **bounded composition** as a reusable, package-level boundary.
- You want to consume typed exports from `@platform/ui-zone-static` instead of reaching into app-specific internals.
- You want documentation, verification, and package boundaries to stay aligned in the extracted-repo model.

### This library is intentionally not

- Not a complete front-end application by itself.
- Not a replacement for app-level state, routing, or domain-specific orchestration.

## Repo Map

| Path | Purpose |
| --- | --- |
| `package.json` | Root extracted-repo manifest, workspace wiring, and repo-level script entrypoints. |
| `framework/libraries/ui-zone-static` | Nested publishable library package. |
| `framework/libraries/ui-zone-static/src` | Public runtime source and exported modules. |
| `framework/libraries/ui-zone-static/tests` | Unit and contract verification where present. |

## Package Contract

| Field | Value |
| --- | --- |
| Package ID | `ui-zone-static` |
| Display Name | UI Zone Static |
| Import Name | `@platform/ui-zone-static` |
| Version | `0.1.0` |
| UI Surface | Headless typed exports |
| Consumption Model | Imports + typed helpers |

## Dependency Graph And Compatibility

| Field | Value |
| --- | --- |
| Direct Dependencies | `@platform/kernel`, `@platform/ui-shell` |
| Peer Dependencies | None |
| Dev Dependencies | None |
| React Runtime | No |
| Workspace Scoped | Yes |

### Dependency interpretation

- Direct dependencies describe what the library needs at runtime to satisfy its public exports.
- Workspace-scoped dependencies mean extracted repos should be consumed through a compatible Gutu workspace or vendor-synced environment.
- Peer dependencies should be satisfied by the host when the library is integrated outside the certification workspace.

## Public API Surface

| Module | File | Named Exports |
| --- | --- | --- |
| - | - | - |

### Source module map

| Source File | Exported Symbols |
| --- | --- |
| `index.ts` | `packageId`, `packageDisplayName`, `packageDescription`, `createStaticZone` |

## React, UI, And Extensibility Notes

- UI surface: **Headless typed exports**
- Consumption model: **Imports + typed helpers**
- Extensibility points: explicit imports, props, callbacks, registries, providers, and typed helper APIs.
- This repo must **not** be documented as exposing a generic WordPress-style hook bus unless such a hook surface is explicitly exported through the public entrypoint.

## Failure Modes And Recovery

- Version drift between extracted repos can surface as missing `workspace:*` dependency resolution. Use a compatible Gutu workspace or vendor lock when integrating.
- Hosts should import from `@platform/ui-zone-static`, not deep internal file paths, so refactors inside `src/` do not become accidental breaking changes.
- React-facing hosts should mount providers, registries, and callback surfaces exactly as documented by the public exports instead of depending on internal implementation details.
- When a host needs orchestration, keep it in the surrounding application or plugin runtime; this library does not promise hidden side effects outside what its public API exports.

## Mermaid Flows

### Primary Consumption Flow

```mermaid
graph TD
  host["Host app or plugin"] --> import["Import from @platform/ui-zone-static"]
  import --> api["Public modules and named exports"]
  api --> compose["Compose headless typed exports"]
  compose --> verify["Verify with build, test, and docs checks"]
```

## Integration Recipes

### 1. Package identity

```ts
import { packageId, packageDisplayName, createStaticZone } from "@platform/ui-zone-static";

console.log(packageId, packageDisplayName);
console.log(typeof createStaticZone);
```

### 2. Safe consumption pattern

- Import from the package entrypoint, not `src/` internals.
- Compose through documented modules such as the exported entrypoint constants.
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

- Publishes 0 public modules from `@platform/ui-zone-static`.
- Exports 4 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `createStaticZone`.
- Keeps the public surface headless and import-driven rather than requiring a UI runtime.
- Verification lanes present: Build+Typecheck+Lint+Test.

### Current gaps

- Standalone consumers still need a compatible Gutu workspace to resolve workspace-scoped dependencies honestly.

### Recommended next

- Add stronger component and interaction verification around the most reused visual primitives.
- Deepen accessibility and composition guidance where multiple host apps depend on the same library.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

### Later / optional

- Visual regression lanes and design-token packs after the public APIs settle.
