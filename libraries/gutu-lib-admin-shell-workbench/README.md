# Admin Shell Workbench

Admin Shell Workbench reusable library exports.

![Maturity: Hardened](https://img.shields.io/badge/Maturity-Hardened-2563eb) ![Verification: Build+Typecheck+Lint+Test](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest-6b7280) ![UI: React UI + typed helpers](https://img.shields.io/badge/UI-React%20UI%20%2B%20typed%20helpers-0f766e) ![Consumption: Imports + typed UI primitives](https://img.shields.io/badge/Consumption-Imports%20%2B%20typed%20UI%20primitives-2563eb)

## What It Does Now

- Publishes 1 public module from `@platform/admin-shell-workbench`: `./main`.
- Exports 26 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `createMemoryAdminPreferenceStore`, `createFileAdminPreferenceStore`, `composeAdminRegistry`, and more.
- Uses a React-aware surface model: React UI + typed helpers.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Maturity

**Maturity Tier:** `Hardened`

Why this tier:
- Group: **Admin Experience**
- Public modules: 1
- Named exports: 26
- Test files: 1
- Contract lane: not present

## Verified API Summary

| Field | Value |
| --- | --- |
| Package ID | `admin-shell-workbench` |
| Import Name | `@platform/admin-shell-workbench` |
| UI Surface | React UI + typed helpers |
| Consumption Model | Imports + typed UI primitives |
| Verification | Build+Typecheck+Lint+Test |

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package Name | `@platform/admin-shell-workbench` |
| Direct Dependencies | `@platform/admin-builders`, `@platform/admin-contracts`, `@platform/admin-formview`, `@platform/admin-listview`, `@platform/admin-reporting`, `@platform/admin-widgets`, `@platform/chart`, `@platform/command-palette`, `@platform/router`, `@platform/telemetry-ui`, `@platform/ui`, `@platform/ui-kit`, `@platform/ui-router`, `@platform/ui-shell`, `react` |
| Peer Dependencies | None |
| React Runtime | Yes |
| Workspace Requirement | Compatible Gutu workspace required |

## Capability Matrix

| Capability | Count / Mode | Notes |
| --- | --- | --- |
| Public Modules | 1 | `./main` |
| Named Exports | 26 | `packageId`, `packageDisplayName`, `packageDescription`, `createMemoryAdminPreferenceStore`, `createFileAdminPreferenceStore`, `composeAdminRegistry`, `filterAdminRegistryForPermissions`, `resolveAdminDeskRoute` |
| UI Surface | React UI + typed helpers | React-aware surface detected |
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
import { packageId, packageDisplayName, createMemoryAdminPreferenceStore } from "@platform/admin-shell-workbench";

console.log(packageId, packageDisplayName, typeof createMemoryAdminPreferenceStore);
```

Use the root repo scripts for day-to-day work after the workspace is bootstrapped, or run the nested package directly from `framework/libraries/admin-shell-workbench` if you need lower-level control.

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

- Deepen contract coverage around the most reused admin composition paths.
- Add stronger ergonomic guidance where multiple first-party plugins compose the same admin primitives.
- Add contract-focused tests around the most reused public modules and exported helpers.
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

## More Docs

- [Developer Guide](./DEVELOPER.md)
- [TODO](./TODO.md)
- [Security](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)
