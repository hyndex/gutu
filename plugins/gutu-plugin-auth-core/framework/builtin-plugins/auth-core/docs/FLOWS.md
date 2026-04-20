# Auth Core Flows

## Happy paths

- `auth.identities.provision`: Governed action exported by this plugin.

## Action-level flows

### `auth.identities.provision`

Governed action exported by this plugin.

Permission: `auth.identities.provision`

Business purpose: Expose the plugin’s write boundary through a validated, auditable action contract.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `auth.identities`.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


## Cross-package interactions

- Direct dependencies: none
- Requested capabilities: `ui.register.admin`, `api.rest.mount`, `data.write.auth`
- Integration model: Actions+Resources+UI
- Recovery ownership should stay with the host orchestration layer when the plugin does not explicitly export jobs, workflows, or lifecycle events.
