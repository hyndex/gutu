#!/usr/bin/env bun
/** Mass scaffolder for the Internet-Product Clone Framework.
 *
 *   bun run scripts/scaffold-internet-products.ts
 *
 *  Idempotent — skips plugins that already exist. Generates 31
 *  manifest-only plugins (the 32nd, entitlements-core, is the
 *  hand-built reference). Each plugin is created with the standard
 *  Gutu plugin layout PLUS a populated `resources` declaration so the
 *  catalog gate accepts writes from boot. Behavior (actions, events,
 *  jobs, workflows) ships as TODO markers — see
 *  `docs/internet-products/01-todo.md` for per-plugin acceptance
 *  criteria.
 *
 *  Also patches admin-panel/backend/package.json + tsconfig.json so
 *  the new plugins are discovered and resolvable. */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

interface PluginSpec {
  id: string;
  label: string;
  description: string;
  icon: string;
  dependsOn: string[];
  resources: string[];
}

const PLUGINS: PluginSpec[] = [
  // ─── Phase 1: horizontal internet primitives ─────────────
  {
    id: "commerce-storefront-core",
    label: "Commerce Storefront",
    description: "Consumer storefront sessions, carts, wishlists, checkout-intents, customer order pages.",
    icon: "ShoppingCart",
    dependsOn: ["auth-core"],
    resources: [
      "storefront.sessions",
      "storefront.carts",
      "storefront.wishlists",
      "storefront.checkout-intents",
      "storefront.customer-order-pages",
    ],
  },
  {
    id: "reviews-ratings-core",
    label: "Reviews & Ratings",
    description: "Universal rating/review engine for products, sellers, drivers, content.",
    icon: "Star",
    dependsOn: ["auth-core"],
    resources: [
      "reviews.subjects",
      "reviews.reviews",
      "reviews.ratings",
      "reviews.aggregates",
      "reviews.moderation-states",
    ],
  },
  {
    id: "feed-core",
    label: "Feeds & Timelines",
    description: "Materialized feeds for social home, marketplace discovery, creator feeds, trending.",
    icon: "Rss",
    dependsOn: ["auth-core"],
    resources: [
      "feeds.definitions",
      "feeds.items",
      "feeds.materialized-timelines",
      "feeds.user-preferences",
      "feeds.experiments",
    ],
  },
  {
    id: "recommendations-core",
    label: "Recommendations",
    description: "Candidate generation and ranking signals for products, videos, audio, restaurants, jobs.",
    icon: "Sparkles",
    dependsOn: ["auth-core"],
    resources: [
      "recommendations.models",
      "recommendations.candidates",
      "recommendations.ranking-rules",
      "recommendations.experiments",
      "recommendations.feedback-events",
    ],
  },
  {
    id: "messaging-core",
    label: "Messaging",
    description: "Direct/group/business chat, business inboxes, order/trip conversation threads.",
    icon: "MessageCircle",
    dependsOn: ["auth-core", "notifications-core"],
    resources: [
      "messaging.threads",
      "messaging.messages",
      "messaging.participants",
      "messaging.read-receipts",
      "messaging.attachments",
      "messaging.moderation-holds",
    ],
  },
  {
    id: "trust-safety-core",
    label: "Trust & Safety",
    description: "Reports, cases, policies, decisions, restrictions, appeals, risk scoring.",
    icon: "ShieldAlert",
    dependsOn: ["auth-core", "workflow-core"],
    resources: [
      "trust.reports",
      "trust.cases",
      "trust.policies",
      "trust.decisions",
      "trust.restrictions",
      "trust.appeals",
      "trust.risk-scores",
    ],
  },
  {
    id: "usage-metering-core",
    label: "Usage Metering",
    description: "Quotas, usage events, aggregates, overage rules, billing snapshots for AI/SaaS/streaming.",
    icon: "Gauge",
    dependsOn: ["auth-core"],
    resources: [
      "usage.meters",
      "usage.events",
      "usage.aggregates",
      "usage.quotas",
      "usage.overage-rules",
      "usage.billing-snapshots",
    ],
  },
  {
    id: "geospatial-routing-core",
    label: "Geospatial Routing",
    description: "Service areas, geofences, ETA estimates, route + distance matrices.",
    icon: "Map",
    dependsOn: ["auth-core"],
    resources: [
      "geo.service-areas",
      "geo.geofences",
      "geo.points",
      "geo.routes",
      "geo.eta-estimates",
      "geo.distance-matrices",
    ],
  },
  {
    id: "realtime-presence-core",
    label: "Realtime Presence",
    description: "Online state, live location, typing, watch presence, heartbeats.",
    icon: "Radio",
    dependsOn: ["auth-core"],
    resources: [
      "presence.sessions",
      "presence.channels",
      "presence.locations",
      "presence.typing-states",
      "presence.heartbeats",
    ],
  },
  {
    id: "wallet-ledger-core",
    label: "Wallet & Ledger",
    description: "User/seller/driver/creator wallets, holds, payouts, ledger entries, reconciliation.",
    icon: "Wallet",
    dependsOn: ["auth-core", "accounting-core", "treasury-core"],
    resources: [
      "wallet.accounts",
      "wallet.ledger-entries",
      "wallet.holds",
      "wallet.payouts",
      "wallet.adjustments",
      "wallet.reconciliation-runs",
    ],
  },
  {
    id: "promotions-loyalty-core",
    label: "Promotions & Loyalty",
    description: "Coupons, campaigns, redemptions, loyalty accounts, referrals, cashback.",
    icon: "Gift",
    dependsOn: ["auth-core", "pricing-tax-core"],
    resources: [
      "promotions.campaigns",
      "promotions.coupons",
      "promotions.redemptions",
      "promotions.loyalty-accounts",
      "promotions.referrals",
    ],
  },
  {
    id: "ads-campaign-core",
    label: "Ads & Campaigns",
    description: "Native ads accounts, campaigns, ad groups, creatives, budgets, conversions, leads.",
    icon: "Megaphone",
    dependsOn: ["auth-core"],
    resources: [
      "ads.accounts",
      "ads.campaigns",
      "ads.ad-groups",
      "ads.creatives",
      "ads.budgets",
      "ads.targeting-rules",
      "ads.conversions",
      "ads.leads",
    ],
  },
  {
    id: "media-processing-core",
    label: "Media Processing",
    description: "Upload ingest, transcoding, thumbnails, captions, rendition state.",
    icon: "Film",
    dependsOn: ["auth-core"],
    resources: [
      "media-processing.assets",
      "media-processing.jobs",
      "media-processing.renditions",
      "media-processing.thumbnails",
      "media-processing.captions",
      "media-processing.transcode-profiles",
    ],
  },
  // ─── Phase 2: commerce/operations ─────────────
  {
    id: "marketplace-core",
    label: "Marketplace",
    description: "Multi-seller marketplace: onboarding, listings, commission, settlement, dispute.",
    icon: "Store",
    dependsOn: ["auth-core", "workflow-core"],
    resources: [
      "marketplace.sellers",
      "marketplace.seller-stores",
      "marketplace.listings",
      "marketplace.offers",
      "marketplace.order-splits",
      "marketplace.commission-rules",
      "marketplace.settlements",
      "marketplace.disputes",
      "marketplace.sla-scorecards",
    ],
  },
  {
    id: "quick-commerce-core",
    label: "Quick Commerce",
    description: "Dark-store ops: serviceability, picker/packer tasks, substitutions, ETA promises.",
    icon: "Zap",
    dependsOn: ["auth-core"],
    resources: [
      "quick-commerce.dark-stores",
      "quick-commerce.service-zones",
      "quick-commerce.delivery-promises",
      "quick-commerce.picker-tasks",
      "quick-commerce.packer-tasks",
      "quick-commerce.substitutions",
      "quick-commerce.store-load-states",
      "quick-commerce.shelf-life-rules",
    ],
  },
  {
    id: "restaurant-delivery-core",
    label: "Restaurant Delivery",
    description: "Outlets, menus, KOTs, food orders, prep-time, packaging, complaints.",
    icon: "Utensils",
    dependsOn: ["auth-core"],
    resources: [
      "restaurants.restaurants",
      "restaurants.outlets",
      "restaurants.menus",
      "restaurants.menu-items",
      "restaurants.modifier-groups",
      "restaurants.kitchen-tickets",
      "restaurants.food-orders",
      "restaurants.prep-time-rules",
      "restaurants.packaging-rules",
      "restaurants.complaints",
    ],
  },
  {
    id: "last-mile-dispatch-core",
    label: "Last-mile Dispatch",
    description: "Delivery jobs, riders, pickup/drop points, POD, COD, return pickups.",
    icon: "Truck",
    dependsOn: ["auth-core", "workflow-core"],
    resources: [
      "dispatch.delivery-jobs",
      "dispatch.riders",
      "dispatch.pickup-points",
      "dispatch.drop-points",
      "dispatch.routes",
      "dispatch.proof-of-delivery",
      "dispatch.cod-collections",
      "dispatch.failed-deliveries",
      "dispatch.return-pickups",
    ],
  },
  {
    id: "rental-core",
    label: "Rentals",
    description: "Rentable assets, reservations, deposits, inspections, damage claims, late fees.",
    icon: "KeyRound",
    dependsOn: ["auth-core"],
    resources: [
      "rental.assets",
      "rental.availability",
      "rental.reservations",
      "rental.agreements",
      "rental.deposits",
      "rental.checkout-inspections",
      "rental.checkin-inspections",
      "rental.damage-claims",
      "rental.late-fees",
      "rental.maintenance-blocks",
    ],
  },
  {
    id: "membership-access-core",
    label: "Membership Access",
    description: "Paid memberships, gated content, drip schedules, member benefits, trials, grace.",
    icon: "BadgeCheck",
    dependsOn: ["auth-core", "entitlements-core"],
    resources: [
      "membership.tiers",
      "membership.access-rules",
      "membership.protected-content",
      "membership.drip-schedules",
      "membership.benefits",
      "membership.trials",
      "membership.member-states",
    ],
  },
  // ─── Phase 3: social/media/mobility ─────────────
  {
    id: "mobility-rides-core",
    label: "Mobility Rides",
    description: "Real-time ride-hailing: drivers, riders, trips, fare, surge, safety incidents.",
    icon: "Car",
    dependsOn: ["auth-core", "workflow-core"],
    resources: [
      "rides.riders",
      "rides.drivers",
      "rides.vehicles",
      "rides.trip-requests",
      "rides.trips",
      "rides.fare-estimates",
      "rides.surge-zones",
      "rides.driver-offers",
      "rides.safety-incidents",
      "rides.lost-item-cases",
    ],
  },
  {
    id: "media-streaming-core",
    label: "Media Streaming",
    description: "OTT/audio titles, episodes, playback sessions, rights windows, age ratings.",
    icon: "PlayCircle",
    dependsOn: ["auth-core", "entitlements-core"],
    resources: [
      "media.titles",
      "media.series",
      "media.seasons",
      "media.episodes",
      "media.audio-shows",
      "media.chapters",
      "media.playback-sessions",
      "media.progress",
      "media.rights-windows",
      "media.age-ratings",
      "media.watchlists",
    ],
  },
  {
    id: "social-graph-core",
    label: "Social Graph",
    description: "Profiles, follows, friendships, blocks, pages, groups, memberships.",
    icon: "Users",
    dependsOn: ["auth-core"],
    resources: [
      "social.profiles",
      "social.follows",
      "social.friendships",
      "social.blocks",
      "social.pages",
      "social.groups",
      "social.memberships",
    ],
  },
  {
    id: "posts-engagement-core",
    label: "Posts & Engagement",
    description: "Posts, comments, reactions, shares, mentions, hashtags, counters.",
    icon: "Heart",
    dependsOn: ["auth-core"],
    resources: [
      "engagement.posts",
      "engagement.comments",
      "engagement.reactions",
      "engagement.shares",
      "engagement.mentions",
      "engagement.hashtags",
      "engagement.counters",
    ],
  },
  {
    id: "short-video-core",
    label: "Short Video",
    description: "TikTok/Reels-style short-form video: uploads, sounds, effects, duets, watch events.",
    icon: "Video",
    dependsOn: ["auth-core"],
    resources: [
      "short-video.videos",
      "short-video.sounds",
      "short-video.effects",
      "short-video.templates",
      "short-video.duets",
      "short-video.stitches",
      "short-video.watch-events",
      "short-video.creator-analytics",
    ],
  },
  {
    id: "professional-network-core",
    label: "Professional Network",
    description: "LinkedIn-style: profiles, company pages, jobs, applications, recruiter pipelines.",
    icon: "Briefcase",
    dependsOn: ["auth-core"],
    resources: [
      "professional.profiles",
      "professional.company-pages",
      "professional.experiences",
      "professional.skills",
      "professional.endorsements",
      "professional.job-posts",
      "professional.applications",
      "professional.recruiter-pipelines",
    ],
  },
  // ─── Phase 4: advanced platform/research ─────────────
  {
    id: "cloud-platform-core",
    label: "Cloud Platform",
    description: "Projects, environments, deployments, secrets, quotas, domains, log streams.",
    icon: "Cloud",
    dependsOn: ["auth-core", "workflow-core", "entitlements-core"],
    resources: [
      "cloud.projects",
      "cloud.environments",
      "cloud.deployments",
      "cloud.builds",
      "cloud.runtime-services",
      "cloud.domains",
      "cloud.secrets",
      "cloud.api-keys",
      "cloud.quotas",
      "cloud.log-streams",
      "cloud.metrics",
      "cloud.incidents",
    ],
  },
  {
    id: "research-ops-core",
    label: "Research Operations",
    description: "Studies, hypotheses, protocols, experiments, findings, review packets.",
    icon: "FlaskConical",
    dependsOn: ["auth-core", "workflow-core"],
    resources: [
      "research.projects",
      "research.hypotheses",
      "research.protocols",
      "research.studies",
      "research.experiments",
      "research.findings",
      "research.review-packets",
    ],
  },
  {
    id: "dataset-governance-core",
    label: "Dataset Governance",
    description: "Dataset lineage, consent, license, sensitivity, retention, access.",
    icon: "Database",
    dependsOn: ["auth-core", "entitlements-core"],
    resources: [
      "datasets.datasets",
      "datasets.versions",
      "datasets.lineage",
      "datasets.consent-records",
      "datasets.license-terms",
      "datasets.retention-policies",
      "datasets.access-requests",
    ],
  },
  {
    id: "model-registry-core",
    label: "Model Registry",
    description: "Models, versions, artifacts, evaluations, approvals, deployments, lineage.",
    icon: "BoxesStack",
    dependsOn: ["auth-core", "workflow-core"],
    resources: [
      "models.models",
      "models.versions",
      "models.artifacts",
      "models.evaluations",
      "models.approvals",
      "models.deployments",
      "models.lineage",
    ],
  },
  {
    id: "experiment-tracking-core",
    label: "Experiment Tracking",
    description: "Runs, parameters, metrics, artifacts, comparisons.",
    icon: "LineChart",
    dependsOn: ["auth-core"],
    resources: [
      "experiments.runs",
      "experiments.parameters",
      "experiments.metrics",
      "experiments.artifacts",
      "experiments.comparisons",
    ],
  },
  {
    id: "regulated-ai-compliance-core",
    label: "Regulated AI Compliance",
    description: "Risk classes, controls, evidence packs, approval gates, incidents, audit reports.",
    icon: "FileLock",
    dependsOn: ["auth-core", "workflow-core"],
    resources: [
      "regulated-ai.risk-classes",
      "regulated-ai.controls",
      "regulated-ai.evidence-packs",
      "regulated-ai.approval-gates",
      "regulated-ai.incidents",
      "regulated-ai.audit-reports",
    ],
  },
];

