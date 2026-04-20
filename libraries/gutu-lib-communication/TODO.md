# Communication TODO

**Maturity Tier:** `Hardened`

## Shipped Now

- Publishes 0 public modules from `@platform/communication`.
- Exports 37 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `communicationChannelValues`, `communicationDeliveryModeValues`, `communicationPriorityValues`, and more.
- Uses a React-aware surface model: Headless typed exports.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Current Gaps

- Broad public API surface still relies on unit coverage only; there is no separate contract lane yet.
- Standalone consumers still need a compatible Gutu workspace to resolve workspace-scoped dependencies honestly.
- React-facing behavior is covered lightly; the repo does not yet ship deeper interaction or visual verification lanes.

## Recommended Next

- Promote more consumer-facing contract tests around provider-route and callback normalization paths.
- Expand cookbook examples for multi-channel delivery only where the exported contract already proves stable.
- Add contract-focused tests around the most reused public modules and exported helpers.
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.
- Keep compatibility examples current as more extracted repos consume this library through the workspace vendor model.

## Later / Optional

- Reference adapters and richer cookbook examples once more external connectors exist.
