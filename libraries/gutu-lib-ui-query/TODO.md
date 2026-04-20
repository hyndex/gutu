# UI Query TODO

**Maturity Tier:** `Hardened`

## Shipped Now

- Publishes 0 public modules from `@platform/ui-query`.
- Exports 14 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `createPlatformQueryKey`, `createPlatformQueryClient`, `usePlatformQuery`, and more.
- Keeps the public surface headless and import-driven rather than requiring a UI runtime.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Current Gaps

- Broad public API surface still relies on unit coverage only; there is no separate contract lane yet.

## Recommended Next

- Add stronger component and interaction verification around the most reused visual primitives.
- Deepen accessibility and composition guidance where multiple host apps depend on the same library.
- Add contract-focused tests around the most reused public modules and exported helpers.

## Later / Optional

- Visual regression lanes and design-token packs after the public APIs settle.
