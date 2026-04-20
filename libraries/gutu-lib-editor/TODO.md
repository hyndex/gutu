# Editor TODO

**Maturity Tier:** `Baseline`

## Shipped Now

- Publishes 0 public modules from `@platform/editor`.
- Exports 0 named symbols through the public entrypoint.
- Uses a React-aware surface model: React UI + typed helpers.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Current Gaps

- Standalone consumers still need a compatible Gutu workspace to resolve workspace-scoped dependencies honestly.
- React-facing behavior is covered lightly; the repo does not yet ship deeper interaction or visual verification lanes.

## Recommended Next

- Add stronger component and interaction verification around the most reused visual primitives.
- Deepen accessibility and composition guidance where multiple host apps depend on the same library.
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

## Later / Optional

- Visual regression lanes and design-token packs after the public APIs settle.
