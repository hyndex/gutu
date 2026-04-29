#!/usr/bin/env bun
/** Generate the 13 pack specifications from a single source-of-truth.
 *
 *   bun run scripts/scaffold-packs.ts
 *
 *  Idempotent — overwrites existing pack.json files. Adding a pack:
 *  append to PACKS, rerun. */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

interface Pack {
  id: string;
  version: string;
  label: string;
  description: string;
  plugins: string[];
  surfaces: string[];
  roles: Array<{ id: string; label: string; permissions: string[] }>;
  dashboards: string[];
  acceptanceTests?: string[];
}

const PACKS: Pack[] = [
  {
    id: "pack-marketplace",
    version: "1.0.0",
    label: "Marketplace clone pack",
    description: "Multi-seller marketplace template (Amazon/Flipkart/Meesho-shaped).",
    plugins: [
      "auth-core", "org-tenant-core", "role-policy-core", "audit-core",
      "workflow-core", "jobs-core", "notifications-core",
      "product-catalog-core", "pricing-tax-core", "sales-core",
      "inventory-core", "payments-core", "accounting-core", "treasury-core",
      "support-service-core", "business-portals-core",
      "commerce-storefront-core", "marketplace-core", "reviews-ratings-core",
      "trust-safety-core", "wallet-ledger-core", "promotions-loyalty-core",
      "analytics-bi-core", "search-core",
    ],
    surfaces: [
      "customer-web-storefront", "seller-portal", "operator-admin",
      "support-console", "finance-settlement-console",
    ],
    roles: [
      { id: "platform_admin", label: "Platform admin", permissions: ["*"] },
      { id: "marketplace_operator", label: "Marketplace operator", permissions: ["marketplace.*", "audit.read"] },
      { id: "seller_admin", label: "Seller admin", permissions: ["marketplace.seller-stores.*", "marketplace.listings.*", "marketplace.offers.*"] },
      { id: "seller_catalog_manager", label: "Seller catalog manager", permissions: ["product-catalog.*.read", "marketplace.listings.write"] },
      { id: "seller_fulfillment_user", label: "Seller fulfillment user", permissions: ["sales.*.read", "inventory.*.write"] },
      { id: "customer", label: "Customer", permissions: ["storefront.*", "sales.*.read"] },
      { id: "support_agent", label: "Support agent", permissions: ["support-service.*", "sales.*.read"] },
      { id: "finance_operator", label: "Finance operator", permissions: ["accounting.*", "treasury.*", "marketplace.settlements.*"] },
      { id: "trust_safety_moderator", label: "Trust & Safety moderator", permissions: ["trust.*"] },
    ],
    dashboards: [
      "GMV", "orders-by-seller", "seller-sla", "returns-and-disputes",
      "settlement-liability", "catalog-moderation-queue",
    ],
    acceptanceTests: [
      "seller-onboarding-happy-path", "multi-seller-cart-split",
      "payment-failure-rollback", "refund-after-delivery",
      "settlement-excludes-disputes", "suspended-seller-listings-hidden",
    ],
  },
  {
    id: "pack-quick-commerce",
    version: "1.0.0",
    label: "Quick commerce clone pack",
    description: "Dark-store / instant-commerce template (Blinkit/Instamart/Zepto-shaped).",
    plugins: [
      "auth-core", "org-tenant-core", "role-policy-core", "audit-core",
      "workflow-core", "jobs-core", "notifications-core",
      "product-catalog-core", "inventory-core", "sales-core", "pricing-tax-core",
      "commerce-storefront-core", "quick-commerce-core", "last-mile-dispatch-core",
      "payments-core", "pos-core", "procurement-core",
      "geospatial-routing-core", "realtime-presence-core",
      "promotions-loyalty-core", "analytics-bi-core",
    ],
    surfaces: ["customer-app", "dark-store-picker", "packer-console", "rider-console", "ops-control-tower"],
    roles: [
      { id: "ops_admin", label: "Operations admin", permissions: ["*"] },
      { id: "store_manager", label: "Dark-store manager", permissions: ["quick-commerce.dark-stores.*", "inventory.*"] },
      { id: "picker", label: "Picker", permissions: ["quick-commerce.picker-tasks.*"] },
      { id: "packer", label: "Packer", permissions: ["quick-commerce.packer-tasks.*"] },
      { id: "rider", label: "Rider", permissions: ["dispatch.delivery-jobs.*", "dispatch.proof-of-delivery.write"] },
      { id: "customer", label: "Customer", permissions: ["storefront.*", "sales.*.read"] },
    ],
    dashboards: ["orders-per-minute", "store-load-state", "picker-throughput", "rider-utilization", "stock-out-rate"],
    acceptanceTests: [
      "address-maps-to-serviceable-store", "stock-reservation-prevents-oversell",
      "picker-substitution-changes-total", "eta-promise-fails-safely-when-paused",
      "delivery-handoff-updates-customer-state", "expired-item-cannot-be-picked",
    ],
  },
  {
    id: "pack-food-delivery",
    version: "1.0.0",
    label: "Food delivery clone pack",
    description: "Restaurant marketplace + food order template (Zomato/Swiggy-shaped).",
    plugins: [
      "auth-core", "org-tenant-core", "role-policy-core", "audit-core",
      "workflow-core", "notifications-core",
      "restaurant-delivery-core", "last-mile-dispatch-core",
      "commerce-storefront-core", "product-catalog-core", "pricing-tax-core",
      "sales-core", "payments-core", "pos-core",
      "reviews-ratings-core", "support-service-core",
      "geospatial-routing-core", "realtime-presence-core",
      "promotions-loyalty-core", "analytics-bi-core",
    ],
    surfaces: ["customer-app", "restaurant-portal", "kot-kitchen-screen", "rider-app", "support-console"],
    roles: [
      { id: "platform_admin", label: "Platform admin", permissions: ["*"] },
      { id: "restaurant_owner", label: "Restaurant owner", permissions: ["restaurants.outlets.*", "restaurants.menus.*"] },
      { id: "kitchen_user", label: "Kitchen user", permissions: ["restaurants.kitchen-tickets.*"] },
      { id: "rider", label: "Rider", permissions: ["dispatch.delivery-jobs.*"] },
      { id: "customer", label: "Customer", permissions: ["storefront.*"] },
      { id: "support_agent", label: "Support agent", permissions: ["support-service.*"] },
    ],
    dashboards: ["restaurant-acceptance-sla", "kot-state-funnel", "rider-eta-accuracy", "complaint-rate", "menu-availability"],
    acceptanceTests: [
      "outlet-state-affects-menu", "modifiers-validate-at-checkout", "restaurant-accepts-within-sla",
      "kot-state-drives-rider-assignment", "complaint-triggers-partial-refund", "rating-only-after-completion",
    ],
  },
  {
    id: "pack-ride-hailing",
    version: "1.0.0",
    label: "Ride-hailing clone pack",
    description: "Real-time ride-hailing template (Uber/Ola/Rapido-shaped).",
    plugins: [
      "auth-core", "org-tenant-core", "role-policy-core", "audit-core",
      "workflow-core", "notifications-core",
      "mobility-rides-core", "geospatial-routing-core", "realtime-presence-core",
      "payments-core", "wallet-ledger-core",
      "reviews-ratings-core", "trust-safety-core",
      "support-service-core", "analytics-bi-core", "assets-core",
    ],
    surfaces: ["rider-app", "driver-app", "dispatch-control-tower", "safety-console", "finance-payout-console"],
    roles: [
      { id: "platform_admin", label: "Platform admin", permissions: ["*"] },
      { id: "dispatch_operator", label: "Dispatch operator", permissions: ["rides.*", "dispatch.*"] },
      { id: "safety_operator", label: "Safety operator", permissions: ["trust.*", "rides.safety-incidents.*", "rides.lost-item-cases.*"] },
      { id: "driver", label: "Driver", permissions: ["rides.drivers.self", "rides.trips.*", "wallet.accounts.self"] },
      { id: "rider", label: "Rider", permissions: ["rides.riders.self", "rides.trips.*"] },
      { id: "finance_operator", label: "Finance operator", permissions: ["wallet.payouts.*", "accounting.*.read"] },
    ],
    dashboards: ["active-trips", "fare-estimate-accuracy", "driver-acceptance-rate", "safety-incident-mttr", "wallet-payout-state"],
    acceptanceTests: [
      "driver-online-makes-matchable", "fare-estimate-locks-quote",
      "driver-accepts-only-one-trip", "trip-state-transitions-enforced",
      "safety-incident-escalates-workflow", "wallet-payout-records-commission",
    ],
  },
  {
    id: "pack-media-streaming",
    version: "1.0.0",
    label: "Media streaming clone pack",
    description: "OTT/audio/video streaming template (Netflix/Prime/Disney/Hotstar/KukuFM/PocketFM-shaped).",
    plugins: [
      "auth-core", "org-tenant-core", "role-policy-core", "audit-core",
      "media-streaming-core", "media-processing-core", "entitlements-core",
      "subscriptions-core", "payments-core",
      "content-core", "files-core", "storage-core", "search-core",
      "recommendations-core", "usage-metering-core", "analytics-bi-core",
      "reviews-ratings-core", "trust-safety-core",
    ],
    surfaces: ["viewer-app", "admin-content-studio", "rights-management-console", "subscription-dashboard", "playback-analytics"],
    roles: [
      { id: "platform_admin", label: "Platform admin", permissions: ["*"] },
      { id: "content_editor", label: "Content editor", permissions: ["media.*", "content.*"] },
      { id: "rights_manager", label: "Rights manager", permissions: ["media.rights-windows.*", "media.age-ratings.*"] },
      { id: "subscriber", label: "Subscriber", permissions: ["media.playback-sessions.write", "media.progress.*", "media.watchlists.*"] },
    ],
    dashboards: ["mau", "playback-success-rate", "concurrent-streams", "trending-titles", "rights-window-expirations"],
    acceptanceTests: [
      "no-entitlement-blocks-playback", "trial-user-allowed-content",
      "region-restricted-title-denied", "playback-heartbeat-updates-progress",
      "concurrent-stream-limit-blocks-extra", "removed-title-disappears-from-feeds",
    ],
  },
  {
    id: "pack-audio-streaming",
    version: "1.0.0",
    label: "Audio streaming clone pack",
    description: "Audio-first streaming template (KukuFM/PocketFM/Audible-shaped).",
    plugins: [
      "auth-core", "org-tenant-core", "role-policy-core", "audit-core",
      "media-streaming-core", "media-processing-core", "entitlements-core",
      "subscriptions-core", "payments-core",
      "content-core", "files-core", "storage-core", "search-core",
      "recommendations-core", "usage-metering-core", "analytics-bi-core",
      "reviews-ratings-core",
    ],
    surfaces: ["listener-app", "creator-studio", "subscription-dashboard"],
    roles: [
      { id: "platform_admin", label: "Platform admin", permissions: ["*"] },
      { id: "creator", label: "Creator", permissions: ["media.audio-shows.*", "media.chapters.*"] },
      { id: "listener", label: "Listener", permissions: ["media.playback-sessions.write", "media.progress.*"] },
    ],
    dashboards: ["listener-minutes", "show-completion-rate", "subscription-conversions"],
    acceptanceTests: [
      "trial-listener-can-play-allowed-shows", "premium-show-blocked-without-plan",
      "playback-progress-survives-disconnect",
    ],
  },
  {
    id: "pack-social-network",
    version: "1.0.0",
    label: "Social network clone pack",
    description: "Facebook/Instagram-shaped social template.",
    plugins: [
      "auth-core", "org-tenant-core", "role-policy-core", "audit-core",
      "social-graph-core", "posts-engagement-core", "feed-core",
      "messaging-core", "notifications-core", "trust-safety-core",
      "content-core", "community-core", "files-core", "storage-core",
      "analytics-bi-core", "ads-campaign-core",
    ],
    surfaces: ["user-app", "group-page-admin", "moderation-console", "ads-manager"],
    roles: [
      { id: "platform_admin", label: "Platform admin", permissions: ["*"] },
      { id: "user", label: "User", permissions: ["social.*.self", "engagement.*.write", "messaging.*"] },
      { id: "page_admin", label: "Page admin", permissions: ["social.pages.*"] },
      { id: "moderator", label: "Moderator", permissions: ["trust.*", "engagement.*.delete"] },
    ],
    dashboards: ["dau", "post-engagement-rate", "abuse-report-volume", "ads-revenue"],
    acceptanceTests: [
      "follow-fanout-correct", "blocked-user-content-hidden",
      "post-deletion-removes-from-feed", "moderation-takedown-propagates-quickly",
    ],
  },
  {
    id: "pack-short-video-social",
    version: "1.0.0",
    label: "Short-video social clone pack",
    description: "TikTok/Reels-shaped short-form video template.",
    plugins: [
      "auth-core", "org-tenant-core", "role-policy-core", "audit-core",
      "short-video-core", "social-graph-core", "posts-engagement-core",
      "feed-core", "recommendations-core", "media-processing-core",
      "trust-safety-core", "messaging-core", "notifications-core",
      "analytics-bi-core", "wallet-ledger-core", "ads-campaign-core",
    ],
    surfaces: ["creator-app", "viewer-app", "moderation-console", "creator-analytics", "ads-manager"],
    roles: [
      { id: "platform_admin", label: "Platform admin", permissions: ["*"] },
      { id: "creator", label: "Creator", permissions: ["short-video.*.self", "media-processing.*.write"] },
      { id: "viewer", label: "Viewer", permissions: ["short-video.watch-events.write", "feeds.fetch"] },
      { id: "moderator", label: "Moderator", permissions: ["trust.*"] },
    ],
    dashboards: ["watch-time-per-user", "completion-rate", "trending-sounds", "moderation-queue-depth"],
    acceptanceTests: [
      "upload-creates-processing-job", "video-cant-publish-before-safe",
      "watch-events-feed-ranking", "blocked-user-content-hidden",
      "takedown-removes-from-feeds", "duet-source-deletion-handled",
    ],
  },
  {
    id: "pack-professional-network",
    version: "1.0.0",
    label: "Professional network clone pack",
    description: "LinkedIn-shaped professional network template.",
    plugins: [
      "auth-core", "org-tenant-core", "role-policy-core", "audit-core",
      "professional-network-core", "social-graph-core", "posts-engagement-core",
      "feed-core", "messaging-core", "forms-core", "crm-core",
      "hr-payroll-core", "ads-campaign-core", "recommendations-core",
      "analytics-bi-core",
    ],
    surfaces: ["member-profile", "company-page", "jobs-board", "recruiter-console", "ads-lead-console"],
    roles: [
      { id: "platform_admin", label: "Platform admin", permissions: ["*"] },
      { id: "member", label: "Member", permissions: ["professional.profiles.self", "professional.applications.write"] },
      { id: "recruiter", label: "Recruiter", permissions: ["professional.job-posts.*", "professional.recruiter-pipelines.*"] },
      { id: "page_admin", label: "Company page admin", permissions: ["professional.company-pages.*"] },
    ],
    dashboards: ["active-jobs", "recruiter-funnel", "endorsement-graph", "ad-conversions"],
    acceptanceTests: [
      "job-post-respects-targeting", "candidate-privacy-honored",
      "endorsement-abuse-detected", "company-page-ownership-transfer",
    ],
  },
  {
    id: "pack-membership-site",
    version: "1.0.0",
    label: "Membership site clone pack",
    description: "MemberPress-shaped paid-community template.",
    plugins: [
      "auth-core", "org-tenant-core", "role-policy-core", "audit-core",
      "membership-access-core", "entitlements-core",
      "content-core", "community-core", "subscriptions-core",
      "payments-core", "business-portals-core", "page-builder-core",
      "forms-core", "notifications-core",
      "promotions-loyalty-core", "analytics-bi-core",
    ],
    surfaces: ["member-portal", "admin-membership-console", "content-admin", "billing-dashboard"],
    roles: [
      { id: "site_owner", label: "Site owner", permissions: ["*"] },
      { id: "content_creator", label: "Content creator", permissions: ["content.*", "membership.protected-content.*"] },
      { id: "member", label: "Member", permissions: ["membership.member-states.self", "content.*.read"] },
    ],
    dashboards: ["mrr", "trial-conversion", "drip-progress", "churn"],
    acceptanceTests: [
      "paid-tier-grants-gated-content", "failed-renewal-grace-policy",
      "drip-respects-tenant-timezone", "cancelled-member-keeps-paid-period",
    ],
  },
  {
    id: "pack-rental-business",
    version: "1.0.0",
    label: "Rental business clone pack",
    description: "Car/equipment/property/fashion rental template.",
    plugins: [
      "auth-core", "org-tenant-core", "role-policy-core", "audit-core",
      "rental-core", "booking-core", "assets-core", "contracts-core",
      "payments-core", "accounting-core", "maintenance-cmms-core",
      "support-service-core", "crm-core", "business-portals-core",
      "geospatial-routing-core", "reviews-ratings-core", "trust-safety-core",
    ],
    surfaces: ["customer-booking-app", "operator-asset-calendar", "inspection-mobile-app", "damage-claim-console"],
    roles: [
      { id: "rental_admin", label: "Rental admin", permissions: ["*"] },
      { id: "operator", label: "Operator", permissions: ["rental.*", "assets.*", "maintenance-cmms.*"] },
      { id: "inspector", label: "Inspector", permissions: ["rental.checkout-inspections.*", "rental.checkin-inspections.*", "rental.damage-claims.*"] },
      { id: "customer", label: "Customer", permissions: ["rental.reservations.self"] },
    ],
    dashboards: ["fleet-utilization", "deposit-state", "damage-claim-mttr", "late-return-rate"],
    acceptanceTests: [
      "double-booking-blocked", "deposit-hold-required",
      "return-inspection-opens-claim", "late-return-blocks-next-booking",
      "maintenance-block-hides-asset",
    ],
  },
  {
    id: "pack-ai-research-company",
    version: "1.0.0",
    label: "AI research company clone pack",
    description: "Research-ops template for AI/medicine/finance/electronics labs.",
    plugins: [
      "auth-core", "org-tenant-core", "role-policy-core", "audit-core",
      "research-ops-core", "dataset-governance-core",
      "model-registry-core", "experiment-tracking-core",
      "regulated-ai-compliance-core",
      "ai-core", "ai-assist-core", "ai-rag", "ai-evals", "ai-skills-core",
      "execution-workspaces-core", "knowledge-core", "projects-core",
      "files-core", "quality-core", "analytics-bi-core", "workflow-core",
    ],
    surfaces: ["research-workspace", "dataset-catalog", "experiment-dashboard", "model-registry", "compliance-console"],
    roles: [
      { id: "research_lead", label: "Research lead", permissions: ["research.*", "models.*"] },
      { id: "researcher", label: "Researcher", permissions: ["research.experiments.*", "experiments.*", "datasets.*.read"] },
      { id: "data_steward", label: "Data steward", permissions: ["datasets.*"] },
      { id: "compliance_officer", label: "Compliance officer", permissions: ["regulated-ai.*", "audit.*.read"] },
    ],
    dashboards: ["experiments-per-week", "model-eval-coverage", "dataset-license-state", "open-incidents"],
    acceptanceTests: [
      "experiment-cant-use-unapproved-dataset", "model-cant-approve-without-evals",
      "consent-withdrawal-triggers-lineage-review", "evidence-pack-completeness",
    ],
  },
  {
    id: "pack-cloud-saas-platform",
    version: "1.0.0",
    label: "Cloud / SaaS platform clone pack",
    description: "Vercel/Heroku/Supabase/Cloudflare-shaped developer platform template.",
    plugins: [
      "auth-core", "org-tenant-core", "role-policy-core", "audit-core",
      "cloud-platform-core", "entitlements-core", "usage-metering-core",
      "payments-core", "subscriptions-core", "storage-core", "storage-s3",
      "jobs-core", "workflow-core", "analytics-bi-core", "dashboard-core",
      "notifications-core", "trust-safety-core",
    ],
    surfaces: ["developer-dashboard", "project-environment-console", "deployment-logs", "usage-billing-page", "incidents-status"],
    roles: [
      { id: "platform_admin", label: "Platform admin", permissions: ["*"] },
      { id: "developer", label: "Developer", permissions: ["cloud.*.self", "cloud.deployments.write"] },
      { id: "billing_admin", label: "Billing admin", permissions: ["payments.*", "subscriptions.*", "usage.*"] },
      { id: "abuse_operator", label: "Abuse operator", permissions: ["trust.*", "cloud.deployments.suspend"] },
    ],
    dashboards: ["deployments-per-day", "build-success-rate", "billed-usage", "open-incidents"],
    acceptanceTests: [
      "tenant-quota-blocks-deployment", "usage-events-aggregate-into-billing",
      "secret-rotation-invalidates-old", "rollback-restores-prior",
      "abusive-deployment-can-be-suspended",
    ],
  },
];

const ROOT = path.resolve(__dirname, "..");
const PACKS_DIR = path.join(ROOT, "packs");

let written = 0;
for (const pack of PACKS) {
  const dir = path.join(PACKS_DIR, pack.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "pack.json"), JSON.stringify(pack, null, 2) + "\n");
  written++;
  console.log(`  ✓ ${pack.id}`);
}
console.log(`\n${written} packs written under ${PACKS_DIR}.`);
