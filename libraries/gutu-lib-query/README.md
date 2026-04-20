# Query

Canonical TanStack Query wrapper with unified keys and optimistic helpers.

![Maturity: Baseline](https://img.shields.io/badge/Maturity-Baseline-7c3aed) ![Verification: Build+Typecheck+Lint+Test](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest-6b7280) ![UI: Headless typed exports](https://img.shields.io/badge/UI-Headless%20typed%20exports-6b7280) ![Consumption: Imports + typed helpers](https://img.shields.io/badge/Consumption-Imports%20%2B%20typed%20helpers-2563eb)

## What It Does Now

- Publishes 1 public module from `@platform/query`: `@platform/ui-query`.
- Exports 6 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `createUnifiedQueryKeys`, `applyOptimisticQueryUpdate`, `invalidateAdminQueryScopes`.
- Keeps the public surface headless and import-driven rather than requiring a UI runtime.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Maturity

**Maturity Tier:** `Baseline`

Why this tier:
- Group: **Core Data And Query**
- Public modules: 1
- Named exports: 6
- Test files: 1
- Contract lane: not present

## Verified API Summary

| Field | Value |
| --- | --- |
| Package ID | `query` |
| Import Name | `@platform/query` |
| UI Surface | Headless typed exports |
| Consumption Model | Imports + typed helpers |
| Verification | Build+Typecheck+Lint+Test |

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package Name | `@platform/query` |
| Direct Dependencies | `@platform/ui-query`, `@tanstack/react-query` |
| Peer Dependencies | None |
| React Runtime | No |
| Workspace Requirement | Compatible Gutu workspace required |

## Capability Matrix

| Capability | Count / Mode | Notes |
| --- | --- | --- |
| Public Modules | 1 | `@platform/ui-query` |
| Named Exports | 6 | `packageId`, `packageDisplayName`, `packageDescription`, `createUnifiedQueryKeys`, `applyOptimisticQueryUpdate`, `invalidateAdminQueryScopes` |
| UI Surface | Headless typed exports | Headless typed helpers |
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
import { packageId, packageDisplayName, createUnifiedQueryKeys } from "@platform/query";

console.log(packageId, packageDisplayName, typeof createUnifiedQueryKeys);
```

Use the root repo scripts for day-to-day work after the workspace is bootstrapped, or run the nested package directly from `framework/libraries/query` if you need lower-level control.

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
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

## More Docs

- [Developer Guide](./DEVELOPER.md)
- [TODO](./TODO.md)
- [Security](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)
