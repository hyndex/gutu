# Internet-Product Clone Framework — Implementation Blueprint

Last updated: 2026-04-30
Status: **Phase 1 reference implementation landed; Phases 2–4 scaffolded.**

## 1. Goal

Let builders ship products in the shape of Netflix, Amazon, Uber, Instagram,
TikTok, LinkedIn, Zomato, Blinkit, MemberPress, Vercel/Heroku/Supabase,
Turo-style rentals, and AI-research operators **without** writing a "Netflix
plugin" or an "Uber plugin." The framework ships **reusable horizontal +
vertical domain plugins** plus **clone packs** that compose them into
specific product templates.

## 2. Expected outcome

After this blueprint is fully executed, the framework gains:

- **14 horizontal internet primitive plugins** (entitlements, storefront,
  reviews, feed, recommendations, messaging, trust-safety, usage-metering,
  geospatial-routing, realtime-presence, wallet-ledger, promotions-loyalty,
  ads-campaign, media-processing).
- **18 vertical domain plugins** (marketplace, quick-commerce,
  restaurant-delivery, last-mile-dispatch, mobility-rides, media-streaming,
  social-graph, posts-engagement, short-video, professional-network,
  membership-access, rental, cloud-platform, research-ops, dataset-governance,
  model-registry, experiment-tracking, regulated-ai-compliance).
- **13 clone packs** (marketplace, quick-commerce, food-delivery,
  ride-hailing, media-streaming, audio-streaming, social-network, short-video,
  professional-network, membership-site, rental-business, ai-research-company,
  cloud-saas-platform).

Every plugin follows the **same Gutu HostPlugin contract** that
`accounting-core`, `sales-core`, `inventory-core` already use today, plus
the new declarative `resources` field landed by the prior commit.

## 3. Architectural approach

```
┌─────────────────────────────────────────────────────────────────┐
│  Existing Gutu foundation (auth, tenancy, audit, workflow, …)   │
├─────────────────────────────────────────────────────────────────┤
│                Horizontal internet primitives                   │
│  entitlements · storefront · reviews · feed · recommendations   │
│  messaging · trust-safety · usage-metering · geospatial-routing │
│  realtime-presence · wallet-ledger · promotions-loyalty · ads   │
│  media-processing                                               │
├─────────────────────────────────────────────────────────────────┤
│                  Vertical domain plugins                        │
│  marketplace · quick-commerce · restaurant-delivery · …         │
│  mobility-rides · media-streaming · social-graph · short-video  │
│  rental · cloud-platform · research-ops · model-registry · …    │
├─────────────────────────────────────────────────────────────────┤
│              Clone packs (product templates)                    │
│  pack-marketplace · pack-quick-commerce · pack-food-delivery    │
│  pack-ride-hailing · pack-media-streaming · pack-short-video    │
│  pack-membership-site · pack-rental-business · …                │
└─────────────────────────────────────────────────────────────────┘
```

**Three-tier composition rule** — every plugin is one of:

- **Horizontal primitive**: reused by many products (e.g. `entitlements-core`
  is consumed by streaming, membership, SaaS, research).
- **Vertical domain**: encodes the rules of one product family (e.g.
  `marketplace-core` encodes seller onboarding, listing approval, commission,
  settlement, dispute).
- **Pack**: ships zero new code; composes existing plugins + roles +
  workflows + dashboards + sample data into a turnkey product template.

**Hard rule**: plugins never read each other's tables. All cross-plugin
interactions go through Actions, Events, or registered capabilities.

## 4. Impacted components

### 4.1 New repositories (32 plugins + 13 packs)

| Layer | New repos |
|---|---|
| Horizontal primitives (Phase 1) | `gutu-plugin-entitlements-core`, `gutu-plugin-commerce-storefront-core`, `gutu-plugin-reviews-ratings-core`, `gutu-plugin-feed-core`, `gutu-plugin-recommendations-core`, `gutu-plugin-messaging-core`, `gutu-plugin-trust-safety-core`, `gutu-plugin-usage-metering-core`, `gutu-plugin-geospatial-routing-core`, `gutu-plugin-realtime-presence-core`, `gutu-plugin-wallet-ledger-core`, `gutu-plugin-promotions-loyalty-core`, `gutu-plugin-ads-campaign-core`, `gutu-plugin-media-processing-core` |
| Commerce/operations (Phase 2) | `gutu-plugin-marketplace-core`, `gutu-plugin-quick-commerce-core`, `gutu-plugin-restaurant-delivery-core`, `gutu-plugin-last-mile-dispatch-core`, `gutu-plugin-rental-core`, `gutu-plugin-membership-access-core` |
| Social/media/mobility (Phase 3) | `gutu-plugin-mobility-rides-core`, `gutu-plugin-media-streaming-core`, `gutu-plugin-social-graph-core`, `gutu-plugin-posts-engagement-core`, `gutu-plugin-short-video-core`, `gutu-plugin-professional-network-core` |
| Advanced platform/research (Phase 4) | `gutu-plugin-cloud-platform-core`, `gutu-plugin-research-ops-core`, `gutu-plugin-dataset-governance-core`, `gutu-plugin-model-registry-core`, `gutu-plugin-experiment-tracking-core`, `gutu-plugin-regulated-ai-compliance-core` |
| Packs | `pack-marketplace`, `pack-quick-commerce`, `pack-food-delivery`, `pack-ride-hailing`, `pack-media-streaming`, `pack-audio-streaming`, `pack-social-network`, `pack-short-video-social`, `pack-professional-network`, `pack-membership-site`, `pack-rental-business`, `pack-ai-research-company`, `pack-cloud-saas-platform` |

