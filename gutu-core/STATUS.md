# STATUS

## Current Phase

- `Phase R1 - hard reset complete`
- `Phase R2 - clean gutu-core baseline active`
- `Phase R3 - plugin-free ecosystem bootstrap ready and verified`
- `Phase R4 - artifact, release, and external-repo scaffolding complete`
- `Phase R5 - rollout automation complete; live GitHub execution remains credential-gated`

## Truth

- The active repository root has been rebuilt as a standalone `gutu-core` repo.
- This repo contains zero plugin source code.
- The new core baseline currently ships:
  - `@gutu/kernel`
  - `@gutu/ecosystem`
  - `@gutu/cli`
  - `@gutu/release`

## Next Milestones

1. Provision live external repositories and publish real first-party artifacts.
2. Promote signed release artifacts into an external package channel.
3. Connect the dedicated integration repository to live external repos and CI secrets.

## Verified Commands

- `bun run build`
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run ci`
- `bun run doctor`
- `bun run release:prepare`
- `bun run rollout:scaffold`
- `git diff --check`
