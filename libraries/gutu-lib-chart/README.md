# Chart

Canonical ECharts-backed chart presets and rendering contracts.

![Maturity: Hardened](https://img.shields.io/badge/Maturity-Hardened-2563eb) ![Verification: Build+Typecheck+Lint+Test](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest-6b7280) ![UI: Mixed runtime helpers](https://img.shields.io/badge/UI-Mixed%20runtime%20helpers-2563eb) ![Consumption: Imports + typed UI primitives](https://img.shields.io/badge/Consumption-Imports%20%2B%20typed%20UI%20primitives-2563eb)

## What It Does Now

- Publishes 0 public modules from `@platform/chart`.
- Exports 15 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `buildCartesianChartOption`, `createLineChartOption`, `createBarChartOption`, and more.
- Uses a React-aware surface model: Mixed runtime helpers.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Maturity

**Maturity Tier:** `Hardened`

Why this tier:
- Group: **UI Foundation**
- Public modules: 0
- Named exports: 15
- Test files: 1
- Contract lane: not present

## Verified API Summary

| Field | Value |
| --- | --- |
| Package ID | `chart` |
| Import Name | `@platform/chart` |
| UI Surface | Mixed runtime helpers |
| Consumption Model | Imports + typed UI primitives |
| Verification | Build+Typecheck+Lint+Test |

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package Name | `@platform/chart` |
| Direct Dependencies | `echarts`, `react` |
| Peer Dependencies | None |
| React Runtime | Yes |
| Workspace Requirement | Standalone dependency graph is self-contained |

## Capability Matrix

| Capability | Count / Mode | Notes |
| --- | --- | --- |
| Public Modules | 0 | No module re-exports detected |
| Named Exports | 15 | `packageId`, `packageDisplayName`, `packageDescription`, `buildCartesianChartOption`, `createLineChartOption`, `createBarChartOption`, `createStackedBarChartOption`, `createPieChartOption` |
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
import { packageId, packageDisplayName, buildCartesianChartOption } from "@platform/chart";

console.log(packageId, packageDisplayName, typeof buildCartesianChartOption);
```

Use the root repo scripts for day-to-day work after the workspace is bootstrapped, or run the nested package directly from `framework/libraries/chart` if you need lower-level control.

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

- Not a complete front-end application by itself.
- Not a replacement for app-level state, routing, or domain-specific orchestration.
- This library should be consumed through explicit imports, providers, callbacks, and typed helpers rather than undocumented global hooks.

## Recommended Next Milestones

- Add stronger component and interaction verification around the most reused visual primitives.
- Deepen accessibility and composition guidance where multiple host apps depend on the same library.
- Add contract-focused tests around the most reused public modules and exported helpers.
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.

## More Docs

- [Developer Guide](./DEVELOPER.md)
- [TODO](./TODO.md)
- [Security](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)
