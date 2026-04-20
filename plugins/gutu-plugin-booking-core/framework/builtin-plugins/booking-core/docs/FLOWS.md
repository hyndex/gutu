# Booking Core Flows

## Happy paths

- `booking.reservations.stage`: Stage a booking reservation as a held or confirmed allocation window.
- `booking.reservations.confirm`: Confirm a held or draft reservation after review has completed.
- `booking.reservations.cancel`: Cancel a staged or confirmed reservation and release the resource window.

## Action-level flows

### `booking.reservations.stage`

Stage a booking reservation as a held or confirmed allocation window.

Permission: `booking.reservations.stage`

Business purpose: Create the canonical reservation record before downstream notifications, approvals, or portal views.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `booking.reservations`.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


### `booking.reservations.confirm`

Confirm a held or draft reservation after review has completed.

Permission: `booking.reservations.confirm`

Business purpose: Finalize a reservation without leaving transient hold metadata behind.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `booking.reservations`.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


### `booking.reservations.cancel`

Cancel a staged or confirmed reservation and release the resource window.

Permission: `booking.reservations.cancel`

Business purpose: Free a previously allocated slot while leaving an auditable trail for operators and customers.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `booking.reservations`.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


## Cross-package interactions

- Direct dependencies: `auth-core`, `org-tenant-core`, `role-policy-core`, `audit-core`, `portal-core`
- Requested capabilities: `ui.register.admin`, `api.rest.mount`, `data.write.booking`
- Integration model: Actions+Resources+UI
- Recovery ownership should stay with the host orchestration layer when the plugin does not explicitly export jobs, workflows, or lifecycle events.
