# Contributing

## Principles

Changes in this repository need code, docs, and verification to stay aligned.

If you touch behavior, also check whether `README.md`, `STATUS.md`, `RISK_REGISTER.md`, `TEST_MATRIX.md`, `TASKS.md`, or package-local docs need to move with it.

## Prerequisites

- Bun on `PATH`
- Bun workspace dependencies installed with `bun install`
- optional: PostgreSQL for deeper integration verification

## Local Workflow

1. Create a focused branch.
2. Make the code change.
3. Update the relevant docs and ledgers in the same change.
4. Run the narrowest verification that proves the change.
5. Run the broader root gates when the change affects shared framework behavior.

## Required Checks

For most shared-framework changes, run:

- `bun run typecheck`
- `bun run manifests:check`
- `bun run docs:validate`

Add the focused tests for the subsystem you changed. Examples:

- `bun test framework/core/cli/tests/unit/package.test.ts`
- `bun test framework/libraries/ai-mcp/tests/unit/runtime.test.ts`
- `bun test framework/builtin-plugins/ai-core/tests/unit/services.test.ts`
- `bun test framework/libraries/admin-shell-workbench/tests/unit/package.test.tsx`

When you change release or supply-chain behavior, also run:

- `bun run package:release`
- `bun run verify:release-bundle`
- `bun run sbom:generate`
- `bun run provenance:generate`
- `bun run sign:artifacts`
- `bun run verify:artifacts-signature`

## Documentation Rules

- Do not commit machine-local absolute filesystem paths.
- Keep package names, artifact names, and CLI examples consistent with the current repo layout.
- If a feature is partial, say so explicitly instead of implying it is complete.

## AI, MCP, And Admin Changes

When changing AI/operator flows:

- preserve approval checkpoints and replay safety
- keep MCP tool/resource/prompt exposure aligned with the underlying contracts
- update `TEST_MATRIX.md` and `RISK_REGISTER.md` if persistence, serving, or release-gate behavior changes

When changing admin workbench behavior:

- keep preference persistence, route resolution, and permission filtering under test
- prefer deterministic package-local tests plus the platform dev-console harness for integrated verification

## Security-Sensitive Changes

Changes touching auth, permissions, secrets, Postgres roles/RLS, signing, or MCP execution must:

- include tests
- update security or release docs when operator behavior changes
- avoid weakening protected-ref or release-path safeguards

See `SECURITY.md` for reporting and disclosure expectations.
