# STATUS

## Current Phase

- `Phase R1 - hard reset complete`
- `Phase R2 - clean gutu-core baseline active`
- `Phase R3 - plugin-free ecosystem bootstrap ready and verified`
- `Phase R4 - artifact, release, and external-repo scaffolding complete`
- `Phase R5 - rollout automation complete; live GitHub execution remains credential-gated`
- `Phase R6 - cross-plugin orchestration runtime active and wired into the split-repo integration harness`

## Truth

- The active repository root has been rebuilt as a standalone `gutu-core` repo.
- This repo contains zero plugin source code.
- The new core baseline currently ships:
  - `@gutu/kernel`
  - `@gutu/ecosystem`
  - `@gutu/cli`
  - `@gutu/release`
  - `@platform/kernel`
  - `@platform/permissions`
  - `@platform/schema`
  - `@platform/commands`
  - `@platform/events`
  - `@platform/jobs`
  - `@platform/plugin-solver`
- The active orchestration model is explicit commands plus durable events and jobs/workflows, not generic bidirectional hooks.
- The ecosystem audit now sees 11 real core runtime packages and only one remaining compat shim.

## Next Milestones

1. Provision live external repositories and publish real first-party artifacts.
2. Replace the final remaining compat shim with a real core package or dedicated external repo.
3. Promote signed release artifacts into an external package channel.
4. Connect the dedicated integration repository to live external repos and CI secrets.

## Verified Commands

- `bun run build`
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run ci`
- `bun run doctor`
- `bun run release:prepare`
- `bun run rollout:scaffold`
- `bun run audit` in `integrations/gutu-ecosystem-integration`
- `bun run consumer:smoke` in `integrations/gutu-ecosystem-integration`
- `git diff --check`
