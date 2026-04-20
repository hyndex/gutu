# UI Zone Static TODO

**Maturity Tier:** `Baseline`

## Shipped Now

- Publishes 0 public modules from `@platform/ui-zone-static`.
- Exports 4 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `createStaticZone`.
- Keeps the public surface headless and import-driven rather than requiring a UI runtime.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Current Gaps

- Standalone consumers still need a compatible Gutu workspace to resolve workspace-scoped dependencies honestly.

## Recommended Next

- Add stronger component and interaction verification around the most reused visual primitives.
- Deepen accessibility and composition guidance where multiple host apps depend on the same library.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

## Later / Optional

- Visual regression lanes and design-token packs after the public APIs settle.
