# Internet-Product Clone Framework — Phased TODO

Sequence is mandatory. Skipping a phase introduces hidden coupling and
makes later plugins fragile.

## Phase 0 — Foundation (✅ DONE in prior commits)

- [x] `HostPlugin.resources` declarative field (commits `4bc5e62`, plugin
      repos pushed).
- [x] Dynamic plugin-namespace allow-list in resource-write gate.
- [x] Synthetic `example-app-plugin` for bundled demo resources.
- [x] RBAC clamp on `effectiveRole` (commit `b0ee2d7`).
- [x] Resource-write catalog gate.
- [x] Date validation on POST/PATCH/PUT.
- [x] `prevHash`/`hash` exposed on `/api/audit`.
- [x] Prometheus content-negotiation on `/api/_metrics`.
- [x] Documented in `docs/internet-products/00-blueprint.md`.

## Phase 1 — Horizontal internet primitives (14 plugins)

**Order matters**: each later Phase 1 plugin may declare earlier ones as
recommended deps but must NOT hard-depend on them. All hard-deps point at
existing first-party plugins (auth, audit, workflow, etc.).

### 1.1 `entitlements-core` ✅ REFERENCE IMPLEMENTATION

Acceptance:
- [x] 5 resources declared (`entitlements.grants`, `.policies`,
      `.decisions`, `.benefits`, `.revocations`).
- [x] 7 actions implemented + zod-validated.
- [x] 6 event types emitted via `recordAudit`.
- [x] 4 jobs registered with leader election.
- [x] 2 workflows defined (policy lifecycle + manual access exception).
- [x] Decision engine service evaluating plan + ACL + content + region +
      age in one pass.
- [x] Migrations idempotent on re-run.
- [x] Unit tests (decision engine).
- [x] Integration tests (action → event → grant issuance).
- [x] Plugin loaded in `HOST_PLUGINS`; verified on `/api/_plugins`.
- [x] Resources appear in `/api/ui/resources`.
- [x] `entitlements.access.check` answers correctly for paid/trial/expired/
      region-blocked/age-blocked subjects.

### 1.2 `commerce-storefront-core` 📋 SCAFFOLDED

Acceptance (mirrors §4.2 of the instruction plan):
- [ ] 5 resources: sessions, carts, wishlists, checkout-intents,
      customer-order-pages.
- [ ] 10 actions: sessions.start, carts.add-line, carts.update-line,
      carts.remove-line, carts.price, checkout.prepare,
      checkout.place-order, wishlists.add, wishlists.remove, orders.track.
- [ ] 7 events: cart.created, cart.line.added, cart.priced,
      checkout.prepared, checkout.order-placed, wishlist.item.added,
      abandoned-cart.detected.
- [ ] 4 jobs: abandoned-carts.detect, order-page.projections.refresh,
      search-index.sync, cart-expirations.sweep.
- [ ] Cart-pricing pulls from `pricing-tax-core` + `promotions-loyalty-core`.
- [ ] Checkout pulls availability from `inventory-core`.
- [ ] Order placement creates a `sales-core` sales order via the action API.
- [ ] Abandoned cart detection runs hourly (leader-elected).
- [ ] Edge-case tests: out-of-stock at checkout, price changed since cart,
      coupon valid for user but not SKU, multi-seller cart split via
      `marketplace-core`, COD risk score, partial-payment void path.

### 1.3 `reviews-ratings-core` 📋 SCAFFOLDED

Acceptance:
- [ ] 5 resources: subjects, reviews, ratings, aggregates, moderation-states.
- [ ] 7 actions: submit, update, delete-own, moderate, mark-verified,
      aggregate.recompute, report-abuse.
- [ ] 5 events: review.submitted, .updated, .moderated, .reported,
      rating.aggregate.updated.
- [ ] Aggregate recomputation idempotent (no double counting on retry).
- [ ] Verified-purchase enforcement.
- [ ] Reciprocal-retaliation guard for rides/marketplace.
- [ ] Refund/cancellation post-review handling.
- [ ] Tests: review-bombing detection, dup-prevention, moderation hide.

### 1.4 `feed-core` 📋 SCAFFOLDED

Acceptance:
- [ ] 5 resources: definitions, items, materialized-timelines,
      user-preferences, experiments.
- [ ] 7 actions: publish-item, remove-item, materialize-user-feed, fetch,
      hide-item, mark-not-interested, experiments.assign.
- [ ] 4 events: item.published, .hidden, materialized, experiment.assigned.
- [ ] 4 jobs: materialize.batch, trending.compute, stale-items.expire,
      abuse-suppression.apply.
- [ ] Cold-start fallback (new user with no follows).
- [ ] Trust-safety takedown removes items from materialized timelines.
- [ ] Celebrity fanout: capped batch size + queue.
- [ ] Tests: dedupe on infinite scroll, deleted-after-materialization,
      blocked-user filter, recommendation-failure fallback.