### 4.2 Existing components touched

- `admin-panel/backend/package.json` `gutuPlugins` array (32 new entries).
- `admin-panel/backend/src/host/plugin-contract.ts` (already extended with
  `resources` field — done in prior commit).
- `admin-panel/backend/src/host/discover.ts` (no change needed; npm-name
  discovery already works for new packages).
- `admin-panel/src/host/AdminUiContribution` UI plugin set (per-pack as
  needed; not in scope of Phase 1 backend ship).
- `docs/internet-products/` (this directory).

### 4.3 Reused without modification

Every existing first-party plugin is a building block that the new plugins
declare as `dependsOn`. No edits are required to the existing plugins to
support the new ones.

## 5. Business logic requirements

### 5.1 Plugin contract uniformity

Every new plugin **must** export `hostPlugin: HostPlugin` with at minimum:

- `id` matching `<plugin-id>` exactly.
- `version` semver.
- `manifest` with `label`, `description`, `vendor`, `permissions`.
- `dependsOn` (hard deps only; recommended/enhancing deps documented in
  README, not enforced).
- `resources[]` — **declarative**, per the contract refactor that landed in
  the prior commit. Auto-registered into the UI catalog at `loadPlugins()`
  time and feeds the resource-write gate's namespace allow-list.
- `migrate()` if the plugin owns DB tables.
- `routes[]` if the plugin exposes HTTP endpoints.

### 5.2 Action-Event-Job triad

Every state mutation goes through an **action** that:

1. Validates inputs (zod-validated request body).
2. Authorizes via global role + per-record ACL.
3. Writes the record (via the host's resource-write API or the plugin's
   own table) inside a transaction.
4. Records an **immutable domain event** via `recordAudit` + the in-process
   event bus.
5. Optionally enqueues **follow-up jobs** for async work.
6. Returns a **command envelope** carrying actionId, requestId, status,
   resource ref, events emitted, follow-up jobs, and audit refs.

This pattern is already used by `notifications-core`, `webhooks-core`,
`workflow-core`, `accounting-core`, `sales-core`. New plugins follow the
same shape.

### 5.3 Plugin-namespace allowlist

The host's resource-write gate (`requireKnownResource` in
[routes/resources.ts](../../admin-panel/backend/src/routes/resources.ts))
already derives its namespace allow-list from each loaded plugin's
`resources[]` declaration. No host edits needed when a new plugin lands —
the dynamic allow-list adapts automatically.

### 5.4 Cross-plugin composition

Plugins compose via four mechanisms — they **must not** import each other's
internals:

| Mechanism | When to use |
|---|---|
| Action call (sync) | One synchronous mutation in another plugin |
| Durable event (async) | React to another plugin's state change |
| Cross-plugin registry (`ctx.registries.ns(...)`) | Looking up a capability another plugin provides (e.g. `notifications.dispatch`) |
| Workflow step | Multi-step orchestration with approvals |

### 5.5 Pack composition

Packs are **declarative JSON** in `packs/<name>/pack.json`:

```json
{
  "id": "pack-marketplace",
  "version": "1.0.0",
  "label": "Marketplace clone pack",
  "plugins": ["entitlements-core", "commerce-storefront-core", "marketplace-core", "..."],
  "roles": [{ "id": "marketplace_operator", "permissions": ["..."] }],
  "dashboards": ["GMV", "orders-by-seller", "seller-sla"],
  "sampleData": "sample-data.json"
}
```

A pack installer reads the JSON and: (a) verifies every named plugin is in
the loaded HOST_PLUGINS, (b) seeds the roles/permissions, (c) imports the
sample data, (d) registers the dashboards.

## 6. Edge cases (cross-cutting)

