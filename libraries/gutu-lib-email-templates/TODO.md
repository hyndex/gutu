# Email Templates TODO

**Maturity Tier:** `Baseline`

## Shipped Now

- Publishes 0 public modules from `@platform/email-templates`.
- Exports 10 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `defineEmailTemplate`, `createEmailTemplateRegistry`, `renderEmailTemplate`, and more.
- Uses a React-aware surface model: Headless typed exports.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Current Gaps

- React-facing behavior is covered lightly; the repo does not yet ship deeper interaction or visual verification lanes.

## Recommended Next

- Strengthen contract coverage around the most widely consumed helper surfaces.
- Add deeper integration examples where downstream packages repeatedly compose the same APIs.
- Add richer interaction or rendering checks around the primary React-facing exports where hosts depend on them heavily.

## Later / Optional

- Reference adapters and richer cookbook examples once more external connectors exist.
