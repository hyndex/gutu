# Jobs Core Developer Guide

Background jobs, schedules, and execution metadata.

**Maturity Tier:** `Hardened`

## Purpose And Architecture Role

Registers the background job definitions, queues, retry policy, and execution metadata that other plugins can target safely.

### This plugin is the right fit when

- You need **job definitions**, **retry policy**, **execution metadata** as a governed domain boundary.
- You want to integrate through declared actions, resources, jobs, workflows, and UI surfaces instead of implicit side effects.
- You need the host application to keep plugin boundaries honest through manifest capabilities, permissions, and verification lanes.

### This plugin is intentionally not

- Not a generic WordPress-style hook bus or plugin macro system.
- Not a product-specific UX suite beyond the exported admin or portal surfaces that ship today.
- This repo does not yet claim to be a full distributed worker runtime or broker adapter layer.
- It defines and governs job contracts; external execution infrastructure still sits outside the repo boundary.

## Repo Map

| Path | Purpose |
| --- | --- |
| `package.json` | Root extracted-repo manifest, workspace wiring, and repo-level script entrypoints. |
| `framework/builtin-plugins/jobs-core` | Nested publishable plugin package. |
| `framework/builtin-plugins/jobs-core/src` | Runtime source, actions, resources, services, and UI exports. |
| `framework/builtin-plugins/jobs-core/tests` | Unit, contract, integration, and migration coverage where present. |
| `framework/builtin-plugins/jobs-core/docs` | Internal domain-doc source set kept in sync with this guide. |
| `framework/builtin-plugins/jobs-core/db/schema.ts` | Database schema contract when durable state is owned. |
| `framework/builtin-plugins/jobs-core/src/postgres.ts` | SQL migration and rollback helpers when exported. |

## Manifest Contract

| Field | Value |
| --- | --- |
| Package Name | `@plugins/jobs-core` |
| Manifest ID | `jobs-core` |
| Display Name | Jobs Core |
| Version | `0.1.0` |
| Kind | `app` |
| Trust Tier | `first-party` |
| Review Tier | `R1` |
| Isolation Profile | `same-process-trusted` |
| Framework Compatibility | ^0.1.0 |
| Runtime Compatibility | bun>=1.3.12 |
| Database Compatibility | postgres, sqlite |

## Dependency Graph And Capability Requests

| Field | Value |
| --- | --- |
| Depends On | `auth-core`, `org-tenant-core`, `role-policy-core`, `audit-core` |
| Requested Capabilities | `ui.register.admin`, `api.rest.mount`, `data.write.jobs` |
| Provides Capabilities | `jobs.executions` |
| Owns Data | `jobs.executions` |

### Dependency interpretation

- Direct plugin dependencies describe package-level coupling that must already be present in the host graph.
- Requested capabilities tell the host what platform services or sibling plugins this package expects to find.
- Provided capabilities and owned data tell integrators what this package is authoritative for.

## Public Integration Surfaces

| Type | ID / Symbol | Access / Mode | Notes |
| --- | --- | --- | --- |
| Action | `jobs.executions.schedule` | Permission: `jobs.executions.schedule` | Idempotent<br>Audited |
| Resource | `jobs.executions` | Portal disabled | Admin auto-CRUD enabled<br>Fields: `concurrency`, `createdAt`, `jobKey`, `queue`, `retries`, `status`, `visibleAt` |

### Job Catalog

| Job | Queue | Retry | Timeout |
| --- | --- | --- | --- |
| `crm.sync-segments` | `crm-sync` | Retry policy not declared | No timeout declared |
| `files.scan-uploads` | `files-security` | Retry policy not declared | No timeout declared |
| `notifications.dispatch` | `notifications` | Retry policy not declared | No timeout declared |




### UI Surface Summary

| Surface | Present | Notes |
| --- | --- | --- |
| UI Surface | Yes | A bounded UI surface export is present. |
| Admin Contributions | No | Only the baseline surface is exported. |
| Zone/Canvas Extension | No | No dedicated zone extension export. |

## Hooks, Events, And Orchestration

This plugin should be integrated through **explicit commands/actions, resources, jobs, workflows, and the surrounding Gutu event runtime**. It must **not** be documented as a generic WordPress-style hook system unless such a hook API is explicitly exported.

