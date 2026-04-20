# Risk Register

## Active Risks

### R1. Future contributors may reintroduce plugin source into core

Mitigation:

- Keep `gutu doctor` checking repository boundaries.
- Document the no-plugin-source rule in README, CONTRIBUTING, and SECURITY.

### R2. Live external publishing is not provisioned yet

Mitigation:

- Use the shipped release/sign/vendor flows locally until the external repos and CI secrets are provisioned.

### R3. Remote artifact trust still depends on operator-managed keys

Mitigation:

- Keep `GUTU_SIGNING_PRIVATE_KEY` and `GUTU_SIGNING_PUBLIC_KEY` outside the repo.
- Promote long-term signing into managed CI secrets or KMS-backed workflows during external rollout.

### R4. Live GitHub provisioning remains credential-gated

Mitigation:

- Use the implemented `gutu rollout provision-github` command once `GITHUB_TOKEN` is present.
- Keep rollout topology in `ecosystem/rollout/organization.json` so provisioning stays deterministic.
