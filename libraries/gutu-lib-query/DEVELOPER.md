# Query Developer Guide

Canonical TanStack Query wrapper with unified keys and optimistic helpers.

**Maturity Tier:** `Baseline`

## Purpose And Architecture Role

Provides typed query helpers and shared request/response patterns for packages that need stable data-access abstractions.

### This library is the right fit when

- You need **query helpers**, **typed data access**, **shared request patterns** as a reusable, package-level boundary.
- You want to consume typed exports from `@platform/query` instead of reaching into app-specific internals.
- You want documentation, verification, and package boundaries to stay aligned in the extracted-repo model.

### This library is intentionally not

- Not a vertical application or domain plugin by itself.
- Not a generic hook bus or hidden orchestration layer.

## Repo Map

| Path | Purpose |
| --- | --- |
| `package.json` | Root extracted-repo manifest, workspace wiring, and repo-level script entrypoints. |
| `framework/libraries/query` | Nested publishable library package. |
| `framework/libraries/query/src` | Public runtime source and exported modules. |
| `framework/libraries/query/tests` | Unit and contract verification where present. |

## Package Contract

| Field | Value |
| --- | --- |
| Package ID | `query` |
| Display Name | Query |
| Import Name | `@platform/query` |
| Version | `0.1.0` |
| UI Surface | Headless typed exports |
| Consumption Model | Imports + typed helpers |

## Dependency Graph And Compatibility

| Field | Value |
| --- | --- |
| Direct Dependencies | `@platform/ui-query`, `@tanstack/react-query` |
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
| `index.ts` | `packageId`, `packageDisplayName`, `packageDescription`, `createUnifiedQueryKeys`, `applyOptimisticQueryUpdate`, `invalidateAdminQueryScopes` |

## React, UI, And Extensibility Notes

- UI surface: **Headless typed exports**
- Consumption model: **Imports + typed helpers**
- Extensibility points: explicit imports, props, callbacks, registries, providers, and typed helper APIs.
- This repo must **not** be documented as exposing a generic WordPress-style hook bus unless such a hook surface is explicitly exported through the public entrypoint.

## Failure Modes And Recovery

- Version drift between extracted repos can surface as missing `workspace:*` dependency resolution. Use a compatible Gutu workspace or vendor lock when integrating.
- Hosts should import from `@platform/query`, not deep internal file paths, so refactors inside `src/` do not become accidental breaking changes.
- React-facing hosts should mount providers, registries, and callback surfaces exactly as documented by the public exports instead of depending on internal implementation details.
- When a host needs orchestration, keep it in the surrounding application or plugin runtime; this library does not promise hidden side effects outside what its public API exports.

## Mermaid Flows

### Primary Consumption Flow

```mermaid
graph TD
  host["Host app or plugin"] --> import["Import from @platform/query"]
  import --> api["Public modules and named exports"]
  api --> compose["Compose headless typed exports"]
  compose --> verify["Verify with build, test, and docs checks"]
```

## Integration Recipes

### 1. Package identity

```ts
import { packageId, packageDisplayName, createUnifiedQueryKeys } from "@platform/query";

console.log(packageId, packageDisplayName);
console.log(typeof createUnifiedQueryKeys);
```

### 2. Safe consumption pattern

- Import from the package entrypoint, not `src/` internals.
- Compose through documented modules such as `@platform/ui-query`.
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

- Publishes 1 public module from `@platform/query`: `@platform/ui-query`.
- Exports 6 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `createUnifiedQueryKeys`, `applyOptimisticQueryUpdate`, `invalidateAdminQueryScopes`.
- Keeps the public surface headless and import-driven rather than requiring a UI runtime.
- Verification lanes present: Build+Typecheck+Lint+Test.

### Current gaps

- Standalone consumers still need a compatible Gutu workspace to resolve workspace-scoped dependencies honestly.

### Recommended next

- Strengthen contract coverage around the most widely consumed helper surfaces.
- Add deeper integration examples where downstream packages repeatedly compose the same APIs.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

### Later / optional

- Reference adapters and richer cookbook examples once more external connectors exist.
