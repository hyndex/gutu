# Gutu Core

`gutu-core` is the clean, plugin-free foundation repository for the Gutu ecosystem.

## Repository Position

This repository now lives inside a larger umbrella workspace that is divided by intended Git repository boundaries. The `gutu-core/` folder is the canonical core repo root inside that workspace.

This repo intentionally contains only:

- framework core packages
- ecosystem metadata and workspace bootstrap logic
- the CLI used to scaffold consumer workspaces
- fresh governance, status, risk, and verification documents

It intentionally does **not** contain:

- built-in plugin source
- optional plugin source
- product apps
- legacy release artifacts or generated framework bundles

## Production Baseline

The rebuilt core baseline now includes:

- signed release manifest generation and verification
- provenance generation for release artifacts
- remote `file://` and `http(s)` artifact fetching with digest enforcement
- signed vendor sync for consumer workspaces
- scaffolding for external plugin, library, and integration repositories
- rollout automation for batch repo scaffolding, release promotion, and GitHub provisioning
- repository-boundary doctor checks for keeping `gutu-core` plugin-free

## Current Core Packages

- `@gutu/kernel`: manifest and repository-boundary contracts
- `@gutu/ecosystem`: lockfile, catalog, compatibility, and workspace bootstrap contracts
- `@gutu/cli`: command surface for scaffolding and boundary checks

## Commands

```bash
bun install
bun run build
bun run typecheck
bun run lint
bun run test
bun run ci
bun run release:prepare
bun run rollout:scaffold
bun run gutu -- init demo-workspace
bun run gutu -- doctor
```

## Repository Shape

```text
framework/core/cli
framework/core/ecosystem
framework/core/kernel
docs/
```

## Design Direction

- `gutu-core` remains plugin-free.
- Plugins and libraries are expected to live in separate repositories.
- Consumer workspaces use `gutu.project.json`, `gutu.lock.json`, and `gutu.overrides.json`.
- Consumer workspaces install vendored package contents with `gutu vendor sync`.
- External rollout automation is driven by `ecosystem/rollout/organization.json`.

See [docs/architecture.md](./docs/architecture.md), [docs/release-process.md](./docs/release-process.md), [docs/external-repositories.md](./docs/external-repositories.md), and [docs/ecosystem/2026-04-20-gutu-core-reset-todo.md](./docs/ecosystem/2026-04-20-gutu-core-reset-todo.md).
