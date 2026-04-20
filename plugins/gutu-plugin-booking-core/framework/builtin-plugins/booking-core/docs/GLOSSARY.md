# Booking Core Glossary

## Terms

### booking.reservations

Canonical reservation records for rooms, desks, appointments, and other allocatable resources.

- `actorId`: Operator or workflow actor that last changed the reservation.
- `confirmationStatus`: Allocation state used by availability checks and portal views.
- `createdAt`: Creation timestamp for audit review and operational tracing.
- `holdExpiresAt`: Expiry time for held reservations awaiting confirmation.
- `id`: Add the field meaning and how operators use it.
- `idempotencyKey`: Add the field meaning and how operators use it.
- `reason`: Add the field meaning and how operators use it.
- `resourceClass`: Type of resource being reserved, such as room, desk, or appointment.
- `resourceId`: Canonical identifier of the specific allocatable resource.
- `slotEnd`: Exclusive end timestamp for the reservation window.
- `slotStart`: Inclusive start timestamp for the reservation window.
- `tenantId`: Add the field meaning and how operators use it.
- `updatedAt`: Add the field meaning and how operators use it.


## Domain shortcuts to avoid

- Expand internal jargon that would confuse a new engineer or an AI agent.
- Document terms that are similar but not interchangeable.
- Call out any overloaded words such as account, order, customer, approval, or publish.