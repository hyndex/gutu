# Data Table TODO

**Maturity Tier:** `Hardened`

## Shipped Now

- Publishes 1 public module from `@platform/data-table`: `@platform/ui-table`.
- Exports 12 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `createVirtualWindowState`, `getVirtualRows`, `usePlatformVirtualRows`, and more.
- Uses a React-aware surface model: Headless typed exports.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Current Gaps

- Broad public API surface still relies on unit coverage only; there is no separate contract lane yet.
- Standalone consumers still need a compatible Gutu workspace to resolve workspace-scoped dependencies honestly.
- React-facing behavior is covered lightly; the repo does not yet ship deeper interaction or visual verification lanes.

## Recommended Next

- Strengthen contract coverage around the most widely consumed helper surfaces.
- Add deeper integration examples where downstream packages repeatedly compose the same APIs.
- Add contract-focused tests around the most reused public modules and exported helpers.
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

## Later / Optional

- Reference adapters and richer cookbook examples once more external connectors exist.
