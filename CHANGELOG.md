# Changelog

All notable changes to this repository should be recorded here.

## Unreleased

### Added

- release-bundle verification, manifest boundary checks, docs truth audit, and eval-threshold gate wiring in the root release path
- long-running stdio MCP serving through `gutu mcp serve`
- file-backed persistent operator state for AI runs, approvals, prompt versions, memory collections/documents, eval runs, and admin workbench preferences
- governance and lifecycle docs: `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`, Dependabot configuration, compatibility matrix, and upgrade/support policies

### Changed

- release artifact naming and release metadata are now centralized on the `gutu` naming surface
- workspace init defaults and path handling are now safer across platforms, including Windows copy-mode defaults and symlink downgrade behavior
- protected refs and tags now reject dev-key signing output automatically
- vulnerability reporting is split into runtime, developer-tooling, and full-workspace closures

### Fixed

- release bundles now ship the real `framework/` tree instead of the stale `packages/` path assumption
- CLI manifest drift for `@platform/agent-understanding`
- machine-local absolute paths in committed understanding docs

## Release Discipline

Every release entry should capture:

- user-visible behavior changes
- migration or upgrade expectations
- security or governance changes
- release-gate additions or removals