const ROOT = path.resolve(__dirname, "..");
const BACKEND_PKG = path.join(ROOT, "admin-panel/backend/package.json");
const BACKEND_TSCONFIG = path.join(ROOT, "admin-panel/backend/tsconfig.json");

function camel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function generatePlugin(spec: PluginSpec): boolean {
  const pluginDir = path.join(ROOT, "plugins", `gutu-plugin-${spec.id}`);
  if (existsSync(pluginDir)) return false;

  const hp = path.join(pluginDir, "framework/builtin-plugins", spec.id, "src/host-plugin");
  mkdirSync(path.join(hp, "db"), { recursive: true });
  mkdirSync(path.join(hp, "routes"), { recursive: true });
  mkdirSync(path.join(hp, "lib"), { recursive: true });

  const npmName = `@gutu-plugin/${spec.id}`;
  const tableSafe = spec.id.replace(/-/g, "_");
  const routeMount = "/" + spec.id.replace(/-core$/, "");

  // package.json
  writeFileSync(path.join(pluginDir, "package.json"), JSON.stringify({
    name: npmName,
    version: "1.0.0",
    private: true,
    type: "module",
    exports: {
      ".": `./framework/builtin-plugins/${spec.id}/src/host-plugin/index.ts`,
    },
  }, null, 2) + "\n");

  // README
  writeFileSync(path.join(pluginDir, "README.md"), `# ${spec.label}

${spec.description}

**Status**: scaffold-only. Resources are declared and the plugin loads
into HOST_PLUGINS, but actions/events/jobs/workflows are TODOs. See
[docs/internet-products/01-todo.md](../../docs/internet-products/01-todo.md)
for per-plugin acceptance criteria.

## Resources

${spec.resources.map((r) => `- \`${r}\``).join("\n")}

