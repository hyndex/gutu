# Gutu Production Readiness TODO

Date: 2026-04-20
Repo: `hyndex/gutu`
Status: substantially complete with explicit residual follow-ons

## Stage 0. Audit Baseline

- [x] Reconcile the external audit against the live repository layout and command surface.
- [x] Confirm the cited release bundle, CLI dependency, docs portability, path handling, signing, and audit issues in source.
- [x] Inventory the broader release, AI, MCP, persistence, migration, and admin-preference gaps that remain open in repo docs.

## Stage 1. Release Truth And Artifact Integrity

- [x] Replace stale release bundle path assumptions with the real `framework/` tree.
- [x] Centralize release artifact naming and release-subject metadata so scripts and workflows stop drifting.
- [x] Verify packaged tarball contents after creation and fail when required framework paths are missing.
- [x] Align provenance, attestation, and release-pipeline docs with the actual shipped artifact names and paths.

## Stage 2. Workspace Dependency And Boundary Correctness

- [x] Fix the CLI package dependency drift for `@platform/agent-understanding`.
- [x] Add a repo-wide import-versus-manifest boundary checker for workspace packages.
- [x] Wire the manifest boundary checker into the root verification flow.

## Stage 3. Docs Portability And Truthfulness

- [x] Remove machine-local absolute paths from committed docs.
- [x] Stop generating machine-local absolute roots in the understanding index.
- [x] Add a docs portability/truth audit that fails on machine-local absolute paths and stale release naming.
- [x] Reconcile README and release docs with the actual shipped and gated scope.

## Stage 4. Cross-Platform CLI Hardening

- [x] Replace Unix-only path surgery in CLI and understanding helpers with platform-safe path utilities.
- [x] Make workspace init choose a safe default vendor mode by platform and capability.
- [x] Gracefully downgrade symlink vendoring when the platform cannot create links.
- [x] Add focused unit coverage for Windows-style path handling and init behavior.
- [x] Add CI smoke coverage for workspace init on Linux and Windows.

## Stage 5. Release Security And Policy Gates

- [x] Enforce env-backed signing on protected refs and tags, and mark dev-key output as non-release.
- [x] Split vulnerability analysis into runtime, developer-tooling, and full-workspace closures while gating release on runtime reachability.
- [x] Wire eval-threshold enforcement into the top-level release path.

## Stage 6. Durable Operator And AI State

- [x] Replace memory-only admin preference storage in the verification harness with a durable store.
- [x] Replace deterministic AI service fixtures with persisted control-plane state for runs, prompts, approvals, memory, and eval results.
- [x] Add regression tests proving persisted state survives repeated command execution.

## Stage 7. MCP And Operational Flow Hardening

- [x] Replace descriptor-only `gutu mcp serve` output with a long-running stdio transport.
- [x] Expose governed MCP list/call flows against the shipped AI actions.
- [x] Add a smoke test for the MCP transport handshake and tool execution.

## Stage 8. Persistence, Migrations, And Invariants

- [ ] Add deeper Postgres migration apply/rollback orchestration coverage.
- [ ] Add DB-backed reservation integrity protection for booking concurrency.
- [ ] Add integration coverage proving the booking concurrency invariant at the database layer.

Residual note:
This repository does not currently contain a concrete DB-backed booking writer or reservation-ledger implementation to harden in this wave, so those items remain explicitly open instead of being hand-waved as complete.

## Stage 9. Governance And Enterprise Readiness Docs

- [x] Add `SECURITY.md`.
- [x] Add `CONTRIBUTING.md`.
- [x] Add `CODEOWNERS`.
- [x] Add dependency update automation.
- [x] Add support, versioning, deprecation, compatibility, changelog, and upgrade/migration policy docs.

## Stage 10. Final Verification And Ledger Updates

- [x] Run focused verification for each changed subsystem.
- [x] Run the end-to-end root verification and release-gate commands.
- [x] Update this tracker with final completion state and any residual risk that is still honestly open.
- [x] Update the repo status/risk ledgers to match the new implementation reality.
