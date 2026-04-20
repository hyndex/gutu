# Booking Core Flows

## Happy paths

_No workflows were discovered for this target._

## Action-level flows

### `booking.reservations.cancel`

Cancel a staged or confirmed reservation and release the resource window.

Permission: `booking.reservations.cancel`

Business purpose: Free a previously allocated slot while leaving an auditable trail for operators and customers.

Preconditions:
- _Document the checks that must pass before this action runs._

Side effects:
- _Document emitted events, writes, notifications, and follow-up jobs._

Forbidden shortcuts:
- _Document any paths agents must never bypass._

### `booking.reservations.confirm`

Confirm a held or draft reservation after review has completed.

Permission: `booking.reservations.confirm`

Business purpose: Finalize a reservation without leaving transient hold metadata behind.

Preconditions:
- _Document the checks that must pass before this action runs._

Side effects:
- _Document emitted events, writes, notifications, and follow-up jobs._

Forbidden shortcuts:
- _Document any paths agents must never bypass._

### `booking.reservations.stage`

Stage a booking reservation as a held or confirmed allocation window.

Permission: `booking.reservations.stage`

Business purpose: Create the canonical reservation record before downstream notifications, approvals, or portal views.

Preconditions:
- A tenant, actor, resource, and slot window must be supplied.
- The booking writer must provide a stable idempotency key for retries.

Side effects:
- Produces a canonical reservation record for database persistence.

Forbidden shortcuts:
- Do not auto-confirm approval-required reservations.
- Do not create reservations without a canonical idempotency key.

## Cross-package interactions

- Describe upstream triggers, downstream side effects, notifications, and jobs.
- Document when this target depends on auth, approvals, billing, or data freshness from another package.
- Document how failures recover and who owns reconciliation.