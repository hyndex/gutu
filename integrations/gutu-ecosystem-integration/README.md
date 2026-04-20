# gutu-ecosystem-integration

Cross-repo certification harness for the split Gutu ecosystem.

This repository assembles `gutu-core`, extracted plugin repos, extracted library repos, and app repos into a temporary certification workspace so we can verify the ecosystem the way a real adopter experiences it.

## What It Verifies

- dependency-closure audit across extracted libraries, plugins, and apps
- compatibility-shim coverage for legacy `@platform/*` contracts that are not yet their own source repos
- workspace install across the assembled ecosystem
- per-package `lint`, `typecheck`, `test`, and `build` scripts when present
- npm publication smoke checks with `npm pack --dry-run`
- consumer-workspace scaffolding and `gutu vendor sync` using real package artifacts

## Commands

```bash
bun install
bun run audit
bun run certify
bun run consumer:smoke
bun run ci
```

Generated reports are written to `reports/`.
