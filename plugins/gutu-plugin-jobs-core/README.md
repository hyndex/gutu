# Jobs Core

Background jobs, schedules, and execution metadata.

![Maturity: Hardened](https://img.shields.io/badge/Maturity-Hardened-2563eb) ![Verification: Build+Typecheck+Lint+Test+Contracts](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest%2BContracts-6b7280) ![DB: postgres+sqlite](https://img.shields.io/badge/DB-postgres%2Bsqlite-2563eb) ![Integration Model: Actions+Resources+Jobs+UI](https://img.shields.io/badge/Integration%20Model-Actions%2BResources%2BJobs%2BUI-2563eb)

## What It Does Now

Registers the background job definitions, queues, retry policy, and execution metadata that other plugins can target safely.

- Exports 1 governed action: `jobs.executions.schedule`.
- Owns 1 resource contract: `jobs.executions`.
- Publishes 3 job definitions with explicit queue and retry policy metadata.
- Registers a bounded UI surface that can be hosted by the surrounding admin or portal shell.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.

## Maturity

**Maturity Tier:** `Hardened`

This tier is justified because unit coverage exists, contract coverage exists, and job definitions are exported.

## Verified Capability Summary

- Group: **Platform Backbone**
- Verification surface: **Build+Typecheck+Lint+Test+Contracts**
- Tests discovered: **2** total files across unit, contract lanes
- Integration model: **Actions+Resources+Jobs+UI**
- Database support: **postgres + sqlite**

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package | `@plugins/jobs-core` |
| Manifest ID | `jobs-core` |
| Repo | [gutu-plugin-jobs-core](https://github.com/gutula/gutu-plugin-jobs-core) |
| Depends On | `auth-core`, `org-tenant-core`, `role-policy-core`, `audit-core` |
| Requested Capabilities | `ui.register.admin`, `api.rest.mount`, `data.write.jobs` |
| Provided Capabilities | `jobs.executions` |
| Runtime | bun>=1.3.12 |
| Database | postgres, sqlite |
| Integration Model | Actions+Resources+Jobs+UI |

## Capability Matrix

| Surface | Count | Details |
| --- | --- | --- |
| Actions | 1 | `jobs.executions.schedule` |
| Resources | 1 | `jobs.executions` |
| Jobs | 3 | `crm.sync-segments`, `files.scan-uploads`, `notifications.dispatch` |
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
import { manifest, scheduleJobExecutionAction, JobExecutionResource, jobDefinitions, uiSurface } from "@plugins/jobs-core";

console.log(manifest.id);
console.log(scheduleJobExecutionAction.id);
console.log(JobExecutionResource.id);
```

Use the root repo scripts for day-to-day work **after the workspace is bootstrapped**, or run the nested package directly from `framework/builtin-plugins/jobs-core` if you need lower-level control.

## Current Test Coverage

- Root verification scripts: `bun run build`, `bun run typecheck`, `bun run lint`, `bun run test`, `bun run test:contracts`, `bun run test:unit`, `bun run docs:check`
- Unit files: 1
- Contracts files: 1
- Integration files: 0
- Migrations files: 0

## Known Boundaries And Non-Goals

- Not a generic WordPress-style hook bus or plugin macro system.
- Not a product-specific UX suite beyond the exported admin or portal surfaces that ship today.
- This repo does not yet claim to be a full distributed worker runtime or broker adapter layer.
- It defines and governs job contracts; external execution infrastructure still sits outside the repo boundary.
- Cross-plugin composition should use Gutu command, event, job, and workflow primitives. This repo should not be documented as exposing a generic WordPress-style hook system unless one is explicitly exported.

## Recommended Next Milestones

- Add stronger worker-runtime integration guidance and operational troubleshooting as more plugins dispatch background jobs.
- Expose more lifecycle telemetry once execution state becomes a first-class operator concern.
- Add stronger operator-facing reconciliation and observability surfaces where runtime state matters.
- Promote any currently implicit cross-plugin lifecycles into explicit command, event, or job contracts when those integrations stabilize.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Add explicit migration or rollback coverage if this domain becomes more operationally sensitive.
- Broaden the admin entry surface only if operators need more than the current embedded view or resource listing.

## More Docs

See [DEVELOPER.md](./DEVELOPER.md), [TODO.md](./TODO.md), [SECURITY.md](./SECURITY.md), [CONTRIBUTING.md](./CONTRIBUTING.md). The internal domain sources used to build those docs live under:

- `plugins/gutu-plugin-jobs-core/framework/builtin-plugins/jobs-core/docs/AGENT_CONTEXT.md`
- `plugins/gutu-plugin-jobs-core/framework/builtin-plugins/jobs-core/docs/BUSINESS_RULES.md`
- `plugins/gutu-plugin-jobs-core/framework/builtin-plugins/jobs-core/docs/EDGE_CASES.md`
- `plugins/gutu-plugin-jobs-core/framework/builtin-plugins/jobs-core/docs/FLOWS.md`
- `plugins/gutu-plugin-jobs-core/framework/builtin-plugins/jobs-core/docs/GLOSSARY.md`
- `plugins/gutu-plugin-jobs-core/framework/builtin-plugins/jobs-core/docs/MANDATORY_STEPS.md`