- No standalone plugin-owned lifecycle event feed is exported today.
- Job surface: `crm.sync-segments`, `files.scan-uploads`, `notifications.dispatch`.
- No plugin-owned workflow catalog is exported today.
- Recommended composition pattern: invoke actions, read resources, then let the surrounding Gutu command/event/job runtime handle downstream automation.

## Storage, Schema, And Migration Notes

- Database compatibility: `postgres`, `sqlite`
- Schema file: `framework/builtin-plugins/jobs-core/db/schema.ts`
- SQL helper file: `framework/builtin-plugins/jobs-core/src/postgres.ts`
- Migration lane present: No

The plugin does not export a dedicated SQL helper module today. Treat the schema and resources as the durable contract instead of inventing undocumented SQL behavior.

## Failure Modes And Recovery

- Action inputs can fail schema validation or permission evaluation before any durable mutation happens.
- If downstream automation is needed, the host must add it explicitly instead of assuming this plugin emits jobs.
- There is no separate lifecycle-event feed to rely on today; do not build one implicitly from internal details.
- Schema-affecting changes need extra care because there is no dedicated migration lane yet.

## Mermaid Flows

### Primary Lifecycle

```mermaid
flowchart LR
  caller["Host or operator"] --> action["jobs.executions.schedule"]
  action --> validation["Schema + permission guard"]
  validation --> service["Jobs Core service layer"]
  service --> state["jobs.executions"]
  service --> jobs["Follow-up jobs / queue definitions"]
  state --> ui["UI surface"]
```



## Integration Recipes

### 1. Host wiring

```ts
import { manifest, scheduleJobExecutionAction, JobExecutionResource, jobDefinitions, uiSurface } from "@plugins/jobs-core";

export const pluginSurface = {
  manifest,
  scheduleJobExecutionAction,
  JobExecutionResource,
  jobDefinitions,
  
  
  uiSurface
};
```

Use this pattern when your host needs to register the plugin’s declared exports without reaching into internal file paths.

### 2. Action-first orchestration

```ts
import { manifest, scheduleJobExecutionAction } from "@plugins/jobs-core";

console.log("plugin", manifest.id);
console.log("action", scheduleJobExecutionAction.id);
```

- Prefer action IDs as the stable integration boundary.
- Respect the declared permission, idempotency, and audit metadata instead of bypassing the service layer.
- Treat resource IDs as the read-model boundary for downstream consumers.

### 3. Cross-plugin composition

- Treat actions as the write boundary and jobs as the asynchronous follow-up boundary.
- Use the exported job definitions or returned job envelopes instead of inventing hidden background work.
- Keep retries and queue semantics outside the plugin only when the plugin does not already export them.

## Test Matrix

| Lane | Present | Evidence |
| --- | --- | --- |
| Build | Yes | `bun run build` |
| Typecheck | Yes | `bun run typecheck` |
| Lint | Yes | `bun run lint` |
| Test | Yes | `bun run test` |
| Unit | Yes | 1 file(s) |
| Contracts | Yes | 1 file(s) |
| Integration | No | No integration files found |
| Migrations | No | No migration files found |

### Verification commands

- `bun run build`
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run test:contracts`
- `bun run test:unit`
- `bun run docs:check`

## Current Truth And Recommended Next

### Current truth

- Exports 1 governed action: `jobs.executions.schedule`.
- Owns 1 resource contract: `jobs.executions`.
- Publishes 3 job definitions with explicit queue and retry policy metadata.
- Registers a bounded UI surface that can be hosted by the surrounding admin or portal shell.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.

### Current gaps

- No dedicated integration test lane is exported in this repo today; validation currently leans on build, lint, typecheck, and test lanes.
- The plugin owns durable data state, but it does not yet ship a dedicated migration verification lane in this repo.
- The plugin exposes a UI surface, but not a richer admin workspace contribution module.

### Recommended next

- Add stronger worker-runtime integration guidance and operational troubleshooting as more plugins dispatch background jobs.
- Expose more lifecycle telemetry once execution state becomes a first-class operator concern.
- Add stronger operator-facing reconciliation and observability surfaces where runtime state matters.
- Promote any currently implicit cross-plugin lifecycles into explicit command, event, or job contracts when those integrations stabilize.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Add explicit migration or rollback coverage if this domain becomes more operationally sensitive.
- Broaden the admin entry surface only if operators need more than the current embedded view or resource listing.

### Later / optional

- Dedicated federation or external identity/provider adapters once the core contracts are stable.
