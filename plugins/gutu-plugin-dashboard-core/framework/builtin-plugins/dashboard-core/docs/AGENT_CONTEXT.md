# Dashboard Core Agent Context

## Mission

Provides the dashboard and widget backbone for operator-facing metrics, saved views, and admin summary surfaces.

## Code map

- Package root: `framework/builtin-plugins/dashboard-core`
- Service layer: `framework/builtin-plugins/dashboard-core/src/services/main.service.ts`
- Action layer: `framework/builtin-plugins/dashboard-core/src/actions/default.action.ts`
- Resource layer: `framework/builtin-plugins/dashboard-core/src/resources/main.resource.ts`
- UI layer: `framework/builtin-plugins/dashboard-core/src/ui`

## Safe assumptions

- Use `dashboard-core` as the stable plugin identifier and `@plugins/dashboard-core` as the package import name.
- Treat declared actions and resources as the public integration surface before reaching into services.
- Prefer explicit command, event, job, and workflow orchestration over undocumented side effects.

## Forbidden claims

- Do not document generic WordPress-style hooks unless they are explicitly exported.
- Do not promise live external connectors, distributed worker infrastructure, or portal/admin surfaces that are not present in the code.
- Do not claim a higher maturity tier than `Baseline` without adding the missing verification and operational depth first.

## Verification

- `bun run build`
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run test:contracts`
- `bun run test:unit`
- `bun run docs:check`