| Class | Edge case | Handling |
|---|---|---|
| **Rights/grants timing** | Subscription paid but webhook delayed | `entitlements-core` issues a grace grant with TTL; reconciles when webhook lands |
| **Race conditions** | Two customers buy last unit simultaneously | `inventory-core` uses SELECT FOR UPDATE / row-version check; one wins, the other gets out-of-stock at checkout |
| **Quota burst** | AI tenant exceeds quota mid-request | `usage-metering-core.quotas.reserve` reserves units BEFORE the call; release on success/failure |
| **Compensation** | Sales order created, payment failed | Workflow step pattern: confirm payment intent first, then `sales.order.confirm`. Failed payment → compensating `sales.order.cancel` action |
| **Idempotency** | Network retry duplicates the action | Every action accepts `idempotencyKey`; the host stores it in the audit trail and short-circuits on duplicate |
| **Audit** | Operator needs proof of every grant/decision | Every action emits a domain event; the audit chain (already implemented) keeps prev_hash linked |
| **Quarantine** | Plugin fails to migrate | `loadPlugins` quarantines the failing plugin; other plugins continue to work; status surfaces on `/api/_plugins` |
| **Tenant isolation** | Cross-tenant data leak | All queries scope by `tenantId` from `getTenantContext()`; verified by tenant-isolation tests in each plugin |
| **Region/age gating** | Streaming title out of region | `entitlements-core.access.check` evaluates region + age + plan + device limits per request |
| **Soft-delete** | Record deleted after referenced elsewhere | Soft-delete leaves the row with `status='deleted'`; reads filter it out unless `?includeDeleted=1`; foreign references survive |

## 7. Testing & validation strategy

### 7.1 Per-plugin test pyramid

| Layer | What it asserts | Tool |
|---|---|---|
| Unit (`*.test.ts` next to source) | Pure functions: validators, decision rules, calculators | `bun test` |
| Contract | Action input/output schemas, event shapes | `bun test` + zod parse on fixture |
| Migration | Schema is idempotent across versions | `bun test` running `migrate()` twice |
| Integration | Action + event + DB + cross-plugin happy path | `bun test` against in-memory SQLite + loaded plugin set |
| Acceptance | Per-pack flows end-to-end | `bun test` running pack-level scripts |

### 7.2 Cross-plugin acceptance suites

One acceptance test per pack (Section 9 of the instruction plan), e.g.:

- `pack-marketplace`: seller onboarding → listing approval → cart split → settlement → dispute happy path
- `pack-media-streaming`: trial entitlement → playback → quota cap → device limit
- `pack-ride-hailing`: driver online → match → trip lifecycle → wallet payout

These run against the full plugin set in CI.

### 7.3 Verification harness

A repo-level smoke test (`scripts/internet-products-smoke.ts`) asserts:

- All 32 plugins are listed in `HOST_PLUGINS`.
- All 32 manifests load without error.
- Every plugin's declared resources appear in `/api/ui/resources`.
- Every pack's referenced plugins are in HOST_PLUGINS.
- The plugin-namespace allow-list (derived from `resources[]`) covers every
  pack's plugin namespaces.

This runs in <30s and gates every PR.

## 8. Phased TODO with acceptance criteria

See [`01-todo.md`](./01-todo.md) for the complete phased TODO list.

## 9. Final verification checklist

See [`02-verification.md`](./02-verification.md) for the gate every release
must pass.

## 10. Reference implementation

The `entitlements-core` plugin (Phase 1, item 1) is shipped end-to-end as
the canonical reference. Every other plugin should mirror its structure:

```
plugins/gutu-plugin-entitlements-core/
  package.json
  README.md
  framework/builtin-plugins/entitlements-core/
    src/
      manifest.ts
      host-plugin/
        index.ts                # HostPlugin export
        db/migrate.ts           # CREATE TABLE
        routes/                 # Hono routers per concern
        actions/                # one file per action; zod-validated
        events/                 # event type literals + emit helpers
        jobs/                   # leader-elected periodic work
        workflows/              # state machine definitions
        services/               # decision engine + helpers
        lib/                    # cross-plugin barrel
      tests/                    # unit + integration
```

Plugins 2–32 inherit this layout via the existing scaffolder
(`bun run scaffold:plugin <id>`) plus the resource declarations baked into
each manifest.

## 11. Out-of-scope for this blueprint

The following are intentionally not addressed here and are tracked in
separate work items:

- Native mobile shell apps (rider/driver/picker/packer apps for the
  operations packs).
- Multi-region replication topology.
- Custom analytics warehouse beyond what `analytics-bi-core` provides.
- Third-party adapters (e.g. Stripe Connect, Twilio Programmable Voice,
  Mapbox, AWS Elemental MediaLive). Adapters are separate plugins that
  bridge first-party Gutu plugins to vendor APIs.
