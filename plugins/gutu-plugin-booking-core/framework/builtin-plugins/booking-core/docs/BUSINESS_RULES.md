# Booking Core Business Rules

## Invariants

- Only one active reservation may own a tenant/resource/time window at a time.
- Held reservations must either confirm, cancel, or expire into a released state.

## Lifecycle notes

- Reservations begin as draft, held, or confirmed based on the booking path.
- Cancelled and released records are retained for auditability and analytics.

## Actor expectations

- operator
- portal-member
- scheduler

## Decision boundaries

- Document which decisions are automated, which are recommendation-only, and which always require a human or approval checkpoint.
- Document which policies or compliance rules override convenience.
- Document what counts as a safe retry versus a risky duplicate.