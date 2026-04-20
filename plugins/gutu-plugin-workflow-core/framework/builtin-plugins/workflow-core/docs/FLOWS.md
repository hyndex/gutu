# Workflow Core Flows

## Happy paths

- `workflow.instances.transition`: Apply a governed transition to a workflow instance.

## Action-level flows

### `workflow.instances.transition`

Apply a governed transition to a workflow instance.

Permission: `workflow.instances.transition`

Business purpose: Move workflows forward in a safe, auditable way while preserving approval and notification side effects.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `workflow.instances`.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


## Cross-package interactions

- Direct dependencies: `auth-core`, `org-tenant-core`, `role-policy-core`, `audit-core`
- Requested capabilities: `ui.register.admin`, `api.rest.mount`, `data.write.workflow`
- Integration model: Actions+Resources+Workflows+UI
- Recovery ownership should stay with the host orchestration layer when the plugin does not explicitly export jobs, workflows, or lifecycle events.
