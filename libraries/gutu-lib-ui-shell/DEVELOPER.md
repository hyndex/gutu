# UI Shell Developer Guide

Shared shell registry, navigation, provider, and telemetry contracts.

**Maturity Tier:** `Hardened`

## Purpose And Architecture Role

Provides the shared shell registry, providers, telemetry, and navigation contracts that host apps use to assemble coherent application shells.

### This library is the right fit when

- You need **shell registry**, **providers**, **navigation and telemetry** as a reusable, package-level boundary.
- You want to consume typed exports from `@platform/ui-shell` instead of reaching into app-specific internals.
- You want documentation, verification, and package boundaries to stay aligned in the extracted-repo model.

### This library is intentionally not

- Not a complete front-end application by itself.
- Not a replacement for app-level state, routing, or domain-specific orchestration.

## Repo Map

| Path | Purpose |
| --- | --- |
| `package.json` | Root extracted-repo manifest, workspace wiring, and repo-level script entrypoints. |
| `framework/libraries/ui-shell` | Nested publishable library package. |
| `framework/libraries/ui-shell/src` | Public runtime source and exported modules. |
| `framework/libraries/ui-shell/tests` | Unit and contract verification where present. |

## Package Contract

| Field | Value |
| --- | --- |
| Package ID | `ui-shell` |
| Display Name | UI Shell |
| Import Name | `@platform/ui-shell` |
| Version | `0.1.0` |
| UI Surface | React UI + typed helpers |
| Consumption Model | Imports + providers + callbacks |

## Dependency Graph And Compatibility

| Field | Value |
| --- | --- |
| Direct Dependencies | `react` |
| Peer Dependencies | None |
| Dev Dependencies | None |
| React Runtime | Yes |
| Workspace Scoped | No |

### Dependency interpretation

- Direct dependencies describe what the library needs at runtime to satisfy its public exports.
- Workspace-scoped dependencies mean extracted repos should be consumed through a compatible Gutu workspace or vendor-synced environment.
- Peer dependencies should be satisfied by the host when the library is integrated outside the certification workspace.

## Public API Surface

| Module | File | Named Exports |
| --- | --- | --- |
| `./registry` | `src/registry.ts` | `defineUiSurface`, `defineZone`, `createUiRegistry`, `registerUiSurface`, `registerZone`, `validateUiRegistry`, `listShellRoutes` |
| `./shells` | `src/shells.tsx` | `AdminShell`, `PortalShell`, `SiteShell` |
| `./navigation` | `src/navigation.ts` | `listDeepLinks`, `resolveNavigationTarget`, `createNavigationContract` |
| `./providers` | `src/providers.ts` | `createPermissionIntrospector`, `createShellEventBus`, `createShellProviders`, `ShellProvider`, `useShellProviders`, `usePermission` |
| `./telemetry` | `src/telemetry.ts` | `createShellAuditHook`, `createShellTelemetryHook` |
| `./types` | `src/types.ts` | `ShellKind`, `EmbeddedPageRegistration`, `WidgetRegistration`, `ZoneDefinition`, `UiSurfaceDefinition`, `UiRegistry`, `SessionSnapshot`, `PermissionIntrospector` |

### Source module map

| Source File | Exported Symbols |
| --- | --- |
| `index.ts` | `packageId`, `packageDisplayName`, `packageDescription` |
| `navigation.ts` | `listDeepLinks`, `resolveNavigationTarget`, `createNavigationContract` |
| `providers.ts` | `createPermissionIntrospector`, `createShellEventBus`, `createShellProviders`, `ShellProvider`, `useShellProviders`, `usePermission` |
| `registry.ts` | `defineUiSurface`, `defineZone`, `createUiRegistry`, `registerUiSurface`, `registerZone`, `validateUiRegistry`, `listShellRoutes` |
| `shells.tsx` | `AdminShell`, `PortalShell`, `SiteShell` |
| `telemetry.ts` | `createShellAuditHook`, `createShellTelemetryHook` |
| `types.ts` | `ShellKind`, `EmbeddedPageRegistration`, `WidgetRegistration`, `ZoneDefinition`, `UiSurfaceDefinition`, `UiRegistry`, `SessionSnapshot`, `PermissionIntrospector` |

## React, UI, And Extensibility Notes

- UI surface: **React UI + typed helpers**
- Consumption model: **Imports + providers + callbacks**
- Extensibility points: explicit imports, props, callbacks, registries, providers, and typed helper APIs.
- This repo must **not** be documented as exposing a generic WordPress-style hook bus unless such a hook surface is explicitly exported through the public entrypoint.

## Failure Modes And Recovery

- Version drift between extracted repos can surface as missing `workspace:*` dependency resolution. Use a compatible Gutu workspace or vendor lock when integrating.
- Hosts should import from `@platform/ui-shell`, not deep internal file paths, so refactors inside `src/` do not become accidental breaking changes.
- React-facing hosts should mount providers, registries, and callback surfaces exactly as documented by the public exports instead of depending on internal implementation details.
- When a host needs orchestration, keep it in the surrounding application or plugin runtime; this library does not promise hidden side effects outside what its public API exports.

## Mermaid Flows

### Primary Consumption Flow

```mermaid
graph TD
  host["Host app or plugin"] --> import["Import from @platform/ui-shell"]
  import --> api["Public modules and named exports"]
  api --> compose["Compose react ui + typed helpers"]
  compose --> verify["Verify with build, test, and docs checks"]
```

## Integration Recipes

### 1. Package identity

```ts
import { packageId, packageDisplayName, defineUiSurface } from "@platform/ui-shell";

console.log(packageId, packageDisplayName);
console.log(typeof defineUiSurface);
```

### 2. Safe consumption pattern

- Import from the package entrypoint, not `src/` internals.
- Compose through documented modules such as `./registry`, `./shells`, `./navigation`, `./providers`, `./telemetry`, `./types`.
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
| Unit | Yes | 2 file(s) |
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

- Publishes 6 public modules from `@platform/ui-shell`: `./registry`, `./shells`, `./navigation`, `./providers`, `./telemetry`, `./types`.
- Exports 43 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `defineUiSurface`, `defineZone`, `createUiRegistry`, and more.
- Uses a React-aware surface model: React UI + typed helpers.
- Verification lanes present: Build+Typecheck+Lint+Test.

### Current gaps

- Broad public API surface still relies on unit coverage only; there is no separate contract lane yet.

### Recommended next

- Add stronger contract and interaction checks around provider and registry composition paths.
- Deepen host-application examples where multiple apps depend on the same shell primitives.
- Add contract-focused tests around the most reused public modules and exported helpers.
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.

### Later / optional

- Visual regression lanes and design-token packs after the public APIs settle.
