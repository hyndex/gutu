# Booking Core Agent Context

Package/app id: `booking-core`
Target type: `package`  | Package kind: `app`
Location: `framework/builtin-plugins/booking-core`

## Purpose

Reservations, booking holds, and conflict-safe resource allocation flows.

## System role

Describe how this target fits into the larger product, which teams depend on it, and which business outcomes it is responsible for.

## Declared dependencies

- audit-core
- auth-core
- org-tenant-core
- portal-core
- role-policy-core

## Provided capabilities

- booking.reservations

## Requested capabilities

- api.rest.mount
- data.write.booking
- ui.register.admin

## Core resources

### `booking.reservations`

Canonical reservation records for rooms, desks, appointments, and other allocatable resources.

Business purpose: Provide the single source of truth for booking windows, hold state, confirmation state, and operator context.

Key fields:
- `actorId` (Actor) | Operator or workflow actor that last changed the reservation.
- `confirmationStatus` (Status) | Allocation state used by availability checks and portal views.
- `createdAt` (Created) | Creation timestamp for audit review and operational tracing.
- `holdExpiresAt` (Hold Expires) | Expiry time for held reservations awaiting confirmation.
- `id` (Id) | Add a field description so agents understand what this value means.
- `idempotencyKey` (Idempotency Key) | Add a field description so agents understand what this value means.
- `reason` (Reason) | Add a field description so agents understand what this value means.
- `resourceClass` (Resource Class) | Type of resource being reserved, such as room, desk, or appointment.
- `resourceId` (Resource) | Canonical identifier of the specific allocatable resource.
- `slotEnd` (End) | Exclusive end timestamp for the reservation window.
- `slotStart` (Start) | Inclusive start timestamp for the reservation window.
- `tenantId` (Tenant Id) | Add a field description so agents understand what this value means.
- `updatedAt` (Updated At) | Add a field description so agents understand what this value means.

## Core actions

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

## Core workflows

_No workflows were discovered for this target._