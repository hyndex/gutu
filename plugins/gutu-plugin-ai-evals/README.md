# AI Evals

Eval datasets, judges, regression baselines, and release-grade AI review.

![Maturity: Baseline](https://img.shields.io/badge/Maturity-Baseline-7c3aed) ![Verification: Build+Typecheck+Lint+Test+Contracts](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest%2BContracts-6b7280) ![DB: postgres+sqlite](https://img.shields.io/badge/DB-postgres%2Bsqlite-2563eb) ![Integration Model: Actions+Resources+Jobs+UI](https://img.shields.io/badge/Integration%20Model-Actions%2BResources%2BJobs%2BUI-2563eb)

## What It Does Now

Owns evaluation datasets, judges, regression baselines, and the release-review evidence used to keep AI changes honest.

- Exports 2 governed actions: `ai.evals.run`, `ai.evals.compare`.
- Owns 2 resource contracts: `ai.eval-datasets`, `ai.eval-runs`.
- Adds richer admin workspace contributions on top of the base UI surface.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.

## Maturity

**Maturity Tier:** `Baseline`

This tier is justified because unit coverage exists, and contract coverage exists.

## Verified Capability Summary

- Group: **AI Systems**
- Verification surface: **Build+Typecheck+Lint+Test+Contracts**
- Tests discovered: **3** total files across unit, contract lanes
- Integration model: **Actions+Resources+Jobs+UI**
- Database support: **postgres + sqlite**

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package | `@plugins/ai-evals` |
| Manifest ID | `ai-evals` |
| Repo | [gutu-plugin-ai-evals](https://github.com/gutula/gutu-plugin-ai-evals) |
| Depends On | `ai-core`, `audit-core`, `jobs-core` |
| Requested Capabilities | `ui.register.admin`, `api.rest.mount`, `data.write.ai`, `jobs.execute.ai` |
| Provided Capabilities | `ai.evals`, `ai.release-gates` |
| Runtime | bun>=1.3.12 |
| Database | postgres, sqlite |
| Integration Model | Actions+Resources+Jobs+UI |

## Capability Matrix

| Surface | Count | Details |
| --- | --- | --- |
| Actions | 2 | `ai.evals.run`, `ai.evals.compare` |
| Resources | 2 | `ai.eval-datasets`, `ai.eval-runs` |
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
import { manifest, runEvalDatasetAction, EvalDatasetResource, adminContributions, uiSurface } from "@plugins/ai-evals";

console.log(manifest.id);
console.log(runEvalDatasetAction.id);
console.log(EvalDatasetResource.id);
```

Use the root repo scripts for day-to-day work **after the workspace is bootstrapped**, or run the nested package directly from `framework/builtin-plugins/ai-evals` if you need lower-level control.

## Current Test Coverage

- Root verification scripts: `bun run build`, `bun run typecheck`, `bun run lint`, `bun run test`, `bun run test:contracts`, `bun run test:unit`, `bun run docs:check`
- Unit files: 2
- Contracts files: 1
- Integration files: 0
- Migrations files: 0

## Known Boundaries And Non-Goals

- Not an everything-and-the-kitchen-sink provider abstraction layer.
- Not a substitute for explicit approval, budgeting, and audit governance in the surrounding platform.
- Cross-plugin composition should use Gutu command, event, job, and workflow primitives. This repo should not be documented as exposing a generic WordPress-style hook system unless one is explicitly exported.

## Recommended Next Milestones

- Wire the current evaluation evidence into more release and rollout control points.
- Add richer judge provenance and dataset lineage as the eval corpus grows.
- Add deeper provider, persistence, or evaluation integrations only where the shipped control-plane contracts already prove stable.
- Expand operator diagnostics and release gating where the current lifecycle already exposes strong evidence paths.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Add explicit migration or rollback coverage if this domain becomes more operationally sensitive.
- Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.

## More Docs

See [DEVELOPER.md](./DEVELOPER.md), [TODO.md](./TODO.md), [SECURITY.md](./SECURITY.md), [CONTRIBUTING.md](./CONTRIBUTING.md). The internal domain sources used to build those docs live under:

- `plugins/gutu-plugin-ai-evals/framework/builtin-plugins/ai-evals/docs/AGENT_CONTEXT.md`
- `plugins/gutu-plugin-ai-evals/framework/builtin-plugins/ai-evals/docs/BUSINESS_RULES.md`
- `plugins/gutu-plugin-ai-evals/framework/builtin-plugins/ai-evals/docs/EDGE_CASES.md`
- `plugins/gutu-plugin-ai-evals/framework/builtin-plugins/ai-evals/docs/FLOWS.md`
- `plugins/gutu-plugin-ai-evals/framework/builtin-plugins/ai-evals/docs/GLOSSARY.md`
- `plugins/gutu-plugin-ai-evals/framework/builtin-plugins/ai-evals/docs/MANDATORY_STEPS.md`
