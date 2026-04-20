# Gutu Ecosystem Repo Architecture

## Objective

Define and document the split-repo ecosystem model that `gutu-core` now implements:

- `gutu-core` stays the canonical framework/orchestrator repo
- every first-party library and built-in plugin has a canonical standalone repo name under `gutula`
- consumer workspaces install packages through a CLI-managed lockfile and vendor model
- git submodules are not the default install path

This is the current architecture baseline, not a speculative future-only note.

## Canonical Repo Shape

The first-party ecosystem is named as:

- `gutula/gutu-core`
- `gutula/gutu-lib-<package-slug>`
- `gutula/gutu-plugin-<package-slug>`
- `gutula/gutu-libraries`
- `gutula/gutu-plugins`

The two catalog repos are showcase/index repos, not source-of-truth code hosts. They publish package metadata, compatibility information, install examples, docs links, changelog links, and source repo links.

## Why Not Git Submodules

Git submodules remain a poor default for product teams:

- they make fresh clones and updates more brittle
- they push source-control mechanics onto every consumer workspace
- they complicate deterministic install/update flows
- they do not solve compatibility-channel, integrity, or provenance policy by themselves

Submodules are acceptable only as maintainer-only convenience tooling if ever needed. The shipped consumer path is:

- `gutu.lock.json`
- `gutu.overrides.json`
- vendored packages under `vendor/`
- compatibility-channel resolution through the CLI

## Consumer Workspace Model

Generated consumer workspaces now use:

```text
apps/
libraries/
plugins/
vendor/
  framework/gutu/
  libraries/
  plugins/
.gutu/
  cache/
  state/
gutu.project.json
gutu.lock.json
gutu.overrides.json
```

### Roles

| Path | Purpose |
| --- | --- |
| `vendor/framework/gutu` | Vendored `gutu-core` distribution plus the first-party source cache used for compatibility-aware vendoring |
| `vendor/libraries/*` | Installed first-party or future external libraries used by the workspace |
| `vendor/plugins/*` | Installed first-party or future external plugins used by the workspace |
| `gutu.lock.json` | Pinned compatibility channel, resolved package set, repo metadata, and digests |
| `gutu.overrides.json` | Maintainer-local path overrides for multi-repo development |
| `.gutu/cache/*` | Local machine/project cache space reserved for future remote artifact fetching |
| `.gutu/state/*` | Local state used by workspace tooling and durable local framework services |

## Current CLI Surface

The split-repo baseline now ships the following ecosystem commands:

```text
gutu init [target]
gutu add plugin <id>
gutu add library <id>
gutu update [--package <id>] [--channel <id>]
gutu vendor sync
gutu override add --package <id> --path <path>
gutu override remove --package <id>
gutu ecosystem doctor
gutu ecosystem export-catalogs --out <path>
gutu ecosystem scaffold-repo --package <id> --out <path>
```

These commands operate on generated ecosystem metadata and enforce:

- compatibility-channel membership
- missing-source failures
- deterministic digests in `gutu.lock.json`
- override-path validation
- vendored-package reconciliation

## Compatibility Channels And Catalog Metadata

`gutu-core` now generates and ships:

```text
ecosystem/catalog/first-party-packages.json
ecosystem/channels/stable.json
ecosystem/channels/next.json
```

Those files capture:

- package id and package name
- canonical repo name and URL
- source path and vendor path
- dependency relationships
- compatibility-channel membership
- ecosystem tier

The root verification path now includes an ecosystem metadata freshness check so these files cannot drift silently.

## Standalone Repo Extraction Path

The current extraction baseline is intentionally controlled:

1. keep `gutu-core` as the integration/orchestrator repo
2. export package/showcase catalogs from the canonical metadata
3. scaffold standalone package repo snapshots from first-party source packages
4. use those snapshots as the starting point for pilot extraction waves

The standalone repo scaffold currently includes:

- package source snapshot
- CI workflow
- release workflow stub
- `README.md`
- `CHANGELOG.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CODEOWNERS`
- Dependabot config

This gives us a clean extraction seed without forcing product teams into submodules.

## Runtime Package Names Versus Repo Names

Runtime package ids remain stable for now:

- `@platform/*`
- `@plugins/*`

Repo names are decoupled:

- `gutu-lib-communication`
- `gutu-plugin-notifications-core`
- and so on

This avoids ecosystem-wide import churn while enabling independent repository ownership and release cadence later.

## What Is Implemented Versus Deferred

### Implemented now

- split-repo catalog and compatibility metadata in `gutu-core`
- lockfile + override-based workspace resolution
- vendored install/update flow under `vendor/`
- local override flow for multi-repo development
- generated showcase catalogs for libraries/plugins
- standalone package-repo scaffolding
- CI freshness checks for generated ecosystem metadata

### Still intentionally deferred

- provisioning the actual public `gutula` repo fleet
- remote signed artifact fetch from external first-party repos
- registry login/publish/promote/yank flows
- live GitHub-backed catalog validation
- a full public plugin/library marketplace

## Practical Guidance

If you want to work on Gutu today:

- use `gutu-core` as the canonical integration repo
- use `gutu init` to create clean consumer workspaces
- use `gutu add`, `gutu update`, and `gutu vendor sync` for package composition
- use `gutu.overrides.json` when developing against local clones of future split repos

If you want to evolve the public ecosystem later:

- start with pilot extraction waves using `gutu ecosystem scaffold-repo`
- create the corresponding `gutula/gutu-lib-*` and `gutula/gutu-plugin-*` repos
- keep `gutu-core` as the compatibility and verification authority

## Related Files

- [README.md](../README.md)
- [TASKS.md](../TASKS.md)
- [STATUS.md](../STATUS.md)
- [RISK_REGISTER.md](../RISK_REGISTER.md)
- [docs/ecosystem/2026-04-20-gutu-ecosystem-repo-architecture-todo.md](./ecosystem/2026-04-20-gutu-ecosystem-repo-architecture-todo.md)
