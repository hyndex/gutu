# AI Evals Developer Guide

Eval datasets, judges, regression baselines, and release-grade AI review.

**Maturity Tier:** `Baseline`

## Purpose And Architecture Role

Owns evaluation datasets, judges, regression baselines, and the release-review evidence used to keep AI changes honest.

### This plugin is the right fit when

- You need **eval datasets**, **release gating**, **baseline regression review** as a governed domain boundary.
- You want to integrate through declared actions, resources, jobs, workflows, and UI surfaces instead of implicit side effects.
- You need the host application to keep plugin boundaries honest through manifest capabilities, permissions, and verification lanes.

### This plugin is intentionally not

- Not an everything-and-the-kitchen-sink provider abstraction layer.
- Not a substitute for explicit approval, budgeting, and audit governance in the surrounding platform.

## Repo Map

| Path | Purpose |
| --- | --- |
| `package.json` | Root extracted-repo manifest, workspace wiring, and repo-level script entrypoints. |
| `framework/builtin-plugins/ai-evals` | Nested publishable plugin package. |
| `framework/builtin-plugins/ai-evals/src` | Runtime source, actions, resources, services, and UI exports. |
| `framework/builtin-plugins/ai-evals/tests` | Unit, contract, integration, and migration coverage where present. |
| `framework/builtin-plugins/ai-evals/docs` | Internal domain-doc source set kept in sync with this guide. |
| `framework/builtin-plugins/ai-evals/db/schema.ts` | Database schema contract when durable state is owned. |
| `framework/builtin-plugins/ai-evals/src/postgres.ts` | SQL migration and rollback helpers when exported. |

## Manifest Contract

| Field | Value |
| --- | --- |
| Package Name | `@plugins/ai-evals` |
| Manifest ID | `ai-evals` |
| Display Name | AI Evals |
| Version | `0.1.0` |
| Kind | `ai-pack` |
| Trust Tier | `first-party` |
| Review Tier | `R1` |
| Isolation Profile | `same-process-trusted` |
| Framework Compatibility | ^0.1.0 |
| Runtime Compatibility | bun>=1.3.12 |
| Database Compatibility | postgres, sqlite |

## Dependency Graph And Capability Requests

| Field | Value |
| --- | --- |
| Depends On | `ai-core`, `audit-core`, `jobs-core` |
| Requested Capabilities | `ui.register.admin`, `api.rest.mount`, `data.write.ai`, `jobs.execute.ai` |
| Provides Capabilities | `ai.evals`, `ai.release-gates` |
| Owns Data | `ai.eval-datasets`, `ai.eval-runs` |

### Dependency interpretation

- Direct plugin dependencies describe package-level coupling that must already be present in the host graph.
- Requested capabilities tell the host what platform services or sibling plugins this package expects to find.
- Provided capabilities and owned data tell integrators what this package is authoritative for.

## Public Integration Surfaces

| Type | ID / Symbol | Access / Mode | Notes |
| --- | --- | --- | --- |
| Action | `ai.evals.run` | Permission: `ai.evals.run` | Non-idempotent<br>Audited |
| Action | `ai.evals.compare` | Permission: `ai.evals.read` | Idempotent |
| Resource | `ai.eval-datasets` | Portal disabled | Admin auto-CRUD enabled<br>Fields: `label`, `caseCount`, `updatedAt` |
| Resource | `ai.eval-runs` | Portal disabled | Admin auto-CRUD enabled<br>Fields: `datasetId`, `status`, `passRate`, `averageScore`, `completedAt` |





### UI Surface Summary

| Surface | Present | Notes |
| --- | --- | --- |
| UI Surface | Yes | A bounded UI surface export is present. |
| Admin Contributions | Yes | Additional admin workspace contributions are exported. |
| Zone/Canvas Extension | No | No dedicated zone extension export. |

## Hooks, Events, And Orchestration

This plugin should be integrated through **explicit commands/actions, resources, jobs, workflows, and the surrounding Gutu event runtime**. It must **not** be documented as a generic WordPress-style hook system unless such a hook API is explicitly exported.

- No standalone plugin-owned lifecycle event feed is exported today.
- No plugin-owned job catalog is exported today.
- No plugin-owned workflow catalog is exported today.
- Recommended composition pattern: invoke actions, read resources, then let the surrounding Gutu command/event/job runtime handle downstream automation.

## Storage, Schema, And Migration Notes

- Database compatibility: `postgres`, `sqlite`
- Schema file: `framework/builtin-plugins/ai-evals/db/schema.ts`
- SQL helper file: `framework/builtin-plugins/ai-evals/src/postgres.ts`
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
  caller["Host or operator"] --> action["ai.evals.run"]
  action --> validation["Schema + permission guard"]
  validation --> service["AI Evals service layer"]
  service --> state["ai.eval-datasets"]
  state --> ui["Admin contributions"]
```



## Integration Recipes

### 1. Host wiring

```ts
import { manifest, runEvalDatasetAction, EvalDatasetResource, adminContributions, uiSurface } from "@plugins/ai-evals";

export const pluginSurface = {
  manifest,
  runEvalDatasetAction,
  EvalDatasetResource,
  
  
  adminContributions,
  uiSurface
};
```

Use this pattern when your host needs to register the plugin’s declared exports without reaching into internal file paths.

### 2. Action-first orchestration

```ts
import { manifest, runEvalDatasetAction } from "@plugins/ai-evals";

console.log("plugin", manifest.id);
console.log("action", runEvalDatasetAction.id);
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
| Unit | Yes | 2 file(s) |
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

- Exports 2 governed actions: `ai.evals.run`, `ai.evals.compare`.
- Owns 2 resource contracts: `ai.eval-datasets`, `ai.eval-runs`.
- Adds richer admin workspace contributions on top of the base UI surface.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.

### Current gaps

- No dedicated integration test lane is exported in this repo today; validation currently leans on build, lint, typecheck, and test lanes.
- The plugin owns durable data state, but it does not yet ship a dedicated migration verification lane in this repo.
- No standalone plugin-owned event, job, or workflow catalog is exported yet; compose it through actions, resources, and the surrounding Gutu runtime.

### Recommended next

- Wire the current evaluation evidence into more release and rollout control points.
- Add richer judge provenance and dataset lineage as the eval corpus grows.
- Add deeper provider, persistence, or evaluation integrations only where the shipped control-plane contracts already prove stable.
- Expand operator diagnostics and release gating where the current lifecycle already exposes strong evidence paths.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Add explicit migration or rollback coverage if this domain becomes more operationally sensitive.
- Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.

### Later / optional

- Domain-specific judge packs and cross-environment benchmark promotion.
- More connector breadth, richer evaluation libraries, and domain-specific copilots after the baseline contracts settle.
