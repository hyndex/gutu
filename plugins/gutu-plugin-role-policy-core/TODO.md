# Role Policy Core TODO

**Maturity Tier:** `Baseline`

## Shipped Now

- Exports 1 governed action: `roles.grants.assign`.
- Owns 1 resource contract: `roles.grants`.
- Registers a bounded UI surface that can be hosted by the surrounding admin or portal shell.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.

## Current Gaps

- No dedicated integration test lane is exported in this repo today; validation currently leans on build, lint, typecheck, and test lanes.
- The plugin owns durable data state, but it does not yet ship a dedicated migration verification lane in this repo.
- No standalone plugin-owned event, job, or workflow catalog is exported yet; compose it through actions, resources, and the surrounding Gutu runtime.
- The plugin exposes a UI surface, but not a richer admin workspace contribution module.

## Recommended Next

- Add clearer downstream enforcement patterns and policy-drift diagnostics when more plugins consume these rules directly.
- Expose explicit policy lifecycle events if cross-plugin automation depends on role or grant changes.
- Add stronger operator-facing reconciliation and observability surfaces where runtime state matters.
- Promote any currently implicit cross-plugin lifecycles into explicit command, event, or job contracts when those integrations stabilize.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Add explicit migration or rollback coverage if this domain becomes more operationally sensitive.
- Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.
- Broaden the admin entry surface only if operators need more than the current embedded view or resource listing.

## Later / Optional

- Dedicated federation or external identity/provider adapters once the core contracts are stable.
