# Booking Core Agent Context

## Mission

Implements the reservation engine for staging, confirming, and cancelling allocation windows with conflict-safe database constraints.

## Code map

- Package root: `framework/builtin-plugins/booking-core`
- Service layer: `framework/builtin-plugins/booking-core/src/services/main.service.ts`
- Action layer: `framework/builtin-plugins/booking-core/src/actions/default.action.ts`
- Resource layer: `framework/builtin-plugins/booking-core/src/resources/main.resource.ts`
- UI layer: `framework/builtin-plugins/booking-core/src/ui`

## Safe assumptions

- Use `booking-core` as the stable plugin identifier and `@plugins/booking-core` as the package import name.
- Treat declared actions and resources as the public integration surface before reaching into services.
- Prefer explicit command, event, job, and workflow orchestration over undocumented side effects.

## Forbidden claims

- Do not document generic WordPress-style hooks unless they are explicitly exported.
- Do not promise live external connectors, distributed worker infrastructure, or portal/admin surfaces that are not present in the code.
- Do not claim a higher maturity tier than `Hardened` without adding the missing verification and operational depth first.

## Verification

- `bun run build`
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run test:contracts`
- `bun run test:migrations`
- `bun run test:unit`
- `bun run docs:check`
