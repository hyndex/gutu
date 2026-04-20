# Admin Shell Workbench Developer Guide

Default universal admin desk plugin.

**Maturity Tier:** `Baseline`

## Purpose And Architecture Role

Hosts the universal admin desk and turns resource, route, widget, and workspace contributions into one navigable operator surface.

### This plugin is the right fit when

- You need **admin workspaces**, **route resolution**, **operator preferences** as a governed domain boundary.
- You want to integrate through declared actions, resources, jobs, workflows, and UI surfaces instead of implicit side effects.
- You need the host application to keep plugin boundaries honest through manifest capabilities, permissions, and verification lanes.

### This plugin is intentionally not

- Not a generic WordPress-style hook bus or plugin macro system.
- Not a product-specific UX suite beyond the exported admin or portal surfaces that ship today.

## Repo Map

| Path | Purpose |
| --- | --- |
| `package.json` | Root extracted-repo manifest, workspace wiring, and repo-level script entrypoints. |
| `framework/builtin-plugins/admin-shell-workbench` | Nested publishable plugin package. |
| `framework/builtin-plugins/admin-shell-workbench/src` | Runtime source, actions, resources, services, and UI exports. |
| `framework/builtin-plugins/admin-shell-workbench/tests` | Unit, contract, integration, and migration coverage where present. |
| `framework/builtin-plugins/admin-shell-workbench/docs` | Internal domain-doc source set kept in sync with this guide. |
| `framework/builtin-plugins/admin-shell-workbench/db/schema.ts` | Database schema contract when durable state is owned. |
| `framework/builtin-plugins/admin-shell-workbench/src/postgres.ts` | SQL migration and rollback helpers when exported. |

## Manifest Contract

| Field | Value |
| --- | --- |
| Package Name | `@plugins/admin-shell-workbench` |
| Manifest ID | `admin-shell-workbench` |
| Display Name | Admin Shell Workbench |
| Version | `0.1.0` |
| Kind | `ui-surface` |
| Trust Tier | `first-party` |
| Review Tier | `R1` |
| Isolation Profile | `same-process-trusted` |
| Framework Compatibility | ^0.1.0 |
| Runtime Compatibility | bun>=1.3.12 |
| Database Compatibility | postgres, sqlite |

## Dependency Graph And Capability Requests

| Field | Value |
| --- | --- |
| Depends On | `auth-core`, `org-tenant-core`, `role-policy-core`, `dashboard-core` |
| Requested Capabilities | `ui.mount:admin`, `data.read.settings` |
| Provides Capabilities | `ui.shell.admin`, `ui.admin.widgets`, `ui.admin.pages`, `ui.admin.reports`, `ui.admin.builders` |
| Owns Data | None |

### Dependency interpretation

- Direct plugin dependencies describe package-level coupling that must already be present in the host graph.
- Requested capabilities tell the host what platform services or sibling plugins this package expects to find.
- Provided capabilities and owned data tell integrators what this package is authoritative for.

## Public Integration Surfaces

| Type | ID / Symbol | Access / Mode | Notes |
| --- | --- | --- | --- |
| - | - | - |





### UI Surface Summary

| Surface | Present | Notes |
| --- | --- | --- |
| UI Surface | Yes | A bounded UI surface export is present. |
| Admin Contributions | No | Only the baseline surface is exported. |
| Zone/Canvas Extension | No | No dedicated zone extension export. |

## Hooks, Events, And Orchestration

This plugin should be integrated through **explicit commands/actions, resources, jobs, workflows, and the surrounding Gutu event runtime**. It must **not** be documented as a generic WordPress-style hook system unless such a hook API is explicitly exported.

- No standalone plugin-owned lifecycle event feed is exported today.
- No plugin-owned job catalog is exported today.
- No plugin-owned workflow catalog is exported today.
- Recommended composition pattern: invoke actions, read resources, then let the surrounding Gutu command/event/job runtime handle downstream automation.

## Storage, Schema, And Migration Notes

- Database compatibility: `postgres`, `sqlite`
- Schema file: `framework/builtin-plugins/admin-shell-workbench/db/schema.ts`
- SQL helper file: `framework/builtin-plugins/admin-shell-workbench/src/postgres.ts`
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
  caller["Host or operator"] --> action["admin-shell-workbench"]
  action --> validation["Schema + permission guard"]
  validation --> service["Admin Shell Workbench service layer"]
  service --> state["domain state"]
  state --> ui["UI surface"]
```



## Integration Recipes

### 1. Host wiring

```ts
import { manifest, uiSurface } from "@plugins/admin-shell-workbench";

export const pluginSurface = {
  manifest,
  
  
  
  
  
  uiSurface
};
```

Use this pattern when your host needs to register the plugin’s declared exports without reaching into internal file paths.

### 2. Action-first orchestration

```ts
import { manifest } from "@plugins/admin-shell-workbench";

console.log("plugin", manifest.id);
// No action export is currently published by this plugin.
```

- Prefer action IDs as the stable integration boundary.
- Respect the declared permission, idempotency, and audit metadata instead of bypassing the service layer.
- Treat resource IDs as the read-model boundary for downstream consumers.

### 3. Cross-plugin composition

- Compose this plugin through action invocations and resource reads.
- If downstream automation becomes necessary, add it in the surrounding Gutu command/event/job runtime instead of assuming this plugin already exports a hook surface.

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

- Registers a bounded UI surface that can be hosted by the surrounding admin or portal shell.

### Current gaps

- No dedicated integration test lane is exported in this repo today; validation currently leans on build, lint, typecheck, and test lanes.
- No standalone plugin-owned event, job, or workflow catalog is exported yet; compose it through actions, resources, and the surrounding Gutu runtime.
- The plugin exposes a UI surface, but not a richer admin workspace contribution module.

### Recommended next

- Deepen saved-workspace, search, and operator personalization flows once more first-party plugins depend on the desk.
- Add stronger runtime diagnostics around missing or conflicting admin contributions.
- Add stronger operator-facing reconciliation and observability surfaces where runtime state matters.
- Promote any currently implicit cross-plugin lifecycles into explicit command, event, or job contracts when those integrations stabilize.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.
- Broaden the admin entry surface only if operators need more than the current embedded view or resource listing.

### Later / optional

- Workspace theming and tenant-aware desk presets once the contribution contracts stop moving.
- Dedicated federation or external identity/provider adapters once the core contracts are stable.