### 1.5 `recommendations-core` 📋 SCAFFOLDED

Acceptance:
- [ ] 5 resources: models, candidates, ranking-rules, experiments,
      feedback-events.
- [ ] 6 actions: candidates.generate, rank, feedback.record, model.publish,
      experiment.start, explain.
- [ ] Experimentation: A/B assignment per user.
- [ ] Opt-out support.
- [ ] Bias guard: popularity ceiling for new items.
- [ ] Stale-item filter.
- [ ] Regulatory restriction support (medical/finance recommendations).

### 1.6 `messaging-core` 📋 SCAFFOLDED

Acceptance:
- [ ] 6 resources: threads, messages, participants, read-receipts,
      attachments, moderation-holds.
- [ ] 7 actions: threads.create, messages.send, .edit, .delete, .report,
      read-receipts.mark, participants.block.
- [ ] Block enforcement on existing threads.
- [ ] Phone masking for marketplace/rides scenarios.
- [ ] Attachment AV scan handoff to `trust-safety-core`.
- [ ] Tests: blocked-after-thread, payment-bypass detection, ephemeral
      retention.

### 1.7 `trust-safety-core` 📋 SCAFFOLDED

Acceptance:
- [ ] 7 resources: reports, cases, policies, decisions, restrictions,
      appeals, risk-scores.
- [ ] 8 actions: report.submit, case.open, case.assign, decision.record,
      restriction.apply, .lift, appeal.submit, risk-score.compute.
- [ ] 2 workflows: moderation-case-lifecycle, safety-incident-lifecycle.
- [ ] Restriction propagation: applying a restriction must remove items
      from feeds/messaging within 60 seconds.
- [ ] Appeal flow with re-instatement gate.
- [ ] Tests: false-positive recovery, repeat-abuser detection, retroactive
      removal.

### 1.8 `usage-metering-core` 📋 SCAFFOLDED

Acceptance:
- [ ] 6 resources: meters, events, aggregates, quotas, overage-rules,
      billing-snapshots.
- [ ] 6 actions: meters.register, events.record, quotas.check,
      quotas.reserve, aggregates.recompute, billing-snapshot.generate.
- [ ] Reservation-then-commit for race-free quota.
- [ ] Late-arriving events post invoice → adjustment row.
- [ ] Idempotent event ingestion (`eventId` uniqueness).
- [ ] Tests: duplicate event, late event, race burst, grace limits.

### 1.9 `geospatial-routing-core` 📋 SCAFFOLDED

Acceptance:
- [ ] 6 resources: service-areas, geofences, points, routes, eta-estimates,
      distance-matrices.
- [ ] 5 actions: serviceability.check, route.estimate,
      distance-matrix.compute, geofence.evaluate, zone.publish.
- [ ] Pluggable routing provider (`gutu-lib-geo` default; vendor adapter
      hooks).
- [ ] Spoofing guard: server-side validation of coordinates.
- [ ] Geocoding ambiguity: return ranked candidates.
- [ ] Tests: zone boundary, route fallback, multi-stop optimization.

### 1.10 `realtime-presence-core` 📋 SCAFFOLDED

Acceptance:
- [ ] 5 resources: sessions, channels, locations, typing-states,
      heartbeats.
- [ ] 7 actions: session.start, .end, heartbeat.record, location.update,
      channel.join, .leave, typing.update.
- [ ] Presence retention ≤ 24h by default; configurable per channel.
- [ ] Out-of-order location update reconciliation.
- [ ] Auth on channel join.
- [ ] Tests: missed heartbeat → offline, stale session reconnect.

### 1.11 `wallet-ledger-core` 📋 SCAFFOLDED

Acceptance:
- [ ] 6 resources: accounts, ledger-entries, holds, payouts, adjustments,
      reconciliation-runs.
- [ ] 8 actions: account.open, credit, debit, hold.place, hold.release,
      payout.request, payout.approve, reconcile.
- [ ] Double-entry invariant: every credit has a matching debit.
- [ ] Hold lifecycle: place → release-or-capture.
- [ ] KYC gate before payout.
- [ ] Currency mismatch rejection.
- [ ] Tests: chargeback-after-settlement, double-credit-on-retry,
      negative-balance protection.

### 1.12 `promotions-loyalty-core` 📋 SCAFFOLDED

Acceptance:
- [ ] 5 resources: campaigns, coupons, redemptions, loyalty-accounts,
      referrals.
- [ ] Stacking conflict resolution rules.
- [ ] Refund handling: cashback computed on refunded line should reverse.
- [ ] Self-referral block.
- [ ] Seller-funded vs platform-funded attribution.

### 1.13 `ads-campaign-core` 📋 SCAFFOLDED

Acceptance:
- [ ] 8 resources: accounts, campaigns, ad-groups, creatives, budgets,
      targeting-rules, conversions, leads.
