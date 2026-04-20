# AI RAG TODO

**Maturity Tier:** `Baseline`

## Shipped Now

- Exports 3 governed actions: `ai.memory.ingest`, `ai.memory.retrieve`, `ai.memory.reindex`.
- Owns 2 resource contracts: `ai.memory-collections`, `ai.memory-documents`.
- Adds richer admin workspace contributions on top of the base UI surface.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.

## Current Gaps

- No dedicated integration test lane is exported in this repo today; validation currently leans on build, lint, typecheck, and test lanes.
- The plugin owns durable data state, but it does not yet ship a dedicated migration verification lane in this repo.
- No standalone plugin-owned event, job, or workflow catalog is exported yet; compose it through actions, resources, and the surrounding Gutu runtime.

## Recommended Next

- Add more ingestion and connector breadth only after the current retrieval contracts remain stable under production load.
- Deepen operator visibility into collection freshness, ingestion failures, and retrieval quality.
- Add deeper provider, persistence, or evaluation integrations only where the shipped control-plane contracts already prove stable.
- Expand operator diagnostics and release gating where the current lifecycle already exposes strong evidence paths.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Add explicit migration or rollback coverage if this domain becomes more operationally sensitive.
- Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.

## Later / Optional

- Hybrid search, reranking, and external-connector packs once the baseline retrieval pipeline stabilizes.
- More connector breadth, richer evaluation libraries, and domain-specific copilots after the baseline contracts settle.
