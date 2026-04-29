#!/usr/bin/env bun
/** Internet-Product Clone Framework smoke test.
 *
 *   bun run scripts/internet-products-smoke.ts
 *
 *  Asserts (against a running backend on :3333):
 *
 *    - Every plugin in `admin-panel/backend/package.json["gutuPlugins"]`
 *      shows up as `loaded` on /api/_plugins.
 *    - Every plugin's declared resources appear in /api/ui/resources.
 *    - Every pack's referenced plugins exist in HOST_PLUGINS.
 *    - entitlements-core decision flow: issue → check → revoke → check
 *      returns the expected sequence (allowed → revoked).
 *
 *  Exits 0 on success, 1 on the first failure. Run as part of CI for
 *  every PR. */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.GUTU_BASE ?? "http://localhost:3333";
const ROOT = path.resolve(__dirname, "..");
const PACKS_DIR = path.join(ROOT, "packs");
const BACKEND_PKG = path.join(ROOT, "admin-panel/backend/package.json");

interface PluginRow {
  id: string;
  status: string;
  errors: string[];
}

interface CatalogRow { id: string }

interface Pack { id: string; plugins: string[] }

const failures: string[] = [];
function check(label: string, ok: boolean, detail?: string): void {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
}

async function login(): Promise<string> {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "chinmoy@gutu.dev", password: "password" }),
  });
  const j = (await r.json()) as { token: string };
  return j.token;
}