## Hard dependencies

${spec.dependsOn.map((d) => `- \`${d}\``).join("\n")}

## Author guide

Use \`gutu-plugin-entitlements-core\` as the canonical reference. Mirror
its structure: actions/, events/, jobs/, services/, tests/. Every action
returns \`CommandResult<T>\`; every state change emits a domain event via
\`recordAudit\`.
`);

  // tsconfig.base.json
  writeFileSync(path.join(pluginDir, "tsconfig.base.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      isolatedModules: true,
      types: ["bun-types", "react", "react-dom"],
      jsx: "react-jsx",
      baseUrl: ".",
    },
  }, null, 2) + "\n");

  // tsconfig.json
  writeFileSync(path.join(pluginDir, "framework/builtin-plugins", spec.id, "tsconfig.json"), JSON.stringify({
    extends: "../../../tsconfig.base.json",
    compilerOptions: {
      noEmit: true,
      baseUrl: ".",
      paths: {
        "@gutu-host": ["../../../../../admin-panel/backend/src/host/index.ts"],
        "@gutu-host/*": ["../../../../../admin-panel/backend/src/host/*"],
      },
    },
    include: ["src/**/*.ts", "src/**/*.tsx"],
  }, null, 2) + "\n");

  // db/migrate.ts — minimal placeholder; each plugin owns its own
  // schema and ships richer migrations with behavioral implementation.
  writeFileSync(path.join(hp, "db/migrate.ts"), `/** ${spec.id} schema — placeholder.
 *
 *  TODO: define CREATE TABLE statements for the plugin's resources.
 *  See gutu-plugin-entitlements-core/db/migrate.ts for the canonical
 *  pattern. Until that lands, the plugin is functional for the catalog
 *  gate (resources are declared on the manifest) but cannot persist
 *  records — POSTs will fail at insertRecord time. */

import { db } from "@gutu-host";

export function migrate(): void {
  // TODO: CREATE TABLE IF NOT EXISTS <table> ( … )
  void db;
}
`);

  // routes/<id>.ts — placeholder
  writeFileSync(path.join(hp, `routes/${spec.id}.ts`), `/** ${spec.id} REST API — placeholder.
 *
 *  TODO: implement routes for the actions listed in
 *  docs/internet-products/01-todo.md §1.x for this plugin. */

import { Hono, requireAuth } from "@gutu-host";

export const ${camel(spec.id)}Routes = new Hono();
${camel(spec.id)}Routes.use("*", requireAuth);

${camel(spec.id)}Routes.get("/", (c) => c.json({
  plugin: "${spec.id}",
  status: "scaffold",
  resources: ${JSON.stringify(spec.resources)},
}));
`);

  // lib/index.ts
  writeFileSync(path.join(hp, "lib/index.ts"), `// Cross-plugin exports go here. Other plugins import via "${npmName}".
// TODO: re-export action callables + types when behavioral
// implementation lands. See gutu-plugin-entitlements-core/lib/index.ts
// for the pattern.
export {};
`);

  // host-plugin/index.ts — declares resources eagerly so the catalog
  // gate accepts the plugin's namespace from boot.
  writeFileSync(path.join(hp, "index.ts"), `/** Host-plugin contribution for ${spec.id}.
 *
 *  ${spec.description}
 *
 *  STATUS: scaffold-only. Resources declared; actions/events/jobs/
 *  workflows TODO. Reference implementation lives in
 *  gutu-plugin-entitlements-core. */

import type { HostPlugin } from "@gutu-host/plugin-contract";
import { migrate } from "./db/migrate";
import { ${camel(spec.id)}Routes } from "./routes/${spec.id}";

export const hostPlugin: HostPlugin = {
  id: "${spec.id}",
  version: "1.0.0",
  manifest: {
    label: "${spec.label}",
    description: "${spec.description}",
    icon: "${spec.icon}",
    vendor: "gutu",
    permissions: ["db.read", "db.write", "audit.write"],
  },
  dependsOn: ${JSON.stringify(spec.dependsOn)},
  resources: ${JSON.stringify(spec.resources, null, 4).replace(/^/gm, "  ").trim()},
  migrate,
  routes: [
    { mountPath: "${routeMount}", router: ${camel(spec.id)}Routes },
  ],
  health: async () => ({ ok: true }),
};

export * from "./lib";
`);
  return true;
}

