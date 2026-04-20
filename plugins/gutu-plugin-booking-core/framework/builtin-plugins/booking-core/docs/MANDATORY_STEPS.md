# Booking Core Mandatory Steps

## Never skip

- Only draft, held, or confirmed reservations may be cancelled.
- Cancellation must record the operator and reason.
- Only draft or held reservations may be confirmed.
- Confirmation must record the operator and reason.
- Validate the slot window before creating a held or confirmed reservation.
- Pin the reservation record to a single canonical resource writer.

## Human approvals and checkpoints

- Document when approvals are required, who can grant them, and what evidence must be present.

## Observability and audit

- Document the records, events, or notifications that must exist after each sensitive step.

## Agent operating notes

- Agents may recommend actions, but they must follow the same mandatory steps and approval gates as humans.
- Agents must never invent missing business facts; they should ask for clarification or cite the knowledge source.