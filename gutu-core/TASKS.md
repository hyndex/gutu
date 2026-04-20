# TASKS

## Stage 1 - Reset

- [x] Move the previous repository contents into `old_contents/`.
- [x] Rebuild the repository root as a clean `gutu-core` baseline.
- [x] Remove active plugin source from the root repository.

## Stage 2 - Core Baseline

- [x] Create fresh root governance and truth documents.
- [x] Create `@gutu/kernel`.
- [x] Create `@gutu/ecosystem`.
- [x] Create `@gutu/cli`.
- [x] Create `@gutu/release`.
- [x] Add `gutu init` workspace scaffolding.
- [x] Add `gutu doctor` repository-boundary verification.
- [x] Add `gutu vendor sync`.
- [x] Add release prepare/sign/verify flows.
- [x] Add external repo scaffolding commands.
- [x] Add rollout manifest and batch rollout scaffolding.
- [x] Add release promotion tooling for channel/catalog metadata.
- [x] Add GitHub provisioning automation gated on `GITHUB_TOKEN`.

## Stage 3 - Follow-On

- [ ] Provision separate live plugin and library repositories.
- [ ] Wire the live package channels to published signed artifacts.
- [ ] Stand up live cross-repo integration verification against those external repos.
