# Gutu Workspace

This root is now an umbrella workspace organized by intended GitHub repository boundaries.

## Repo Layout

- `gutu-core/`
- `plugins/gutu-plugin-*/`
- `libraries/gutu-lib-*/`
- `apps/gutu-app-*/`
- `catalogs/gutu-plugins/`
- `catalogs/gutu-libraries/`
- `integrations/gutu-ecosystem-integration/`

## Notes

- The previous `old_contents/` archive has been removed.
- The active core implementation now lives under `gutu-core/`.
- Each plugin, library, and app has been extracted into its own repo-shaped folder.
- This root is now a coordination workspace, not the canonical root of `gutu-core`.

## Verify Core

Run from `gutu-core/`:

```bash
bun install
bun run ci
bun run doctor
```
