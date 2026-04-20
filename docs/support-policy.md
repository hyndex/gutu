# Support, Versioning, And Deprecation Policy

## Release Model

Gutu is currently a `0.x` framework. Until `1.0.0`, versioning is semver-shaped but intentionally conservative about compatibility promises:

- patch releases should be backward compatible
- minor releases may contain breaking changes when required to correct architecture, governance, or security posture
- breaking changes must be called out in `CHANGELOG.md` and `docs/upgrade-and-migration.md`

## Supported Lines

Supported lines are:

- the current `main` branch for repo-local framework users
- the latest published package or release artifact

Older pre-release snapshots are not guaranteed support once a newer release is available.

## Deprecation Rules

Deprecations must include:

- a clear replacement path
- a changelog entry
- documentation updates
- at least one release overlap before removal, unless the change is required for security or correctness

When possible, deprecations should also surface through CLI help text, release notes, or obvious operator-facing docs.

## Support Expectations

The repository currently supports:

- framework development on Bun `>=1.3.12`
- repo-local CLI usage through `bun run gutu -- ...`
- release verification from the checked-in workspace

The repository does not currently promise:

- long-term support branches
- multiple simultaneous maintained major versions
- live third-party provider connector coverage inside this repo

## Changelog And Release Notes

Every meaningful release should update `CHANGELOG.md` with:

- new capabilities
- removed or deprecated behavior
- security/governance changes
- migration notes

## Security Fixes

Security fixes follow `SECURITY.md`. When a security fix changes operator or release behavior, the support and upgrade docs must move with it.
