# Gutu Ecosystem Repo Architecture TODO

Date: 2026-04-20
Repo: `hyndex/gutu`
Status: split-repo baseline implemented in `gutu-core`, with external-org rollout still pending

## Stage 0. Architecture And Naming

- [x] Lock the canonical repo model:
  - `gutula/gutu-core`
  - `gutula/gutu-lib-<slug>`
  - `gutula/gutu-plugin-<slug>`
  - `gutula/gutu-libraries`
  - `gutula/gutu-plugins`
- [x] Keep runtime package ids/import names stable while decoupling repo names from package names.
- [x] Make CLI-managed vendoring and lockfiles the default consumption model.
- [x] Explicitly reject git submodules as the default product-team install path.

## Stage 1. Ecosystem Contracts And Metadata

- [x] Add the `@platform/ecosystem` package.
- [x] Define first-party catalog entry, compatibility-channel, lockfile, and override schemas.
- [x] Extend kernel manifests to accept optional source/distribution metadata for split-repo publication.
- [x] Generate canonical first-party ecosystem metadata under:
  - `ecosystem/catalog/first-party-packages.json`
  - `ecosystem/channels/stable.json`
  - `ecosystem/channels/next.json`
- [x] Add a deterministic ecosystem metadata freshness check for CI.

## Stage 2. Consumer Workspace Model

- [x] Ratify the consumer metadata files:
  - `gutu.project.json`
  - `gutu.lock.json`
  - `gutu.overrides.json`
  - `.gutu/state/*`
  - `.gutu/cache/*`
- [x] Ratify the install destinations:
  - `vendor/framework/gutu`
  - `vendor/plugins/*`
  - `vendor/libraries/*`
- [x] Update `gutu init` to seed lockfile/override files and ecosystem metadata.
- [x] Keep a vendored source cache under `vendor/framework/gutu` so package vendoring stays reproducible without submodules.
- [x] Keep runtime imports pointed at `vendor/plugins/*` and `vendor/libraries/*`, not the framework source cache.

## Stage 3. CLI Ecosystem Commands

- [x] Add `gutu add plugin <id>`.
- [x] Add `gutu add library <id>`.
- [x] Add `gutu update [--package <id>] [--channel <id>]`.
- [x] Add `gutu vendor sync`.
- [x] Add `gutu ecosystem doctor`.
- [x] Add `gutu override add/remove`.
- [x] Enforce compatibility-channel membership, missing-source failures, and lockfile integrity through the ecosystem resolver.

## Stage 4. Catalog Repos And Repo Extraction

- [x] Add export support for generated catalog/showcase repos:
  - `gutu-libraries`
  - `gutu-plugins`
- [x] Generate package cards/catalog manifests from canonical source metadata.
- [x] Add standalone package-repo scaffolding for pilot extraction waves.
- [x] Include repo-local CI, release workflow, changelog/support docs, CODEOWNERS, and Dependabot in the scaffolded snapshot.

## Stage 5. Verification

- [x] Add unit coverage for ecosystem schemas and resolver behavior.
- [x] Add regression coverage for relative source-path resolution.
- [x] Add CLI coverage for:
  - workspace init
  - add/update/vendor sync
  - local overrides
  - ecosystem doctor
  - catalog export
  - standalone repo scaffolding
- [x] Wire ecosystem metadata freshness into `bun run ci:check`.

## Stage 6. Truth Surfaces

- [x] Update README with the new repo model, lockfile story, and no-submodule stance.
- [x] Update STATUS, TASKS, RISK_REGISTER, TEST_MATRIX, and IMPLEMENTATION_LEDGER.
- [x] Update the ecosystem architecture doc to describe the implemented baseline and remaining follow-ons honestly.

## Stage 7. Remaining Follow-Ons

- [ ] Provision the public `gutula` GitHub organization repos and push the first extracted pilot packages.
- [ ] Replace the vendored source-cache bootstrap with signed remote artifact fetch once the external repo/release pipeline is live.
- [ ] Add repo-level publish/promotion flows for real external first-party package releases.
- [ ] Add richer catalog validation against live GitHub repos/releases once those repos exist.
- [ ] Expand package manifests with explicit source/distribution metadata across more first-party packages as the extraction waves land.