- [ ] Creative moderation handoff to `trust-safety-core`.
- [ ] Budget pacing + overspend protection.
- [ ] Conversion attribution (last-touch + view-through).
- [ ] Lead form spam filter.

### 1.14 `media-processing-core` 📋 SCAFFOLDED

Acceptance:
- [ ] 6 resources: assets, jobs, renditions, thumbnails, captions,
      transcode-profiles.
- [ ] 7 actions: assets.ingest, processing.start, .cancel,
      rendition.publish, caption.attach, thumbnail.generate,
      asset.quarantine.
- [ ] Trust-safety hold before publish.
- [ ] Tenant quota check before transcode.
- [ ] Duplicate detection by content hash.
- [ ] Signed playback URL TTL.

## Phase 2 — Commerce/operations (6 plugins)

Each plugin's acceptance criteria mirrors its instruction-plan §5 entry.
Phase 2 plugins compose Phase 1 primitives — they MUST hard-depend on
the relevant horizontal primitive (e.g. `marketplace-core` depends on
`commerce-storefront-core` if available, recommends it otherwise).

- [ ] **2.1** `marketplace-core` — multi-seller commerce. Acceptance: §5.1
      (seller onboarding, listing approval, cart split, settlement,
      dispute, SLA scorecard).
- [ ] **2.2** `quick-commerce-core` — dark stores, picker/packer, ETA.
      Acceptance: §5.2.
- [ ] **2.3** `restaurant-delivery-core` — outlets, menus, KOT, complaints.
      Acceptance: §5.3.
- [ ] **2.4** `last-mile-dispatch-core` — delivery jobs, riders, POD, COD.
      Acceptance: §5.4.
- [ ] **2.5** `rental-core` — assets, reservations, deposits, inspections.
      Acceptance: §5.12.
- [ ] **2.6** `membership-access-core` — tiers, gated content, drip.
      Acceptance: §5.11.

## Phase 3 — Social/media/mobility (6 plugins)

- [ ] **3.1** `mobility-rides-core` — trips, driver matching, fare. §5.5.
- [ ] **3.2** `media-streaming-core` — titles, playback, rights. §5.6.
- [ ] **3.3** `social-graph-core` — follow/friend/block/page/group. §5.7.
- [ ] **3.4** `posts-engagement-core` — posts, comments, reactions. §5.8.
- [ ] **3.5** `short-video-core` — TikTok-style. §5.9.
- [ ] **3.6** `professional-network-core` — LinkedIn-style. §5.10.

## Phase 4 — Advanced platform/research (6 plugins)

- [ ] **4.1** `cloud-platform-core` — projects, deployments, secrets. §5.13.
- [ ] **4.2** `research-ops-core` — studies, protocols, findings. §5.14.
- [ ] **4.3** `dataset-governance-core` — lineage, consent, license. §5.15.
- [ ] **4.4** `model-registry-core` — versions, approvals, lineage. §5.16.
- [ ] **4.5** `experiment-tracking-core` — runs, metrics, comparisons. §5.17.
- [ ] **4.6** `regulated-ai-compliance-core` — risk classes, evidence. §5.18.

## Phase 5 — Clone packs (13 packs)

Packs are JSON-only ships. Each acceptance criterion is "pack JSON validates;
all referenced plugins load; smoke test on installed pack reaches the §9
acceptance test in the instruction plan."

- [ ] **5.1** `pack-marketplace`
- [ ] **5.2** `pack-quick-commerce`
- [ ] **5.3** `pack-food-delivery`
- [ ] **5.4** `pack-ride-hailing`
- [ ] **5.5** `pack-media-streaming`
- [ ] **5.6** `pack-audio-streaming`
- [ ] **5.7** `pack-social-network`
- [ ] **5.8** `pack-short-video-social`
- [ ] **5.9** `pack-professional-network`
- [ ] **5.10** `pack-membership-site`
- [ ] **5.11** `pack-rental-business`
- [ ] **5.12** `pack-ai-research-company`
- [ ] **5.13** `pack-cloud-saas-platform`

## Phase 6 — Cross-cutting

- [ ] Smoke harness `scripts/internet-products-smoke.ts` runs on every PR.
- [ ] CI green on full suite (backend `bun test`, frontend `tsc`, smoke).
- [ ] Docs cross-linked from `gutu-docs/docs/`.
- [ ] Operator runbook for installing each pack.
- [ ] Release notes when each phase lands.

## What ships in THIS commit

| Item | Status |
|---|---|
| Phase 0 foundation | done in prior commits |
| Phase 1.1 `entitlements-core` end-to-end | **shipping now** |
| Phase 1.2–1.14 manifest-only scaffolds | **shipping now** |
| Phase 2–4 manifest-only scaffolds | **shipping now** |
| Phase 5 (13 packs) JSON specs | **shipping now** |
| Phase 1.2–4.6 behavioral implementation | follow-up sessions, mechanically replicating the entitlements-core template |
