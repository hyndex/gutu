# Admin Contracts

Governed admin-desk contracts, registries, access helpers, and legacy adapters.

![Maturity: Hardened](https://img.shields.io/badge/Maturity-Hardened-2563eb) ![Verification: Build+Typecheck+Lint+Test](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest-6b7280) ![UI: Mixed runtime helpers](https://img.shields.io/badge/UI-Mixed%20runtime%20helpers-2563eb) ![Consumption: Imports + typed UI primitives](https://img.shields.io/badge/Consumption-Imports%20%2B%20typed%20UI%20primitives-2563eb)

## What It Does Now

- Publishes 4 public modules from `@platform/admin-contracts`: `./access`, `./legacy`, `./registry`, `./types`.
- Exports 54 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `canViewPage`, `canRunAction`, `canSeeField`, and more.
- Uses a React-aware surface model: Mixed runtime helpers.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Maturity

**Maturity Tier:** `Hardened`

Why this tier:
- Group: **Admin Experience**
- Public modules: 4
- Named exports: 54
- Test files: 1
- Contract lane: not present

## Verified API Summary

| Field | Value |
| --- | --- |
| Package ID | `admin-contracts` |
| Import Name | `@platform/admin-contracts` |
| UI Surface | Mixed runtime helpers |
| Consumption Model | Imports + typed UI primitives |
| Verification | Build+Typecheck+Lint+Test |

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package Name | `@platform/admin-contracts` |
| Direct Dependencies | `@platform/ui-shell`, `react` |
| Peer Dependencies | None |
| React Runtime | Yes |
| Workspace Requirement | Compatible Gutu workspace required |

## Capability Matrix

| Capability | Count / Mode | Notes |
| --- | --- | --- |
| Public Modules | 4 | `./access`, `./legacy`, `./registry`, `./types` |
| Named Exports | 54 | `packageId`, `packageDisplayName`, `packageDescription`, `canViewPage`, `canRunAction`, `canSeeField`, `canSeeWidget`, `canViewReport` |
| UI Surface | Mixed runtime helpers | React-aware surface detected |
| Tests | 1 | Build+Typecheck+Lint+Test |

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
import { packageId, packageDisplayName, canViewPage } from "@platform/admin-contracts";

console.log(packageId, packageDisplayName, typeof canViewPage);
```

Use the root repo scripts for day-to-day work after the workspace is bootstrapped, or run the nested package directly from `framework/libraries/admin-contracts` if you need lower-level control.

## Current Test Coverage

- `bun run build`
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run docs:check`
- `bun run test:unit`
- Unit files: 1
- Contract files: 0
- Integration files: 0
- Migration files: 0

## Known Boundaries And Non-Goals

- Not a full product shell or admin application by itself.
- Not a replacement for plugin-owned business logic or data lifecycles.
- This library should be consumed through explicit imports, providers, callbacks, and typed helpers rather than undocumented global hooks.

## Recommended Next Milestones

- Broaden contract tests around registry and legacy-adapter boundaries.
- Add clearer migration guidance for hosts moving from legacy admin wiring to the current contract set.
- Add contract-focused tests around the most reused public modules and exported helpers.
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

## More Docs

- [Developer Guide](./DEVELOPER.md)
- [TODO](./TODO.md)
- [Security](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)
