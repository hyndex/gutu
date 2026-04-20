# Admin Contracts TODO

**Maturity Tier:** `Hardened`

## Shipped Now

- Publishes 4 public modules from `@platform/admin-contracts`: `./access`, `./legacy`, `./registry`, `./types`.
- Exports 54 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `canViewPage`, `canRunAction`, `canSeeField`, and more.
- Uses a React-aware surface model: Mixed runtime helpers.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Current Gaps

- Broad public API surface still relies on unit coverage only; there is no separate contract lane yet.
- Standalone consumers still need a compatible Gutu workspace to resolve workspace-scoped dependencies honestly.
- React-facing behavior is covered lightly; the repo does not yet ship deeper interaction or visual verification lanes.

## Recommended Next

- Broaden contract tests around registry and legacy-adapter boundaries.
- Add clearer migration guidance for hosts moving from legacy admin wiring to the current contract set.
- Add contract-focused tests around the most reused public modules and exported helpers.
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

## Later / Optional

- Reference themes, presets, and richer visual regression checks once the API shape settles.