function patchBackendPackage(): void {
  const raw = readFileSync(BACKEND_PKG, "utf8");
  const pkg = JSON.parse(raw) as { gutuPlugins: string[] };
  let changed = false;
  for (const spec of PLUGINS) {
    const npmName = `@gutu-plugin/${spec.id}`;
    if (!pkg.gutuPlugins.includes(npmName)) {
      pkg.gutuPlugins.push(npmName);
      changed = true;
    }
  }
  if (changed) writeFileSync(BACKEND_PKG, JSON.stringify(pkg, null, 2) + "\n");
}

function patchBackendTsconfig(): void {
  const raw = readFileSync(BACKEND_TSCONFIG, "utf8");
  // The tsconfig has trailing commas — Bun's JSON.parse rejects those.
  // Round-trip through a tolerant parser by stripping `,}` and `,]`.
  const cleaned = raw.replace(/,(\s*[}\]])/g, "$1");
  const cfg = JSON.parse(cleaned) as {
    compilerOptions: { paths: Record<string, string[]> };
  };
  let changed = false;
  for (const spec of PLUGINS) {
    const npmName = `@gutu-plugin/${spec.id}`;
    if (!cfg.compilerOptions.paths[npmName]) {
      cfg.compilerOptions.paths[npmName] = [
        `../../plugins/gutu-plugin-${spec.id}/framework/builtin-plugins/${spec.id}/src/host-plugin`,
      ];
      changed = true;
    }
  }
  if (changed) writeFileSync(BACKEND_TSCONFIG, JSON.stringify(cfg, null, 2) + "\n");
}

let created = 0;
let skipped = 0;
for (const spec of PLUGINS) {
  if (generatePlugin(spec)) { created++; console.log(`  ✓ ${spec.id}`); }
  else { skipped++; console.log(`  · ${spec.id} (already exists)`); }
}
patchBackendPackage();
patchBackendTsconfig();
console.log(`\n${created} created, ${skipped} skipped.`);
console.log("Restart backend to pick up the new plugins.");
