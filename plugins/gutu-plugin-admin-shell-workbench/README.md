# Admin Shell Workbench

Default universal admin desk plugin.

![Maturity: Baseline](https://img.shields.io/badge/Maturity-Baseline-7c3aed) ![Verification: Build+Typecheck+Lint+Test+Contracts](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest%2BContracts-6b7280) ![DB: postgres+sqlite](https://img.shields.io/badge/DB-postgres%2Bsqlite-2563eb) ![Integration Model: Actions+Resources+UI](https://img.shields.io/badge/Integration%20Model-Actions%2BResources%2BUI-6b7280)

## What It Does Now

Hosts the universal admin desk and turns resource, route, widget, and workspace contributions into one navigable operator surface.

- Registers a bounded UI surface that can be hosted by the surrounding admin or portal shell.

## Maturity

**Maturity Tier:** `Baseline`

This tier is justified because unit coverage exists, and contract coverage exists.

## Verified Capability Summary

- Group: **Platform Backbone**
- Verification surface: **Build+Typecheck+Lint+Test+Contracts**
- Tests discovered: **2** total files across unit, contract lanes
- Integration model: **Actions+Resources+UI**
- Database support: **postgres + sqlite**

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package | `@plugins/admin-shell-workbench` |
| Manifest ID | `admin-shell-workbench` |
| Repo | [gutu-plugin-admin-shell-workbench](https://github.com/gutula/gutu-plugin-admin-shell-workbench) |
| Depends On | `auth-core`, `org-tenant-core`, `role-policy-core`, `dashboard-core` |
| Requested Capabilities | `ui.mount:admin`, `data.read.settings` |
| Provided Capabilities | `ui.shell.admin`, `ui.admin.widgets`, `ui.admin.pages`, `ui.admin.reports`, `ui.admin.builders` |
| Runtime | bun>=1.3.12 |
| Database | postgres, sqlite |
| Integration Model | Actions+Resources+UI |

## Capability Matrix

| Surface | Count | Details |
| --- | --- | --- |
| Actions | 0 | None exported today |
| Resources | 0 | None exported today |
| Jobs | 0 | No job catalog exported |
| Workflows | 0 | No workflow catalog exported |
| UI | Present | base UI surface |

## Quick Start For Integrators

Use this repo inside a **compatible Gutu workspace** or the **ecosystem certification workspace** so its `workspace:*` dependencies resolve honestly.

```bash
# from a compatible workspace that already includes this plugin's dependency graph
bun install
bun run build
bun run test
bun run docs:check
```

```ts
import { manifest, uiSurface } from "@plugins/admin-shell-workbench";

console.log(manifest.id);


```

Use the root repo scripts for day-to-day work **after the workspace is bootstrapped**, or run the nested package directly from `framework/builtin-plugins/admin-shell-workbench` if you need lower-level control.

## Current Test Coverage

- Root verification scripts: `bun run build`, `bun run typecheck`, `bun run lint`, `bun run test`, `bun run test:contracts`, `bun run test:unit`, `bun run docs:check`
- Unit files: 1
- Contracts files: 1
- Integration files: 0
- Migrations files: 0

## Known Boundaries And Non-Goals

- Not a generic WordPress-style hook bus or plugin macro system.
- Not a product-specific UX suite beyond the exported admin or portal surfaces that ship today.
- Cross-plugin composition should use Gutu command, event, job, and workflow primitives. This repo should not be documented as exposing a generic WordPress-style hook system unless one is explicitly exported.

## Recommended Next Milestones

- Deepen saved-workspace, search, and operator personalization flows once more first-party plugins depend on the desk.
- Add stronger runtime diagnostics around missing or conflicting admin contributions.
- Add stronger operator-facing reconciliation and observability surfaces where runtime state matters.
- Promote any currently implicit cross-plugin lifecycles into explicit command, event, or job contracts when those integrations stabilize.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.
- Broaden the admin entry surface only if operators need more than the current embedded view or resource listing.

## More Docs

See [DEVELOPER.md](./DEVELOPER.md), [TODO.md](./TODO.md), [SECURITY.md](./SECURITY.md), [CONTRIBUTING.md](./CONTRIBUTING.md). The internal domain sources used to build those docs live under:

- `plugins/gutu-plugin-admin-shell-workbench/framework/builtin-plugins/admin-shell-workbench/docs/AGENT_CONTEXT.md`
- `plugins/gutu-plugin-admin-shell-workbench/framework/builtin-plugins/admin-shell-workbench/docs/BUSINESS_RULES.md`
- `plugins/gutu-plugin-admin-shell-workbench/framework/builtin-plugins/admin-shell-workbench/docs/EDGE_CASES.md`
- `plugins/gutu-plugin-admin-shell-workbench/framework/builtin-plugins/admin-shell-workbench/docs/FLOWS.md`
- `plugins/gutu-plugin-admin-shell-workbench/framework/builtin-plugins/admin-shell-workbench/docs/GLOSSARY.md`
- `plugins/gutu-plugin-admin-shell-workbench/framework/builtin-plugins/admin-shell-workbench/docs/MANDATORY_STEPS.md`
