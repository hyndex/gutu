# Test Matrix

## Current Verification

- Build:
  - `bun run build`
- Release bundle:
  - `bun run release:prepare`
- Typecheck:
  - `bun run typecheck`
- Lint:
  - `bun run lint`
- Unit tests:
  - `bun run test`
- Full baseline:
  - `bun run ci`
- Doctor:
  - `bun run doctor`
- Rollout:
  - `bun run rollout:scaffold`

## Coverage Focus

- kernel manifest validation
- repository boundary enforcement
- ecosystem lockfile and workspace bootstrap shape
- artifact download, digest verification, and signature validation
- release manifest, provenance, and signature flows
- rollout manifest loading, repo scaffolding, and GitHub provisioning request generation
- CLI scaffold and doctor flows
