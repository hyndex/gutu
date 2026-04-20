# UI Router TODO

**Maturity Tier:** `Hardened`

## Shipped Now

- Publishes 0 public modules from `@platform/ui-router`.
- Exports 15 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `defineRoute`, `createRouteManifest`, `buildRouteHref`, and more.
- Uses a React-aware surface model: Mixed runtime helpers.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Current Gaps

- Broad public API surface still relies on unit coverage only; there is no separate contract lane yet.
- Standalone consumers still need a compatible Gutu workspace to resolve workspace-scoped dependencies honestly.
- React-facing behavior is covered lightly; the repo does not yet ship deeper interaction or visual verification lanes.

## Recommended Next

- Add stronger component and interaction verification around the most reused visual primitives.
- Deepen accessibility and composition guidance where multiple host apps depend on the same library.
- Add contract-focused tests around the most reused public modules and exported helpers.
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

## Later / Optional

- Visual regression lanes and design-token packs after the public APIs settle.
