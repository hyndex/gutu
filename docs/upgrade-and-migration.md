# Upgrade And Migration Guide

## Before You Upgrade

1. Read `CHANGELOG.md`.
2. Review `docs/support-policy.md` and `docs/compatibility-matrix.md`.
3. If you use release artifacts, verify SBOM, provenance, signature status, and release-bundle contents.
4. If you persist `.gutu/state` data between runs, back it up before upgrading shared AI/admin flows.

## Recommended Upgrade Path

For repo-local framework users:

1. update the workspace to the target revision
2. run `bun install`
3. run `bun run typecheck`
4. run `bun run manifests:check`
5. run `bun run docs:validate`
6. run the focused tests for the subsystems you rely on

For release-pipeline changes, also run:

1. `bun run package:release`
2. `bun run verify:release-bundle`
3. `bun run sbom:generate`
4. `bun run provenance:generate`
5. `bun run sign:artifacts`
6. `bun run verify:artifacts-signature`

## Database And Migration Expectations

- Treat migration packs as ordered, reviewable plans.
- Prefer dry-run and validation before cutover.
- Keep rollback behavior tested for any destructive or stateful migration change.
- For Postgres-backed upgrades, preserve request-context, role, and RLS assumptions while validating the new release.

## AI And Admin State

The built-in AI/admin surfaces now persist operator state under `.gutu/state` by default.

When upgrading:

- preserve that directory if you want to keep local runs, approvals, prompt versions, memory documents, eval runs, and admin preferences
- remove or rotate it deliberately if you need a clean local control-plane state

## Breaking Changes In `0.x`

Until `1.0.0`, minor releases may contain intentional breaking changes.

Those changes must be documented in:

- `CHANGELOG.md`
- `STATUS.md`
- relevant package or operational docs when behavior changes materially
