import { db } from "../db";
import { bulkInsert } from "../lib/query";

const COMPANIES = ["Acme Corp", "Globex", "Initech", "Umbrella Co", "Hooli", "Pied Piper", "Dunder Mifflin", "Stark Industries"];
const CATEGORIES = ["raw-materials", "finished-goods", "services", "software", "hardware", "office-supplies", "logistics"];
const FIRST = ["Ada", "Grace", "Linus", "Guido", "Alan", "Donald", "Katherine", "Barbara"];
const LAST = ["Lovelace", "Hopper", "Torvalds", "van Rossum", "Turing", "Knuth", "Johnson", "Liskov"];

const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length]!;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const code = (p: string, i: number, pad = 4) => `${p}-${String(1000 + i).padStart(pad, "0")}`;
const money = (i: number, base = 100, spread = 5000) =>
  Math.round(base + ((i * 97 + 13) % spread) * 100) / 100;
const personName = (i: number) => `${pick(FIRST, i)} ${pick(LAST, i + 2)}`;

const count = (r: string) =>
  (db.prepare("SELECT COUNT(*) AS c FROM records WHERE resource = ?").get(r) as { c: number }).c;
const seedIf = (r: string, rows: Record<string, unknown>[]) =>
  count(r) > 0 ? 0 : bulkInsert(r, rows);

export function seedProcurementExtended(): Record<string, number> {
  const out: Record<string, number> = {};

  out["procurement.purchase-order"] = seedIf("procurement.purchase-order", Array.from({ length: 30 }, (_, i) => {
    const subtotal = money(i, 500, 50000);
    const tax = Math.round(subtotal * 0.08);
    const shipping = 50 + (i * 13) % 500;
    const total = subtotal + tax + shipping;
    return {
      id: `proc_po_ext_${i + 1}`,
      number: code("PO", i, 6),
      vendor: pick(COMPANIES, i + 2),
      category: pick(CATEGORIES, i),
      buyer: personName(i),
      status: pick(["draft", "pending", "approved", "approved", "published"], i),
      createdAt: daysAgo(i * 2),
      approvedAt: i % 4 !== 0 ? daysAgo(i * 2 - 1) : "",
      expectedAt: daysFromNow(i * 3),
      receivedAt: i % 3 === 2 ? daysAgo(i - 2) : "",
      subtotal,
      tax,
      shipping,
      total,
      listTotal: Math.round(total * 1.1),
      currency: pick(["USD", "EUR", "GBP"], i),
      requisitionCode: code("PR", i % 10, 5),
      linesCount: 1 + (i % 10),
      notes: "",
    };
  }));

  out["procurement.supplier"] = seedIf("procurement.supplier", Array.from({ length: 20 }, (_, i) => ({
    id: `proc_sup_${i + 1}`,
    code: code("SUP", i, 4),
    name: pick(["Acme Supply", "Globex Parts", "Initech Components", "Umbrella Hardware", "Hooli Logistics", "Pied Piper Warehousing", "Stark Industries", "Dunder Mifflin", "Cyberdyne Systems", "Soylent Foods"], i),
    category: pick(CATEGORIES, i),
    contactName: personName(i),
    contactEmail: `contact${i}@supplier.com`,
    contactPhone: `+1-555-${String(5000 + i).slice(-4)}`,
    paymentTerms: pick(["net-30", "net-30", "net-45", "net-15", "prepaid"], i),
    currency: pick(["USD", "EUR", "GBP"], i),
    onTimeRate: 75 + (i * 2) % 25,
    qualityScore: 80 + (i * 3) % 20,
    totalSpend: 10_000 + (i * 7_537) % 500_000,
    lastOrderAt: daysAgo(i * 7),
    status: i === 19 ? "inactive" : "active",
  })));

  out["procurement.requisition"] = seedIf("procurement.requisition", Array.from({ length: 20 }, (_, i) => ({
    id: `proc_req_${i + 1}`,
    code: code("PR", i, 5),
    requester: personName(i),
    department: pick(["Engineering", "Ops", "Sales", "Marketing", "Finance"], i),
    category: pick(CATEGORIES, i),
    items: 1 + (i % 8),
    estimatedValue: 500 + (i * 817) % 25000,
    neededBy: daysFromNow(7 + i * 3),
    submittedAt: daysAgo(i * 2),
    approver: personName(i + 3),
    status: pick(["submitted", "approved", "converted", "draft", "rejected"], i),
    linkedPo: i % 3 === 2 ? code("PO", i, 6) : "",
  })));

  out["procurement.rfq"] = seedIf("procurement.rfq", Array.from({ length: 10 }, (_, i) => ({
    id: `proc_rfq_${i + 1}`,
    code: code("RFQ", i, 5),
    title: pick(["Bulk motor supply Q2", "Office IT refresh", "Logistics services 2026", "Cleaning services contract", "SaaS platform negotiation"], i),
    category: pick(CATEGORIES, i),
    suppliersInvited: 3 + (i % 5),
    quotesReceived: Math.max(1, 3 + (i % 5) - (i % 3)),
    issuedAt: daysAgo(i * 10),
    dueAt: daysFromNow(14 - i),
    awardedSupplier: i % 3 === 0 ? pick(COMPANIES, i) : "",
    status: pick(["issued", "closed", "awarded", "awarded", "cancelled"], i),
  })));

  out["procurement.contract"] = seedIf("procurement.contract", Array.from({ length: 12 }, (_, i) => ({
    id: `proc_con_${i + 1}`,
    code: code("SC", i, 5),
    supplier: pick(COMPANIES, i + 2),
    title: pick(["Master supply agreement", "SaaS license", "Maintenance contract", "Logistics agreement"], i),
    startAt: daysAgo(365 - i * 30),
    endAt: daysFromNow(365 - i * 30),
    autoRenew: i % 2 === 0,
    committedSpend: 10_000 + (i * 7537) % 200_000,
    status: pick(["active", "active", "active", "expiring-soon", "expired"], i),
  })));

  out["procurement.goods-receipt"] = seedIf("procurement.goods-receipt", Array.from({ length: 20 }, (_, i) => ({
    id: `proc_gr_${i + 1}`,
    code: code("GR", i, 6),
    poNumber: code("PO", i, 6),
    supplier: pick(COMPANIES, i + 2),
    receivedAt: daysAgo(i * 2),
    receivedBy: personName(i),
    itemsCount: 1 + (i % 8),
    qcStatus: pick(["passed", "passed", "pending", "partial", "rejected"], i),
    totalValue: 500 + (i * 1_173) % 25_000,
  })));

  out["procurement.approval-rule"] = seedIf("procurement.approval-rule", Array.from({ length: 6 }, (_, i) => ({
    id: `proc_ar_${i + 1}`,
    name: pick(["Small purchases", "Department head approval", "CFO approval", "CEO approval"], i),
    category: pick(CATEGORIES, i),
    maxAmount: pick([1000, 10000, 100000, 1_000_000], i),
    minAmount: pick([0, 1001, 10001, 100001], i),
    approverRole: pick(["Manager", "Department head", "VP", "CFO", "CEO"], i),
    active: true,
  })));

  return out;
}
