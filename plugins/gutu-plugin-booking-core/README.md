# Booking Core

Reservations, booking holds, and conflict-safe resource allocation flows.

![Maturity: Hardened](https://img.shields.io/badge/Maturity-Hardened-2563eb) ![Verification: Build+Typecheck+Lint+Test+Contracts+Migrations](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest%2BContracts%2BMigrations-2563eb) ![DB: postgres+sqlite](https://img.shields.io/badge/DB-postgres%2Bsqlite-2563eb) ![Integration Model: Actions+Resources+UI](https://img.shields.io/badge/Integration%20Model-Actions%2BResources%2BUI-6b7280)

## What It Does Now

Implements the reservation engine for staging, confirming, and cancelling allocation windows with conflict-safe database constraints.

- Exports 3 governed actions: `booking.reservations.stage`, `booking.reservations.confirm`, `booking.reservations.cancel`.
- Owns 1 resource contract: `booking.reservations`.
- Adds richer admin workspace contributions on top of the base UI surface.
- Ships explicit SQL migration or rollback helpers alongside the domain model.

## Maturity

**Maturity Tier:** `Hardened`

This tier is justified because unit coverage exists, contract coverage exists, and migration coverage exists.

## Verified Capability Summary

- Group: **Operational Data**
- Verification surface: **Build+Typecheck+Lint+Test+Contracts+Migrations**
- Tests discovered: **3** total files across unit, contract, migration lanes
- Integration model: **Actions+Resources+UI**
- Database support: **postgres + sqlite**

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package | `@plugins/booking-core` |
| Manifest ID | `booking-core` |
| Repo | [gutu-plugin-booking-core](https://github.com/gutula/gutu-plugin-booking-core) |
| Depends On | `auth-core`, `org-tenant-core`, `role-policy-core`, `audit-core`, `portal-core` |
| Requested Capabilities | `ui.register.admin`, `api.rest.mount`, `data.write.booking` |
| Provided Capabilities | `booking.reservations` |
| Runtime | bun>=1.3.12 |
| Database | postgres, sqlite |
| Integration Model | Actions+Resources+UI |

## Capability Matrix

| Surface | Count | Details |
| --- | --- | --- |
| Actions | 3 | `booking.reservations.stage`, `booking.reservations.confirm`, `booking.reservations.cancel` |
| Resources | 1 | `booking.reservations` |
| Jobs | 0 | No job catalog exported |
| Workflows | 0 | No workflow catalog exported |
| UI | Present | base UI surface, admin contributions |

## Quick Start For Integrators

Use this repo inside a **compatible Gutu workspace** or the **ecosystem certification workspace** so its `workspace:*` dependencies resolve honestly.

```bash
# from a compatible workspace that already includes this plugin's dependency graph
bun install
bun run build
bun run test
bun run docs:check
```

```ts
import { manifest, stageReservationAction, BookingReservationResource, adminContributions, uiSurface } from "@plugins/booking-core";

console.log(manifest.id);
console.log(stageReservationAction.id);
console.log(BookingReservationResource.id);
```

Use the root repo scripts for day-to-day work **after the workspace is bootstrapped**, or run the nested package directly from `framework/builtin-plugins/booking-core` if you need lower-level control.

## Current Test Coverage

- Root verification scripts: `bun run build`, `bun run typecheck`, `bun run lint`, `bun run test`, `bun run test:contracts`, `bun run test:migrations`, `bun run test:unit`, `bun run docs:check`
- Unit files: 1
- Contracts files: 1
- Integration files: 0
- Migrations files: 1

## Known Boundaries And Non-Goals

- Not a full vertical application suite; this plugin only owns the domain slice exported in this repo.
- Not a replacement for explicit orchestration in jobs/workflows when multi-step automation is required.
- Does not currently export recurring booking, waitlist, or availability-search APIs.
- Does not replace downstream orchestration for approvals or billing around a reservation lifecycle.
- Cross-plugin composition should use Gutu command, event, job, and workflow primitives. This repo should not be documented as exposing a generic WordPress-style hook system unless one is explicitly exported.

## Recommended Next Milestones

- Add richer availability search, recurrence, or waitlist flows only after the current reservation invariants stay stable.
- Introduce explicit downstream lifecycle events if other business systems must react automatically to booking transitions.
- Broaden lifecycle coverage with deeper orchestration, reconciliation, and operator tooling where the business flow requires it.
- Add more explicit domain events or follow-up job surfaces when downstream systems need tighter coupling.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.

## More Docs

See [DEVELOPER.md](./DEVELOPER.md), [TODO.md](./TODO.md), [SECURITY.md](./SECURITY.md), [CONTRIBUTING.md](./CONTRIBUTING.md). The internal domain sources used to build those docs live under:

- `plugins/gutu-plugin-booking-core/framework/builtin-plugins/booking-core/docs/AGENT_CONTEXT.md`
- `plugins/gutu-plugin-booking-core/framework/builtin-plugins/booking-core/docs/BUSINESS_RULES.md`
- `plugins/gutu-plugin-booking-core/framework/builtin-plugins/booking-core/docs/EDGE_CASES.md`
- `plugins/gutu-plugin-booking-core/framework/builtin-plugins/booking-core/docs/FLOWS.md`
- `plugins/gutu-plugin-booking-core/framework/builtin-plugins/booking-core/docs/GLOSSARY.md`
- `plugins/gutu-plugin-booking-core/framework/builtin-plugins/booking-core/docs/MANDATORY_STEPS.md`
