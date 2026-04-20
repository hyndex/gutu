# AI RAG

Tenant-safe memory collections, retrieval diagnostics, and grounded knowledge pipelines.

![Maturity: Baseline](https://img.shields.io/badge/Maturity-Baseline-7c3aed) ![Verification: Build+Typecheck+Lint+Test+Contracts](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest%2BContracts-6b7280) ![DB: postgres+sqlite](https://img.shields.io/badge/DB-postgres%2Bsqlite-2563eb) ![Integration Model: Actions+Resources+Jobs+UI](https://img.shields.io/badge/Integration%20Model-Actions%2BResources%2BJobs%2BUI-2563eb)

## What It Does Now

Provides tenant-safe retrieval, memory collection management, and the evidence path for grounded AI responses.

- Exports 3 governed actions: `ai.memory.ingest`, `ai.memory.retrieve`, `ai.memory.reindex`.
- Owns 2 resource contracts: `ai.memory-collections`, `ai.memory-documents`.
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
| Package | `@plugins/ai-rag` |
| Manifest ID | `ai-rag` |
| Repo | [gutu-plugin-ai-rag](https://github.com/gutula/gutu-plugin-ai-rag) |
| Depends On | `ai-core`, `knowledge-core`, `jobs-core` |
| Requested Capabilities | `ui.register.admin`, `api.rest.mount`, `data.write.ai`, `jobs.execute.ai`, `ai.tool.execute` |
| Provided Capabilities | `ai.memory`, `ai.retrieval` |
| Runtime | bun>=1.3.12 |
| Database | postgres, sqlite |
| Integration Model | Actions+Resources+Jobs+UI |

## Capability Matrix

| Surface | Count | Details |
| --- | --- | --- |
| Actions | 3 | `ai.memory.ingest`, `ai.memory.retrieve`, `ai.memory.reindex` |
| Resources | 2 | `ai.memory-collections`, `ai.memory-documents` |
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
import { manifest, ingestMemoryDocumentAction, MemoryCollectionResource, adminContributions, uiSurface } from "@plugins/ai-rag";

console.log(manifest.id);
console.log(ingestMemoryDocumentAction.id);
console.log(MemoryCollectionResource.id);
```

Use the root repo scripts for day-to-day work **after the workspace is bootstrapped**, or run the nested package directly from `framework/builtin-plugins/ai-rag` if you need lower-level control.

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

- Add more ingestion and connector breadth only after the current retrieval contracts remain stable under production load.
- Deepen operator visibility into collection freshness, ingestion failures, and retrieval quality.
- Add deeper provider, persistence, or evaluation integrations only where the shipped control-plane contracts already prove stable.
- Expand operator diagnostics and release gating where the current lifecycle already exposes strong evidence paths.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Add explicit migration or rollback coverage if this domain becomes more operationally sensitive.
- Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.

## More Docs

See [DEVELOPER.md](./DEVELOPER.md), [TODO.md](./TODO.md), [SECURITY.md](./SECURITY.md), [CONTRIBUTING.md](./CONTRIBUTING.md). The internal domain sources used to build those docs live under:

- `plugins/gutu-plugin-ai-rag/framework/builtin-plugins/ai-rag/docs/AGENT_CONTEXT.md`
- `plugins/gutu-plugin-ai-rag/framework/builtin-plugins/ai-rag/docs/BUSINESS_RULES.md`
- `plugins/gutu-plugin-ai-rag/framework/builtin-plugins/ai-rag/docs/EDGE_CASES.md`
- `plugins/gutu-plugin-ai-rag/framework/builtin-plugins/ai-rag/docs/FLOWS.md`
- `plugins/gutu-plugin-ai-rag/framework/builtin-plugins/ai-rag/docs/GLOSSARY.md`
- `plugins/gutu-plugin-ai-rag/framework/builtin-plugins/ai-rag/docs/MANDATORY_STEPS.md`
