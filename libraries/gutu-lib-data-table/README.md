# Data Table

Canonical data-table wrapper with TanStack Table and Virtual helpers.

![Maturity: Hardened](https://img.shields.io/badge/Maturity-Hardened-2563eb) ![Verification: Build+Typecheck+Lint+Test](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest-6b7280) ![UI: Headless typed exports](https://img.shields.io/badge/UI-Headless%20typed%20exports-6b7280) ![Consumption: Imports + typed helpers](https://img.shields.io/badge/Consumption-Imports%20%2B%20typed%20helpers-2563eb)

## What It Does Now

- Publishes 1 public module from `@platform/data-table`: `@platform/ui-table`.
- Exports 12 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `createVirtualWindowState`, `getVirtualRows`, `usePlatformVirtualRows`, and more.
- Uses a React-aware surface model: Headless typed exports.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Maturity

**Maturity Tier:** `Hardened`

Why this tier:
- Group: **Core Data And Query**
- Public modules: 1
- Named exports: 12
- Test files: 1
- Contract lane: not present

## Verified API Summary

| Field | Value |
| --- | --- |
| Package ID | `data-table` |
| Import Name | `@platform/data-table` |
| UI Surface | Headless typed exports |
| Consumption Model | Imports + typed helpers |
| Verification | Build+Typecheck+Lint+Test |

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package Name | `@platform/data-table` |
| Direct Dependencies | `@platform/ui-table`, `@tanstack/react-query`, `@tanstack/react-virtual`, `react` |
| Peer Dependencies | None |
| React Runtime | Yes |
| Workspace Requirement | Compatible Gutu workspace required |

## Capability Matrix

| Capability | Count / Mode | Notes |
| --- | --- | --- |
| Public Modules | 1 | `@platform/ui-table` |
| Named Exports | 12 | `packageId`, `packageDisplayName`, `packageDescription`, `createVirtualWindowState`, `getVirtualRows`, `usePlatformVirtualRows`, `createSavedViewSnapshot`, `applySavedViewSnapshot` |
| UI Surface | Headless typed exports | React-aware surface detected |
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
import { packageId, packageDisplayName, createVirtualWindowState } from "@platform/data-table";

console.log(packageId, packageDisplayName, typeof createVirtualWindowState);
```

Use the root repo scripts for day-to-day work after the workspace is bootstrapped, or run the nested package directly from `framework/libraries/data-table` if you need lower-level control.

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

- Not a vertical application or domain plugin by itself.
- Not a generic hook bus or hidden orchestration layer.
- This library should be consumed through explicit imports, providers, callbacks, and typed helpers rather than undocumented global hooks.

## Recommended Next Milestones

- Strengthen contract coverage around the most widely consumed helper surfaces.
- Add deeper integration examples where downstream packages repeatedly compose the same APIs.
- Add contract-focused tests around the most reused public modules and exported helpers.
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

## More Docs

- [Developer Guide](./DEVELOPER.md)
- [TODO](./TODO.md)
- [Security](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)
