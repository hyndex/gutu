# Contracts TODO

**Maturity Tier:** `Hardened`

## Shipped Now

- Publishes 4 public modules from `@platform/contracts`: `@platform/admin-contracts`, `@platform/kernel`, `@platform/schema`, `zod`.
- Exports 3 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`.
- Keeps the public surface headless and import-driven rather than requiring a UI runtime.
- Verification lanes present: Build+Typecheck+Lint+Test+Contracts with 1 contract file(s).

## Current Gaps

- Standalone consumers still need a compatible Gutu workspace to resolve workspace-scoped dependencies honestly.

## Recommended Next

- Strengthen contract coverage around the most widely consumed helper surfaces.
- Add deeper integration examples where downstream packages repeatedly compose the same APIs.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

## Later / Optional

- Reference adapters and richer cookbook examples once more external connectors exist.
