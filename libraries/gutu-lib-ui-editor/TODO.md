# UI Editor TODO

**Maturity Tier:** `Baseline`

## Shipped Now

- Publishes 0 public modules from `@platform/ui-editor`.
- Exports 8 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `editorContentSchema`, `createPlatformEditorExtensions`, `createPlatformEditorConfig`, and more.
- Keeps the public surface headless and import-driven rather than requiring a UI runtime.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Current Gaps

- No additional gaps were identified beyond the library's stated non-goals.

## Recommended Next

- Add stronger component and interaction verification around the most reused visual primitives.
- Deepen accessibility and composition guidance where multiple host apps depend on the same library.

## Later / Optional

- Visual regression lanes and design-token packs after the public APIs settle.
