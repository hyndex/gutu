# Security Policy

## Reporting

Report suspected vulnerabilities through a private GitHub Security Advisory for this repository.

Do not open a public issue for a suspected security problem until maintainers confirm the issue, scope, and remediation plan.

Include:

- affected package, app, or workflow
- reproduction steps or proof of concept
- impact assessment
- whether the issue affects tenant isolation, auth, secrets, signing, MCP, or AI tool execution

## Scope

Security-sensitive areas in this repository include:

- auth, impersonation, and session propagation
- permissions, trust tiers, and restricted-preview activation
- Postgres roles, RLS, request-context initialization, and migration behavior
- release packaging, provenance, SBOM generation, and signing
- MCP tool/resource/prompt serving and connector governance
- AI approval checkpoints, prompt handling, and memory access policies

## Response Targets

- Initial triage: within 3 business days
- Severity and scope assessment: within 5 business days
- Remediation plan or mitigating guidance: as soon as impact is confirmed

These are targets, not guarantees. Critical tenant-isolation, auth-bypass, secret-exposure, or signing-integrity issues take priority over all other work.

## Disclosure Expectations

- Coordinated disclosure is expected.
- Fixes should ship with tests, release-note coverage, and any required updates to `RISK_REGISTER.md`, `TEST_MATRIX.md`, and `STATUS.md`.
- Security fixes that change operational behavior should also update `docs/release-pipeline.md` and `docs/upgrade-and-migration.md`.

## Supported Lines

While Gutu remains in the `0.x` phase, security support is limited to:

- the current `main` branch
- the latest release artifact generated from this repository

Older local forks, stale tarballs, and private downstream modifications may require a fresh rebase before a fix can be applied cleanly.
