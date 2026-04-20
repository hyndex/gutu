# Role Policy Core Flows

## Happy paths

- `roles.grants.assign`: Governed action exported by this plugin.

## Action-level flows

### `roles.grants.assign`

Governed action exported by this plugin.

Permission: `roles.grants.assign`

Business purpose: Expose the plugin’s write boundary through a validated, auditable action contract.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `roles.grants`.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


## Cross-package interactions

- Direct dependencies: `auth-core`, `org-tenant-core`
- Requested capabilities: `ui.register.admin`, `api.rest.mount`, `data.write.roles`
- Integration model: Actions+Resources+UI
- Recovery ownership should stay with the host orchestration layer when the plugin does not explicitly export jobs, workflows, or lifecycle events.
