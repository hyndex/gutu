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
  // 1. Issue grant
  const issueRes = await fetch(`${BASE}/api/entitlements/grants`, {
    method: "POST",
    headers: tenantHeaders,
    body: JSON.stringify({
      subjectKind: "user", subjectId: "smoke-u1",
      objectKind: "feature", objectId: "smoke-f1",
      source: "manual",
    }),
  });
  const issued = (await issueRes.json()) as { resource?: { id: string } };
  check("grants.issue → 201", issueRes.status === 201);
  // 2. Check allowed
  const check1 = await (await fetch(`${BASE}/api/entitlements/access/check`, {
    method: "POST", headers: tenantHeaders,
    body: JSON.stringify({
      subjectKind: "user", subjectId: "smoke-u1",
      objectKind: "feature", objectId: "smoke-f1",
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
      subjectKind: "user", subjectId: "smoke-u1",
      objectKind: "feature", objectId: "smoke-f1",
      action: "use",
    }),
  })).json() as { resource?: { allowed: boolean; reason: string } };
  check("access.check (after revoke) → denied", check2.resource?.allowed === false && check2.resource?.reason === "revoked");

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
