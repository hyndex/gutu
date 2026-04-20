# User Directory Agent Context

## Mission

Projects people and directory data into a stable domain contract that other plugins can search, reference, and render.

## Code map

- Package root: `framework/builtin-plugins/user-directory`
- Service layer: `framework/builtin-plugins/user-directory/src/services/main.service.ts`
- Action layer: `framework/builtin-plugins/user-directory/src/actions/default.action.ts`
- Resource layer: `framework/builtin-plugins/user-directory/src/resources/main.resource.ts`
- UI layer: `framework/builtin-plugins/user-directory/src/ui`

## Safe assumptions

- Use `user-directory` as the stable plugin identifier and `@plugins/user-directory` as the package import name.
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
