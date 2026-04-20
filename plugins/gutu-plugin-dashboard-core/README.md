# Dashboard Core

Dashboard, widget, and saved view backbone.

![Maturity: Baseline](https://img.shields.io/badge/Maturity-Baseline-7c3aed) ![Verification: Build+Typecheck+Lint+Test+Contracts](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest%2BContracts-6b7280) ![DB: postgres+sqlite](https://img.shields.io/badge/DB-postgres%2Bsqlite-2563eb) ![Integration Model: Actions+Resources+UI](https://img.shields.io/badge/Integration%20Model-Actions%2BResources%2BUI-6b7280)

## What It Does Now

Provides the dashboard and widget backbone for operator-facing metrics, saved views, and admin summary surfaces.

- Exports 1 governed action: `dashboard.views.publish`.
- Owns 1 resource contract: `dashboard.views`.
- Adds richer admin workspace contributions on top of the base UI surface.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.

## Maturity

**Maturity Tier:** `Baseline`

This tier is justified because unit coverage exists, and contract coverage exists.

## Verified Capability Summary

- Group: **Operational Data**
- Verification surface: **Build+Typecheck+Lint+Test+Contracts**
- Tests discovered: **3** total files across unit, contract lanes
- Integration model: **Actions+Resources+UI**
- Database support: **postgres + sqlite**

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package | `@plugins/dashboard-core` |
| Manifest ID | `dashboard-core` |
| Repo | [gutu-plugin-dashboard-core](https://github.com/gutula/gutu-plugin-dashboard-core) |
| Depends On | `auth-core`, `org-tenant-core`, `role-policy-core`, `audit-core` |
| Requested Capabilities | `ui.register.admin`, `api.rest.mount`, `data.write.dashboard` |
| Provided Capabilities | `dashboard.views` |
| Runtime | bun>=1.3.12 |
| Database | postgres, sqlite |
| Integration Model | Actions+Resources+UI |

## Capability Matrix

| Surface | Count | Details |
| --- | --- | --- |
| Actions | 1 | `dashboard.views.publish` |
| Resources | 1 | `dashboard.views` |
| Jobs | 0 | No job catalog exported |
| Workflows | 0 | No workflow catalog exported |
| UI | Present | base UI surface, admin contributions |

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
import { manifest, publishDashboardViewAction, DashboardViewResource, adminContributions, uiSurface } from "@plugins/dashboard-core";

console.log(manifest.id);
console.log(publishDashboardViewAction.id);
console.log(DashboardViewResource.id);
```

Use the root repo scripts for day-to-day work **after the workspace is bootstrapped**, or run the nested package directly from `framework/builtin-plugins/dashboard-core` if you need lower-level control.

## Current Test Coverage

- Root verification scripts: `bun run build`, `bun run typecheck`, `bun run lint`, `bun run test`, `bun run test:contracts`, `bun run test:unit`, `bun run docs:check`
- Unit files: 1
- Contracts files: 2
- Integration files: 0
- Migrations files: 0

## Known Boundaries And Non-Goals

- Not a full vertical application suite; this plugin only owns the domain slice exported in this repo.
- Not a replacement for explicit orchestration in jobs/workflows when multi-step automation is required.
- Cross-plugin composition should use Gutu command, event, job, and workflow primitives. This repo should not be documented as exposing a generic WordPress-style hook system unless one is explicitly exported.

## Recommended Next Milestones

- Expand drill-down and dashboard runtime diagnostics as more operational plugins register widgets.
- Add stronger cross-plugin metric contracts when dashboard composition becomes a platform-wide dependency.
- Broaden lifecycle coverage with deeper orchestration, reconciliation, and operator tooling where the business flow requires it.
- Add more explicit domain events or follow-up job surfaces when downstream systems need tighter coupling.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Add explicit migration or rollback coverage if this domain becomes more operationally sensitive.
- Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.

## More Docs

See [DEVELOPER.md](./DEVELOPER.md), [TODO.md](./TODO.md), [SECURITY.md](./SECURITY.md), [CONTRIBUTING.md](./CONTRIBUTING.md). The internal domain sources used to build those docs live under:

- `plugins/gutu-plugin-dashboard-core/framework/builtin-plugins/dashboard-core/docs/AGENT_CONTEXT.md`
- `plugins/gutu-plugin-dashboard-core/framework/builtin-plugins/dashboard-core/docs/BUSINESS_RULES.md`
- `plugins/gutu-plugin-dashboard-core/framework/builtin-plugins/dashboard-core/docs/EDGE_CASES.md`
- `plugins/gutu-plugin-dashboard-core/framework/builtin-plugins/dashboard-core/docs/FLOWS.md`
- `plugins/gutu-plugin-dashboard-core/framework/builtin-plugins/dashboard-core/docs/GLOSSARY.md`
- `plugins/gutu-plugin-dashboard-core/framework/builtin-plugins/dashboard-core/docs/MANDATORY_STEPS.md`