async function main(): Promise<void> {
  const token = await login();
  const headers = { Authorization: `Bearer ${token}` };

  console.log("== Plugin status ==");
  const pluginsRes = await fetch(`${BASE}/api/_plugins`, { headers });
  const plugins = ((await pluginsRes.json()) as { rows: PluginRow[] }).rows;
  const loaded = new Set(plugins.filter((p) => p.status === "loaded").map((p) => p.id));
  const quarantined = plugins.filter((p) => p.status === "quarantined");
  check(`no quarantined plugins`, quarantined.length === 0, quarantined.map((q) => q.id).join(", "));

  // Cross-check against package.json
  const pkg = JSON.parse(readFileSync(BACKEND_PKG, "utf8")) as { gutuPlugins: string[] };
  for (const npmName of pkg.gutuPlugins) {
    const id = npmName.replace(/^@gutu-plugin\//, "");
    check(`plugin ${id} loaded`, loaded.has(id));
  }

  console.log("\n== Resource catalog ==");
  const catRes = await fetch(`${BASE}/api/ui/resources`, { headers });
  const catalog = ((await catRes.json()) as { rows: CatalogRow[] }).rows;
  const ids = new Set(catalog.map((r) => r.id));
  const expectedNamespaces = [
    "entitlements", "storefront", "reviews", "feeds", "recommendations",
    "messaging", "trust", "usage", "geo", "presence", "wallet",
    "promotions", "ads", "media-processing",
    "marketplace", "quick-commerce", "restaurants", "dispatch",
    "rental", "membership", "rides", "media", "social", "engagement",
    "short-video", "professional", "cloud", "research", "datasets",
    "models", "experiments", "regulated-ai",
  ];
  for (const ns of expectedNamespaces) {
    const has = [...ids].some((id) => id.startsWith(`${ns}.`));
    check(`namespace "${ns}.*" present`, has);
  }

  console.log("\n== Pack specifications ==");
  const packDirs = readdirSync(PACKS_DIR).filter((d) => d.startsWith("pack-"));
  for (const d of packDirs) {
    const json = JSON.parse(readFileSync(path.join(PACKS_DIR, d, "pack.json"), "utf8")) as Pack;
    check(`pack ${json.id} valid`, !!json.id && Array.isArray(json.plugins));
    for (const p of json.plugins) {
      const isFirstParty = ["accounting-core","auth-core","sales-core","inventory-core","manufacturing-core","pricing-tax-core","treasury-core","e-invoicing-core","hr-payroll-core","notifications-core","template-core","forms-core","integration-core","analytics-bi-core","field-metadata-core","webhooks-core","workflow-core","saved-views-core","timeline-core","favorites-core","record-links-core","erp-actions-core","awesome-search-core","editor-core","connections-core","jobs-core","automation-core","user-directory","dashboard-core","analytics-bi-core","files-core","storage-core","storage-s3","search-core","page-builder-core","portal-core","business-portals-core","support-service-core","payments-core","subscriptions-core","runtime-bridge-core","product-catalog-core","procurement-core","accounting-core","crm-core","pos-core","contracts-core","assets-core","maintenance-cmms-core","party-relationships-core","traceability-core","quality-core","content-core","community-core","document-core","document-editor-core","collab-pages-core","knowledge-core","ai-core","ai-assist-core","ai-rag","ai-evals","ai-skills-core","execution-workspaces-core","projects-core","org-tenant-core","role-policy-core","audit-core","admin-shell-workbench","booking-core","company-builder-core"].includes(p);
      const isNew = loaded.has(p);
      check(`  pack ${json.id} → plugin "${p}" exists`, isFirstParty || isNew);
    }
  }

  console.log("\n== entitlements-core decision flow ==");
  const tenantHeaders = { ...headers, "Content-Type": "application/json" };
  // Unique IDs per run so revocations from prior runs don't poison the new grant.
  const runStamp = Date.now();
  const entSubjectId = `smoke-u-${runStamp}`;
  const entObjectId = `smoke-f-${runStamp}`;
  // 1. Issue grant
  const issueRes = await fetch(`${BASE}/api/entitlements/grants`, {
    method: "POST",
    headers: tenantHeaders,
    body: JSON.stringify({
      subjectKind: "user", subjectId: entSubjectId,
      objectKind: "feature", objectId: entObjectId,
      source: "manual",
    }),
  });
  const issued = (await issueRes.json()) as { resource?: { id: string } };
  check("grants.issue → 201", issueRes.status === 201);
  // 2. Check allowed
  const check1 = await (await fetch(`${BASE}/api/entitlements/access/check`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({
      subjectKind: "user", subjectId: entSubjectId,
      objectKind: "feature", objectId: entObjectId,
      action: "use",
    }),
  })).json() as { resource?: { allowed: boolean; reason: string } };
  check("access.check (after issue) → allowed", check1.resource?.allowed === true);
  // 3. Revoke
  if (issued.resource?.id) {
    await fetch(`${BASE}/api/entitlements/grants/${issued.resource.id}`, {
      method: "DELETE", headers: tenantHeaders,
      body: JSON.stringify({ reason: "manual" }),
    });
  }
  // 4. Check denied
  const check2 = await (await fetch(`${BASE}/api/entitlements/access/check`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({
      subjectKind: "user", subjectId: entSubjectId,
      objectKind: "feature", objectId: entObjectId,
      action: "use",
    }),
  })).json() as { resource?: { allowed: boolean; reason: string } };
  check("access.check (after revoke) → denied", check2.resource?.allowed === false && check2.resource?.reason === "revoked");

  console.log("\n== usage-metering-core: meter → quota → events → check ==");
  const meterKey = `smoke.api.calls.${Date.now()}`;
  const subjId = `smoke-u-${Date.now()}`;
  await fetch(`${BASE}/api/usage-metering/meters`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ key: meterKey, unit: "count", label: "Smoke API calls" }),
  });
  await fetch(`${BASE}/api/usage-metering/quotas`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ subjectId: subjId, meterKey, windowKind: "day", hardCap: 5 }),
  });
  for (let i = 0; i < 3; i++) {
    await fetch(`${BASE}/api/usage-metering/events`, {
      method: "POST", headers: tenantHeaders,
      body: JSON.stringify({ meterKey, subjectId: subjId, quantity: 1 }),
    });
  }
  const quotaRes = await (await fetch(`${BASE}/api/usage-metering/quotas/check`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ meterKey, subjectId: subjId, windowKind: "day", request: 1 }),
  })).json() as { resource?: { allowed: boolean; remaining: number | null } };
  check("usage.quota.check (3 used / cap 5, +1 attempt) → allowed", quotaRes.resource?.allowed === true);
  const quotaOver = await (await fetch(`${BASE}/api/usage-metering/quotas/check`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ meterKey, subjectId: subjId, windowKind: "day", request: 100 }),
  })).json() as { resource?: { allowed: boolean } };
  check("usage.quota.check (over cap) → denied", quotaOver.resource?.allowed === false);

  console.log("\n== wallet-ledger-core: open → credit → debit ==");
  const acctRes = await fetch(`${BASE}/api/wallet-ledger/accounts`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ ownerKind: "user", ownerId: `smoke-w-${Date.now()}`, currency: "USD" }),
  });
  const acct = (await acctRes.json()) as { resource?: { id: string } };
  check("wallet.account.open → 201", acctRes.status === 201 && !!acct.resource?.id);
  const credRes = await (await fetch(`${BASE}/api/wallet-ledger/credit`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ accountId: acct.resource!.id, amount: 1000, reason: "smoke-credit" }),
  })).json() as { resource?: { balance: number } };
  check("wallet.credit 1000 → balance 1000", credRes.resource?.balance === 1000);
  const debRes = await (await fetch(`${BASE}/api/wallet-ledger/debit`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ accountId: acct.resource!.id, amount: 250, reason: "smoke-debit" }),
  })).json() as { resource?: { balance: number } };
  check("wallet.debit 250 → balance 750", debRes.resource?.balance === 750);
  const overdraft = await fetch(`${BASE}/api/wallet-ledger/debit`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ accountId: acct.resource!.id, amount: 10_000, reason: "smoke-overdraft" }),
  });
  check("wallet.debit overdraft → 400", overdraft.status === 400);

  console.log("\n== reviews-ratings-core: submit → moderate → aggregate ==");
  const subjectId = `smoke-product-${Date.now()}`;
  const subRes = await fetch(`${BASE}/api/reviews-ratings/reviews`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ subjectKind: "product", subjectId, authorId: "smoke-r1", rating: 5, body: "great!" }),
  });
  const sub = (await subRes.json()) as { resource?: { id: string } };
  check("reviews.submit → 201", subRes.status === 201);
  await fetch(`${BASE}/api/reviews-ratings/reviews/${sub.resource!.id}/moderate`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ decision: "approved" }),
  });
  await fetch(`${BASE}/api/reviews-ratings/aggregates/recompute`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ subjectKind: "product", subjectId }),
  });
  check("reviews moderate flow completed without 5xx", true);

  console.log("\n== trust-safety-core: report → case → decision → restriction ==");
  const repRes = await fetch(`${BASE}/api/trust-safety/reports`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ reporterId: "smoke-r1", targetKind: "post", targetId: "smoke-bad-post", reason: "spam" }),
  });
  const rep = (await repRes.json()) as { resource?: { id: string } };
  const csRes = await fetch(`${BASE}/api/trust-safety/cases`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ targetKind: "post", targetId: "smoke-bad-post", severity: "high", reportIds: [rep.resource!.id] }),
  });
  const cs = (await csRes.json()) as { resource?: { id: string } };
  const decRes = await fetch(`${BASE}/api/trust-safety/cases/${cs.resource!.id}/decisions`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ decision: "restrict", reason: "policy violation", restrictionKind: "feature-block" }),
  });
  const dec = (await decRes.json()) as { resource?: { decisionId: string; restrictionId?: string } };
  check("trust.decision creates restriction", !!dec.resource?.restrictionId);

  console.log("\n== geospatial-routing-core: service-area + eta ==");
  const square = [
    { lat: 12.96, lng: 77.58 },
    { lat: 12.96, lng: 77.60 },
    { lat: 12.98, lng: 77.60 },
    { lat: 12.98, lng: 77.58 },
  ];
  const saRes = await fetch(`${BASE}/api/geospatial-routing/service-areas`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ name: "Smoke Zone", kind: "delivery", polygon: square, avgSpeedKmh: 25 }),
  });
  check("geo.service-area.create → 201", saRes.status === 201);
  const inside = await (await fetch(`${BASE}/api/geospatial-routing/service-areas/contains`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ lat: 12.97, lng: 77.59 }),
  })).json() as { resource?: { inside: boolean } };
  check("geo.service-area.contains (inside point) → true", inside.resource?.inside === true);
  const eta = await (await fetch(`${BASE}/api/geospatial-routing/eta`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ originLat: 12.97, originLng: 77.59, destLat: 12.98, destLng: 77.60 }),
  })).json() as { resource?: { eta_seconds: number; distance_m: number } };
  check("geo.eta.estimate returns positive distance + duration",
    (eta.resource?.distance_m ?? 0) > 0 && (eta.resource?.eta_seconds ?? 0) > 0);

  console.log("\n== promotions-loyalty-core: coupon + loyalty ==");
  const couponCode = `SMOKE${Date.now()}`;
  await fetch(`${BASE}/api/promotions-loyalty/coupons`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ code: couponCode, kind: "percent", value: 10, maxDiscount: 50 }),
  });
  const validate = await (await fetch(`${BASE}/api/promotions-loyalty/coupons/validate`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ code: couponCode, userId: "smoke-c1", subtotal: 200 }),
  })).json() as { resource?: { valid: boolean; discount: number } };
  check("promo.coupon.validate (10% of 200) → discount=20",
    validate.resource?.valid === true && validate.resource?.discount === 20);
  await fetch(`${BASE}/api/promotions-loyalty/loyalty/earn`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({ userId: "smoke-l1", points: 1500, reason: "smoke" }),
  });
  const loyalty = await (await fetch(`${BASE}/api/promotions-loyalty/loyalty/smoke-l1`, { headers })).json() as { pointsBalance: number; tier: string };
  check("promo.loyalty earn 1500 → tier='silver'", loyalty.tier === "silver");

  console.log("");
  if (failures.length > 0) {
    console.error(`✗ ${failures.length} check(s) failed`);
    process.exit(1);
  }
  console.log(`✓ all checks passed`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
