# UI Shell TODO

**Maturity Tier:** `Hardened`

## Shipped Now

- Publishes 6 public modules from `@platform/ui-shell`: `./registry`, `./shells`, `./navigation`, `./providers`, `./telemetry`, `./types`.
- Exports 43 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `defineUiSurface`, `defineZone`, `createUiRegistry`, and more.
- Uses a React-aware surface model: React UI + typed helpers.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Current Gaps

- Broad public API surface still relies on unit coverage only; there is no separate contract lane yet.

## Recommended Next

- Add stronger contract and interaction checks around provider and registry composition paths.
- Deepen host-application examples where multiple apps depend on the same shell primitives.
- Add contract-focused tests around the most reused public modules and exported helpers.
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.

## Later / Optional

- Visual regression lanes and design-token packs after the public APIs settle.
