import { db } from "../db";
import { bulkInsert } from "../lib/query";

const TERRITORIES = ["NA East", "NA West", "EMEA", "APAC", "LATAM"];
const OWNERS = ["sam@gutu.dev", "alex@gutu.dev", "taylor@gutu.dev", "jordan@gutu.dev"];
const CUSTOMERS = ["Initech", "Umbrella", "Globex", "Tyrell", "Cyberdyne", "Hooli", "Stark Industries", "Dunder Mifflin", "Acme Co", "Massive Dynamic"];
const pick = <T>(a: readonly T[], i: number) => a[i % a.length];
const days = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const code = (p: string, i: number, pad = 4) => `${p}-${String(i + 1).padStart(pad, "0")}`;
const count = (r: string) => (db.prepare("SELECT COUNT(*) AS c FROM records WHERE resource = ?").get(r) as { c: number }).c;
const seedIf = (r: string, rows: Record<string, unknown>[]) => (count(r) > 0 ? 0 : bulkInsert(r, rows));

export function seedSalesExtended(): Record<string, number> {
  const out: Record<string, number> = {};
  out["sales.product-bundle"] = seedIf("sales.product-bundle", Array.from({ length: 8 }, (_, i) => ({
    id: `bundle_${i + 1}`, code: code("BND", i),
    name: pick(["Starter Kit", "Pro Suite", "Enterprise Stack", "Plus Bundle", "Essentials Pack"], i),
    bundledSkus: [`SKU-${1000 + i}`, `SKU-${2000 + i}`, `SKU-${3000 + i}`],
    totalPrice: 2000 + ((i * 317) % 9000),
    discountPct: 10 + (i % 20),
    active: i % 5 !== 0,
  })));
  out["sales.installation-note"] = seedIf("sales.installation-note", Array.from({ length: 15 }, (_, i) => ({
    id: `inst_${i + 1}`, code: code("IN", i),
    customer: pick(CUSTOMERS, i), item: `ITEM-${1000 + i}`,
    installedAt: days(-3 + i * 2), technician: pick(OWNERS, i),
    status: pick(["scheduled", "in-progress", "completed", "cancelled"], i),
  })));
  out["sales.sales-partner"] = seedIf("sales.sales-partner", Array.from({ length: 6 }, (_, i) => ({
    id: `sp_${i + 1}`, name: pick(["Gamma Partners", "Delta Alliance", "Beta Retailers", "Zeta Solutions", "Omega Group", "Sigma Reseller"], i),
    partnerType: pick(["Reseller", "Distributor", "Referral", "OEM"], i),
    commissionRate: 10 + (i * 3), territory: pick(TERRITORIES, i),
    ytdRevenue: 100_000 + (i * 47_000), active: i % 5 !== 0,
  })));
  out["sales.sales-team"] = seedIf("sales.sales-team", Array.from({ length: 5 }, (_, i) => ({
    id: `st_${i + 1}`, name: `${pick(TERRITORIES, i)} Team`,
    region: pick(TERRITORIES, i), leaderEmail: pick(OWNERS, i),
    members: 4 + (i % 5),
    quarterlyTarget: 500_000 + (i * 150_000),
    currentAttainment: 70 + (i * 5),
  })));
  out["sales.customer-credit-limit"] = seedIf("sales.customer-credit-limit", Array.from({ length: 20 }, (_, i) => {
    const limit = 50_000 + (i * 12_500);
    const utilized = Math.round(limit * (0.3 + (i * 0.035) % 0.7));
    const u = utilized / limit;
    return {
      id: `cl_${i + 1}`, customer: pick(CUSTOMERS, i),
      limit, utilized, currency: "USD",
      status: u >= 1 ? "exceeded" : u >= 0.8 ? "near-limit" : "within-limit",
      reviewedAt: days(i * 7),
    };
  }));
  out["sales.territory"] = seedIf("sales.territory", TERRITORIES.map((name, i) => ({
    id: `terr_${i + 1}`, name, manager: pick(OWNERS, i), region: name,
    countries: pick([["USA", "Canada"], ["Mexico", "Brazil"], ["UK", "Germany", "France"], ["Japan", "Singapore", "Australia"], ["Argentina", "Colombia"]], i),
    accountCount: 30 + (i * 17), ytdRevenue: 1_200_000 + (i * 480_000),
    target: 2_000_000 + (i * 500_000),
  })));
  out["sales.commission-rule"] = seedIf("sales.commission-rule", Array.from({ length: 8 }, (_, i) => ({
    id: `cr_${i + 1}`, name: pick(["Standard AE", "Enterprise tier", "Partner referral", "Net-new logo bonus", "Gross-margin based", "Renewal", "Expansion", "SPIFF Q4"], i),
    kind: pick(["percent-of-revenue", "flat-per-deal", "tiered", "gross-margin"], i),
    rate: 5 + (i * 2), minDealSize: i % 2 === 0 ? 10_000 : undefined,
    appliesTo: pick(["All AEs", "Enterprise team", "Partners only", "New logo only"], i),
    active: i % 7 !== 6,
  })));
  out["sales.pricing-rule"] = seedIf("sales.pricing-rule", Array.from({ length: 12 }, (_, i) => ({
    id: `pr_${i + 1}`, name: pick([
      "Volume discount ≥100 units", "Enterprise tier pricing", "Partner wholesale rate",
      "Back-to-school promo", "Black Friday flash", "Loyalty 5% off", "Net-30 rebate",
      "Multi-year prepay", "Startup program", "Non-profit discount", "Bulk licence pack", "Q4 clearance",
    ], i),
    priority: 10 - (i % 10),
    condition: pick(["qty >= 100", "customer.tier = 'enterprise'", "customer.partner = true", "region = 'EU'"], i),
    discountType: pick(["percent", "amount", "price-override"], i),
    discountValue: 5 + (i * 2),
    validFrom: days(30 - i),
    validTo: i % 3 === 0 ? undefined : days(-60 - i),
    active: i % 5 !== 4,
  })));
  out["sales.delivery-schedule"] = seedIf("sales.delivery-schedule", Array.from({ length: 25 }, (_, i) => ({
    id: `ds_${i + 1}`, orderId: code("ORD", i),
    item: `ITEM-${1000 + (i % 20)}`, qty: 5 + (i % 45),
    scheduledAt: days(-3 + i * 0.6),
    status: pick(["pending", "in-transit", "delivered", "delayed"], i),
    carrier: pick(["FedEx", "UPS", "DHL", "USPS"], i),
  })));
  return out;
}
