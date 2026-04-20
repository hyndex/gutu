# AI RAG Flows

## Happy paths

- `ai.memory.ingest`: Governed action exported by this plugin.
- `ai.memory.retrieve`: Governed action exported by this plugin.
- `ai.memory.reindex`: Governed action exported by this plugin.

## Action-level flows

### `ai.memory.ingest`

Governed action exported by this plugin.

Permission: `ai.memory.ingest`

Business purpose: Expose the plugin’s write boundary through a validated, auditable action contract.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.memory-collections`, `ai.memory-documents`.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


### `ai.memory.retrieve`

Governed action exported by this plugin.

Permission: `ai.memory.read`

Business purpose: Expose the plugin’s write boundary through a validated, auditable action contract.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.memory-collections`, `ai.memory-documents`.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


### `ai.memory.reindex`

Governed action exported by this plugin.

Permission: `ai.memory.reindex`

Business purpose: Expose the plugin’s write boundary through a validated, auditable action contract.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.memory-collections`, `ai.memory-documents`.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


## Cross-package interactions

- Direct dependencies: `ai-core`, `knowledge-core`, `jobs-core`
- Requested capabilities: `ui.register.admin`, `api.rest.mount`, `data.write.ai`, `jobs.execute.ai`, `ai.tool.execute`
- Integration model: Actions+Resources+Jobs+UI
- Recovery ownership should stay with the host orchestration layer when the plugin does not explicitly export jobs, workflows, or lifecycle events.
