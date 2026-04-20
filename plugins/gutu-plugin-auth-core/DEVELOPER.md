# Auth Core Developer Guide

Canonical identity and session backbone.

**Maturity Tier:** `Baseline`

## Purpose And Architecture Role

Owns canonical identity provisioning and status state so the rest of the ecosystem can treat identity as a stable domain contract.

### This plugin is the right fit when

- You need **identity provisioning**, **provider state**, **tenant-safe identities** as a governed domain boundary.
- You want to integrate through declared actions, resources, jobs, workflows, and UI surfaces instead of implicit side effects.
- You need the host application to keep plugin boundaries honest through manifest capabilities, permissions, and verification lanes.

### This plugin is intentionally not

- Not a generic WordPress-style hook bus or plugin macro system.
- Not a product-specific UX suite beyond the exported admin or portal surfaces that ship today.
- Not a full end-user authentication UI or recovery experience.
- Does not currently export a wide session-management or MFA API surface beyond the identity contract.

## Repo Map

| Path | Purpose |
| --- | --- |
| `package.json` | Root extracted-repo manifest, workspace wiring, and repo-level script entrypoints. |
| `framework/builtin-plugins/auth-core` | Nested publishable plugin package. |
| `framework/builtin-plugins/auth-core/src` | Runtime source, actions, resources, services, and UI exports. |
| `framework/builtin-plugins/auth-core/tests` | Unit, contract, integration, and migration coverage where present. |
| `framework/builtin-plugins/auth-core/docs` | Internal domain-doc source set kept in sync with this guide. |
| `framework/builtin-plugins/auth-core/db/schema.ts` | Database schema contract when durable state is owned. |
| `framework/builtin-plugins/auth-core/src/postgres.ts` | SQL migration and rollback helpers when exported. |

## Manifest Contract

| Field | Value |
| --- | --- |
| Package Name | `@plugins/auth-core` |
| Manifest ID | `auth-core` |
| Display Name | Auth Core |
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
| Depends On | None |
| Requested Capabilities | `ui.register.admin`, `api.rest.mount`, `data.write.auth` |
| Provides Capabilities | `auth.identities` |
| Owns Data | `auth.identities` |

### Dependency interpretation

- Direct plugin dependencies describe package-level coupling that must already be present in the host graph.
- Requested capabilities tell the host what platform services or sibling plugins this package expects to find.
- Provided capabilities and owned data tell integrators what this package is authoritative for.

## Public Integration Surfaces

| Type | ID / Symbol | Access / Mode | Notes |
| --- | --- | --- | --- |
| Action | `auth.identities.provision` | Permission: `auth.identities.provision` | Idempotent<br>Audited |
| Resource | `auth.identities` | Portal disabled | Admin auto-CRUD enabled<br>Fields: `email`, `displayName`, `authProvider`, `status`, `createdAt` |





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
- Schema file: `framework/builtin-plugins/auth-core/db/schema.ts`
- SQL helper file: `framework/builtin-plugins/auth-core/src/postgres.ts`
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
  caller["Host or operator"] --> action["auth.identities.provision"]
  action --> validation["Schema + permission guard"]
  validation --> service["Auth Core service layer"]
  service --> state["auth.identities"]
  state --> ui["UI surface"]
```



## Integration Recipes

### 1. Host wiring

```ts
import { manifest, provisionIdentityAction, IdentityResource, uiSurface } from "@plugins/auth-core";

export const pluginSurface = {
  manifest,
  provisionIdentityAction,
  IdentityResource,
  
  
  
  uiSurface
};
```

Use this pattern when your host needs to register the plugin’s declared exports without reaching into internal file paths.

### 2. Action-first orchestration

```ts
import { manifest, provisionIdentityAction } from "@plugins/auth-core";

console.log("plugin", manifest.id);
console.log("action", provisionIdentityAction.id);
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

- Exports 1 governed action: `auth.identities.provision`.
- Owns 1 resource contract: `auth.identities`.
- Registers a bounded UI surface that can be hosted by the surrounding admin or portal shell.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.

### Current gaps

- No dedicated integration test lane is exported in this repo today; validation currently leans on build, lint, typecheck, and test lanes.
- The plugin owns durable data state, but it does not yet ship a dedicated migration verification lane in this repo.
- No standalone plugin-owned event, job, or workflow catalog is exported yet; compose it through actions, resources, and the surrounding Gutu runtime.
- The plugin exposes a UI surface, but not a richer admin workspace contribution module.

### Recommended next

- Expand session, revocation, and provider-lifecycle surfaces if the surrounding platform needs them.
- Add explicit identity lifecycle events when downstream provisioning flows depend on them.
- Add stronger operator-facing reconciliation and observability surfaces where runtime state matters.
- Promote any currently implicit cross-plugin lifecycles into explicit command, event, or job contracts when those integrations stabilize.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Add explicit migration or rollback coverage if this domain becomes more operationally sensitive.
- Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.
- Broaden the admin entry surface only if operators need more than the current embedded view or resource listing.

### Later / optional

- Dedicated federation or external identity/provider adapters once the core contracts are stable.
