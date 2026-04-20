# UI Shell

Shared shell registry, navigation, provider, and telemetry contracts.

![Maturity: Hardened](https://img.shields.io/badge/Maturity-Hardened-2563eb) ![Verification: Build+Typecheck+Lint+Test](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest-6b7280) ![UI: React UI + typed helpers](https://img.shields.io/badge/UI-React%20UI%20%2B%20typed%20helpers-0f766e) ![Consumption: Imports + providers + callbacks](https://img.shields.io/badge/Consumption-Imports%20%2B%20providers%20%2B%20callbacks-0f766e)

## What It Does Now

- Publishes 6 public modules from `@platform/ui-shell`: `./registry`, `./shells`, `./navigation`, `./providers`, `./telemetry`, `./types`.
- Exports 43 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `defineUiSurface`, `defineZone`, `createUiRegistry`, and more.
- Uses a React-aware surface model: React UI + typed helpers.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Maturity

**Maturity Tier:** `Hardened`

Why this tier:
- Group: **UI Foundation**
- Public modules: 6
- Named exports: 43
- Test files: 2
- Contract lane: not present

## Verified API Summary

| Field | Value |
| --- | --- |
| Package ID | `ui-shell` |
| Import Name | `@platform/ui-shell` |
| UI Surface | React UI + typed helpers |
| Consumption Model | Imports + providers + callbacks |
| Verification | Build+Typecheck+Lint+Test |

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package Name | `@platform/ui-shell` |
| Direct Dependencies | `react` |
| Peer Dependencies | None |
| React Runtime | Yes |
| Workspace Requirement | Standalone dependency graph is self-contained |

## Capability Matrix

| Capability | Count / Mode | Notes |
| --- | --- | --- |
| Public Modules | 6 | `./registry`, `./shells`, `./navigation`, `./providers`, `./telemetry`, `./types` |
| Named Exports | 43 | `packageId`, `packageDisplayName`, `packageDescription`, `defineUiSurface`, `defineZone`, `createUiRegistry`, `registerUiSurface`, `registerZone` |
| UI Surface | React UI + typed helpers | React-aware surface detected |
| Tests | 2 | Build+Typecheck+Lint+Test |

## Quick Start For Integrators

Use this repo inside a **compatible Gutu workspace** or the **ecosystem certification workspace** so its `workspace:*` dependencies resolve honestly.

```bash
# from a compatible workspace that already includes this library's dependency graph
bun install
bun run build
bun run test
bun run docs:check
```

```ts
import { packageId, packageDisplayName, defineUiSurface } from "@platform/ui-shell";

console.log(packageId, packageDisplayName, typeof defineUiSurface);
```

Use the root repo scripts for day-to-day work after the workspace is bootstrapped, or run the nested package directly from `framework/libraries/ui-shell` if you need lower-level control.

## Current Test Coverage

- `bun run build`
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run docs:check`
- `bun run test:unit`
- Unit files: 2
- Contract files: 0
- Integration files: 0
- Migration files: 0

## Known Boundaries And Non-Goals

- Not a complete front-end application by itself.
- Not a replacement for app-level state, routing, or domain-specific orchestration.
- This library should be consumed through explicit imports, providers, callbacks, and typed helpers rather than undocumented global hooks.

## Recommended Next Milestones

- Add stronger contract and interaction checks around provider and registry composition paths.
- Deepen host-application examples where multiple apps depend on the same shell primitives.
- Add contract-focused tests around the most reused public modules and exported helpers.
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.

## More Docs

- [Developer Guide](./DEVELOPER.md)
- [TODO](./TODO.md)
- [Security](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)
