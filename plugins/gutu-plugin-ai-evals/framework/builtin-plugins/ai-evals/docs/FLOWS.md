# AI Evals Flows

## Happy paths

- `ai.evals.run`: Governed action exported by this plugin.
- `ai.evals.compare`: Governed action exported by this plugin.

## Action-level flows

### `ai.evals.run`

Governed action exported by this plugin.

Permission: `ai.evals.run`

Business purpose: Expose the plugin’s write boundary through a validated, auditable action contract.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s non-idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.eval-datasets`, `ai.eval-runs`.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


### `ai.evals.compare`

Governed action exported by this plugin.

Permission: `ai.evals.read`

Business purpose: Expose the plugin’s write boundary through a validated, auditable action contract.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.eval-datasets`, `ai.eval-runs`.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


## Cross-package interactions

- Direct dependencies: `ai-core`, `audit-core`, `jobs-core`
- Requested capabilities: `ui.register.admin`, `api.rest.mount`, `data.write.ai`, `jobs.execute.ai`
- Integration model: Actions+Resources+Jobs+UI
- Recovery ownership should stay with the host orchestration layer when the plugin does not explicitly export jobs, workflows, or lifecycle events.
