# Email Templates

React Email wrapper and template helpers.

![Maturity: Baseline](https://img.shields.io/badge/Maturity-Baseline-7c3aed) ![Verification: Build+Typecheck+Lint+Test](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest-6b7280) ![UI: Headless typed exports](https://img.shields.io/badge/UI-Headless%20typed%20exports-6b7280) ![Consumption: Imports + typed helpers](https://img.shields.io/badge/Consumption-Imports%20%2B%20typed%20helpers-2563eb)

## What It Does Now

- Publishes 0 public modules from `@platform/email-templates`.
- Exports 10 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `defineEmailTemplate`, `createEmailTemplateRegistry`, `renderEmailTemplate`, and more.
- Uses a React-aware surface model: Headless typed exports.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Maturity

**Maturity Tier:** `Baseline`

Why this tier:
- Group: **Core Data And Query**
- Public modules: 0
- Named exports: 10
- Test files: 1
- Contract lane: not present

## Verified API Summary

| Field | Value |
| --- | --- |
| Package ID | `email-templates` |
| Import Name | `@platform/email-templates` |
| UI Surface | Headless typed exports |
| Consumption Model | Imports + typed helpers |
| Verification | Build+Typecheck+Lint+Test |

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package Name | `@platform/email-templates` |
| Direct Dependencies | `@react-email/render`, `react` |
| Peer Dependencies | None |
| React Runtime | Yes |
| Workspace Requirement | Standalone dependency graph is self-contained |

## Capability Matrix

| Capability | Count / Mode | Notes |
| --- | --- | --- |
| Public Modules | 0 | No module re-exports detected |
| Named Exports | 10 | `packageId`, `packageDisplayName`, `packageDescription`, `defineEmailTemplate`, `createEmailTemplateRegistry`, `renderEmailTemplate`, `renderEmailPreview`, `RenderedEmail` |
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
import { packageId, packageDisplayName, defineEmailTemplate } from "@platform/email-templates";

console.log(packageId, packageDisplayName, typeof defineEmailTemplate);
```

Use the root repo scripts for day-to-day work after the workspace is bootstrapped, or run the nested package directly from `framework/libraries/email-templates` if you need lower-level control.

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
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.

## More Docs

- [Developer Guide](./DEVELOPER.md)
- [TODO](./TODO.md)
- [Security](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)
