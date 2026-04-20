# Booking Core TODO

**Maturity Tier:** `Hardened`

## Shipped Now

- Exports 3 governed actions: `booking.reservations.stage`, `booking.reservations.confirm`, `booking.reservations.cancel`.
- Owns 1 resource contract: `booking.reservations`.
- Adds richer admin workspace contributions on top of the base UI surface.
- Ships explicit SQL migration or rollback helpers alongside the domain model.

## Current Gaps

- No dedicated integration test lane is exported in this repo today; validation currently leans on build, lint, typecheck, and test lanes.
- No standalone plugin-owned event, job, or workflow catalog is exported yet; compose it through actions, resources, and the surrounding Gutu runtime.

## Recommended Next

- Add richer availability search, recurrence, or waitlist flows only after the current reservation invariants stay stable.
- Introduce explicit downstream lifecycle events if other business systems must react automatically to booking transitions.
- Broaden lifecycle coverage with deeper orchestration, reconciliation, and operator tooling where the business flow requires it.
- Add more explicit domain events or follow-up job surfaces when downstream systems need tighter coupling.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.

## Later / Optional

- Customer-facing booking journeys or pricing rules once the resource-allocation spine is fully settled.
- Outbound connectors, richer analytics, or portal-facing experiences once the core domain contracts harden.
