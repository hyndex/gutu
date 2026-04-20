# Admin Shell Workbench Flows

## Happy paths

- No action surface is exported today.

## Action-level flows

No action flows are documented because the plugin currently exports no actions.

## Cross-package interactions

- Direct dependencies: `auth-core`, `org-tenant-core`, `role-policy-core`, `dashboard-core`
- Requested capabilities: `ui.mount:admin`, `data.read.settings`
- Integration model: Actions+Resources+UI
- Recovery ownership should stay with the host orchestration layer when the plugin does not explicitly export jobs, workflows, or lifecycle events.
