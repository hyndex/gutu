# Admin Shell Workbench TODO

**Maturity Tier:** `Baseline`

## Shipped Now

- Registers a bounded UI surface that can be hosted by the surrounding admin or portal shell.

## Current Gaps

- No dedicated integration test lane is exported in this repo today; validation currently leans on build, lint, typecheck, and test lanes.
- No standalone plugin-owned event, job, or workflow catalog is exported yet; compose it through actions, resources, and the surrounding Gutu runtime.
- The plugin exposes a UI surface, but not a richer admin workspace contribution module.

## Recommended Next

- Deepen saved-workspace, search, and operator personalization flows once more first-party plugins depend on the desk.
- Add stronger runtime diagnostics around missing or conflicting admin contributions.
- Add stronger operator-facing reconciliation and observability surfaces where runtime state matters.
- Promote any currently implicit cross-plugin lifecycles into explicit command, event, or job contracts when those integrations stabilize.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.
- Broaden the admin entry surface only if operators need more than the current embedded view or resource listing.

## Later / Optional

- Workspace theming and tenant-aware desk presets once the contribution contracts stop moving.
- Dedicated federation or external identity/provider adapters once the core contracts are stable.
