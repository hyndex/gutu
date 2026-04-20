# Admin List View TODO

**Maturity Tier:** `Hardened`

## Shipped Now

- Publishes 0 public modules from `@platform/admin-listview`.
- Exports 14 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `defineListView`, `createListState`, `serializeSavedView`, and more.
- Keeps the public surface headless and import-driven rather than requiring a UI runtime.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Current Gaps

- Broad public API surface still relies on unit coverage only; there is no separate contract lane yet.
- Standalone consumers still need a compatible Gutu workspace to resolve workspace-scoped dependencies honestly.

## Recommended Next

- Deepen contract coverage around the most reused admin composition paths.
- Add stronger ergonomic guidance where multiple first-party plugins compose the same admin primitives.
- Add contract-focused tests around the most reused public modules and exported helpers.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

## Later / Optional

- Reference themes, presets, and richer visual regression checks once the API shape settles.
