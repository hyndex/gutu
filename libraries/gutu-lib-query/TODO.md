# Query TODO

**Maturity Tier:** `Baseline`

## Shipped Now

- Publishes 1 public module from `@platform/query`: `@platform/ui-query`.
- Exports 6 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `createUnifiedQueryKeys`, `applyOptimisticQueryUpdate`, `invalidateAdminQueryScopes`.
- Keeps the public surface headless and import-driven rather than requiring a UI runtime.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Current Gaps

- Standalone consumers still need a compatible Gutu workspace to resolve workspace-scoped dependencies honestly.

## Recommended Next

- Strengthen contract coverage around the most widely consumed helper surfaces.
- Add deeper integration examples where downstream packages repeatedly compose the same APIs.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

## Later / Optional

- Reference adapters and richer cookbook examples once more external connectors exist.
