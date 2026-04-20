# Workflow Core TODO

**Maturity Tier:** `Hardened`

## Shipped Now

- Exports 1 governed action: `workflow.instances.transition`.
- Owns 1 resource contract: `workflow.instances`.
- Publishes 3 workflow definitions with state-machine descriptions and mandatory steps.
- Registers a bounded UI surface that can be hosted by the surrounding admin or portal shell.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.

## Current Gaps

- No dedicated integration test lane is exported in this repo today; validation currently leans on build, lint, typecheck, and test lanes.
- The plugin owns durable data state, but it does not yet ship a dedicated migration verification lane in this repo.
- The plugin exposes a UI surface, but not a richer admin workspace contribution module.

## Recommended Next

- Add richer execution-state and replay guidance if more plugins adopt workflow-driven orchestration.
- Expose tighter integration patterns with jobs and notifications when human approvals start driving more automation.
- Add stronger operator-facing reconciliation and observability surfaces where runtime state matters.
- Promote any currently implicit cross-plugin lifecycles into explicit command, event, or job contracts when those integrations stabilize.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Add explicit migration or rollback coverage if this domain becomes more operationally sensitive.
- Broaden the admin entry surface only if operators need more than the current embedded view or resource listing.

## Later / Optional

- Visual editors or migration helpers for workflow definitions once the current state-machine contract hardens.
- Dedicated federation or external identity/provider adapters once the core contracts are stable.
