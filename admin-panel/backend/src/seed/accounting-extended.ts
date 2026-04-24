import { db } from "../db";
import { bulkInsert } from "../lib/query";

/** Backend seed for the extended Accounting resources (journal entries,
 *  payment entries, bank accounts, bank transactions, budgets, cost
 *  centers, accounting periods, tax rules, dunning levels, fiscal years,
 *  currency rates). Idempotent per-resource: only seeds a resource if
 *  zero records exist for it. Safe to run on every boot. */

const DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Operations", "Finance", "Support", "HR"];
const BANKS = ["Chase", "HSBC", "Barclays", "Wise", "Mercury"];
const OWNERS = ["sam@gutu.dev", "alex@gutu.dev", "taylor@gutu.dev", "jordan@gutu.dev"];
const COMPANIES = [
  "Acme Corp", "Globex", "Initech", "Umbrella Co", "Soylent Ltd", "Hooli",
  "Pied Piper", "Dunder Mifflin", "Stark Industries", "Wayne Enterprises",
  "Cyberdyne", "Tyrell Corp", "Weyland-Yutani", "Massive Dynamic", "Oscorp",
];

const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length]!;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const code = (p: string, i: number, pad = 4) => `${p}-${String(1000 + i).padStart(pad, "0")}`;
const money = (i: number, base = 100, spread = 5000) =>
  Math.round(base + ((i * 97 + 13) % spread) * 100) / 100;

const count = (r: string) =>
  (db.prepare("SELECT COUNT(*) AS c FROM records WHERE resource = ?").get(r) as { c: number }).c;
const seedIf = (r: string, rows: Record<string, unknown>[]) =>
  count(r) > 0 ? 0 : bulkInsert(r, rows);

function journalEntries(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const total = money(i, 500, 30000);
    return {
      id: `acct_je_${i + 1}`,
      number: code("JE", i, 5),
      postedAt: daysAgo(i),
      reference: pick(["AR", "AP", "PAY", "ADJ", "ACC"], i) + "-" + (100 + i),
      memo: pick(
        [
          "Monthly accrual",
          "Bank reconciliation",
          "FX revaluation",
          "Payroll posting",
          "Deferred revenue release",
          "Depreciation",
          "Intercompany transfer",
        ],
        i,
      ),
      status: pick(["posted", "posted", "posted", "draft", "reversed"], i),
      debitTotal: total,
      creditTotal: total,
      currency: pick(["USD", "EUR", "GBP"], i),
      createdBy: pick(OWNERS, i),
      notes: i % 5 === 0 ? "Reviewed and approved by Finance." : "",
    };
  });
}

function paymentEntries(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `acct_pe_${i + 1}`,
    reference: code("PE", i, 6),
    direction: i % 3 === 0 ? "pay" : "receive",
    party: pick(COMPANIES, i),
    amount: money(i, 100, 15000),
    currency: pick(["USD", "EUR", "GBP"], i),
    method: pick(["ach", "wire", "card", "check", "cash"], i),
    postedAt: daysAgo(i * 0.8),
    bankAccount: pick(["Ops USD", "Reserve EUR", "Payroll USD", "Operating GBP"], i),
    status: pick(["cleared", "cleared", "cleared", "pending", "reconciled", "failed"], i),
    invoiceId: i % 3 === 0 ? code("INV", i, 4) : "",
    notes: "",
  }));
}

function bankAccounts(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `acct_bank_${i + 1}`,
    name: pick(
      ["Ops USD", "Reserve EUR", "Payroll USD", "Operating GBP", "Tax USD", "Rainy-day EUR", "M&A USD", "Petty Cash"],
      i,
    ),
    bank: pick(BANKS, i),
    accountNumber: `****${1000 + i * 137}`,
    iban: `GB${String(10 + i).padStart(2, "0")}CHAS${String(60161331268500 + i * 7).slice(-14)}`,
    swift: pick(["CHASUS33", "MIDLGB22", "BARCGB22", "TRWIUS35"], i),
    currency: pick(["USD", "EUR", "GBP"], i),
    balance: money(i, 10_000, 500_000),
    openingBalance: money(i + 2, 10_000, 400_000),
    status: i === 7 ? "archived" : "active",
  }));
}

function bankTransactions(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `acct_btx_${i + 1}`,
    occurredAt: daysAgo(i * 0.4),
    description: pick(
      [
        "Wire transfer — invoice payment",
        "ACH debit — vendor",
        "Card fee",
        "Payroll run",
        "Interest credit",
        "FX margin adjustment",
        "Bank wire fee",
        "Tax deposit",
        "Customer refund",
      ],
      i,
    ),
    bankAccount: pick(["Ops USD", "Reserve EUR", "Payroll USD", "Operating GBP"], i),
    direction: i % 3 === 0 ? "debit" : "credit",
    amount: money(i, 50, 25_000),
    currency: pick(["USD", "EUR", "GBP"], i),
    reference: code("BT", i, 6),
    reconciled: i % 3 !== 0,
    matchedInvoiceId: i % 5 === 0 ? code("INV", i, 4) : "",
  }));
}

function budgets(n: number): Record<string, unknown>[] {
  const periods = ["2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4", "2026", "FY2025"];
  return Array.from({ length: n }, (_, i) => {
    const budget = 50_000 + ((i * 12_337) % 450_000);
    const actual = Math.round(budget * (0.7 + ((i * 0.037) % 0.5)));
    const variancePct = budget > 0 ? Math.round(((budget - actual) / budget) * 100) : 0;
    return {
      id: `acct_bdg_${i + 1}`,
      department: pick(DEPARTMENTS, i),
      period: pick(periods, i),
      costCenter: `CC-${1000 + i * 5}`,
      category: pick(["opex", "capex", "headcount", "marketing", "travel"], i),
      budget,
      actual,
      variancePct,
      owner: pick(OWNERS, i),
      notes: "",
    };
  });
}

function costCenters(n: number): Record<string, unknown>[] {
  const names = [
    "Corporate", "R&D", "GTM", "Support Ops", "Infra", "People", "Exec",
    "Shared Services", "Field Sales", "Inside Sales", "Partner Alliance",
    "Product Marketing", "Demand Gen", "Content",
  ];
  return Array.from({ length: n }, (_, i) => ({
    id: `acct_cc_${i + 1}`,
    code: `CC-${1000 + i * 5}`,
    name: pick(names, i),
    parent: i > 2 ? `CC-${1000 + ((i - 3) % 3) * 5}` : "",
    manager: pick(OWNERS, i),
    department: pick(DEPARTMENTS, i),
    status: i === 13 ? "archived" : "active",
  }));
}

function periods(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const monthIdx = 11 - i;
    const y = monthIdx < 0 ? 2025 : 2026;
    const m = ((monthIdx + 12) % 12) + 1;
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0));
    return {
      id: `acct_prd_${i + 1}`,
      name: `${y}-${String(m).padStart(2, "0")}`,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      status: i < 2 ? "open" : i < 3 ? "closing" : i < 9 ? "closed" : "locked",
      fiscalYear: `FY${y}`,
      closedBy: i >= 2 ? pick(OWNERS, i) : "",
      closedAt: i >= 2 ? daysAgo(i * 30) : "",
    };
  });
}

function taxRules(): Record<string, unknown>[] {
  const names = [
    "US Sales Tax — CA", "US Sales Tax — NY", "EU VAT — DE", "EU VAT — FR",
    "UK VAT standard", "IN GST 18%", "CA GST 5%", "AU GST 10%",
    "JP Consumption 10%", "US Payroll Federal", "US Payroll State", "Customs Excise",
  ];
  const rates = [8.25, 8.875, 19, 20, 20, 18, 5, 10, 10, 6.2, 4.5, 12];
  const juris = ["US-CA", "US-NY", "EU-DE", "EU-FR", "UK", "IN", "CA", "AU", "JP", "US-FED", "US-STATE", "INTL"];
  const cats = ["sales", "sales", "vat", "vat", "vat", "gst", "gst", "gst", "gst", "payroll", "payroll", "excise"];
  return names.map((name, i) => ({
    id: `acct_tax_${i + 1}`,
    name,
    rate: rates[i],
    jurisdiction: juris[i],
    category: cats[i],
    accountCode: pick(["2200", "2210", "2300", "2310", "2320", "2400", "2410", "2420"], i),
    validFrom: daysAgo(365),
    validTo: daysFromNow(365),
    active: i !== 11,
    notes: "",
  }));
}

function dunning(): Record<string, unknown>[] {
  const names = ["Friendly reminder", "First reminder", "Second reminder", "Final notice", "Legal action"];
  const days = [3, 15, 30, 60, 90];
  const feePct = [0, 0, 1.5, 3, 5];
  const feeFlat = [0, 0, 0, 25, 50];
  const action = ["reminder", "reminder", "warning", "suspend", "legal"];
  return names.map((name, i) => ({
    id: `acct_dun_${i + 1}`,
    name,
    level: i + 1,
    daysOverdue: days[i],
    feePct: feePct[i],
    feeFlat: feeFlat[i],
    action: action[i],
    templateId: `tpl_dunn_${i + 1}`,
    active: true,
  }));
}

function fiscalYears(): Record<string, unknown>[] {
  return Array.from({ length: 5 }, (_, i) => {
    const y = 2022 + i;
    return {
      id: `acct_fy_${i + 1}`,
      name: `FY${y}`,
      startAt: new Date(Date.UTC(y, 0, 1)).toISOString(),
      endAt: new Date(Date.UTC(y, 11, 31)).toISOString(),
      status: y < 2026 ? "closed" : y === 2026 ? "current" : "open",
      company: "Gutu Framework, Inc.",
    };
  });
}

function currencyRates(n: number): Record<string, unknown>[] {
  const pairs: ReadonlyArray<readonly [string, string, number]> = [
    ["USD", "EUR", 0.93], ["USD", "GBP", 0.79], ["USD", "INR", 83.2],
    ["EUR", "USD", 1.07], ["EUR", "GBP", 0.85], ["GBP", "USD", 1.27],
    ["GBP", "EUR", 1.17], ["INR", "USD", 0.012],
  ];
  return Array.from({ length: n }, (_, i) => {
    const p = pairs[i % pairs.length];
    return {
      id: `acct_fx_${i + 1}`,
      pair: `${p[0]}/${p[1]}`,
      from: p[0],
      to: p[1],
      rate: Math.round((p[2] + (((i * 0.0037) % 0.04) - 0.02)) * 10_000) / 10_000,
      asOfAt: daysAgo(Math.floor(i / pairs.length)),
      source: pick(["ECB", "FX Rates API", "Manual"], i),
    };
  });
}

export function seedAccountingExtended(): Record<string, number> {
  const out: Record<string, number> = {};
  out["accounting.journal-entry"] = seedIf("accounting.journal-entry", journalEntries(30));
  out["accounting.payment-entry"] = seedIf("accounting.payment-entry", paymentEntries(40));
  out["accounting.bank-account"] = seedIf("accounting.bank-account", bankAccounts(8));
  out["accounting.bank-transaction"] = seedIf("accounting.bank-transaction", bankTransactions(60));
  out["accounting.budget"] = seedIf("accounting.budget", budgets(28));
  out["accounting.cost-center"] = seedIf("accounting.cost-center", costCenters(14));
  out["accounting.accounting-period"] = seedIf("accounting.accounting-period", periods(12));
  out["accounting.tax-rule"] = seedIf("accounting.tax-rule", taxRules());
  out["accounting.dunning"] = seedIf("accounting.dunning", dunning());
  out["accounting.fiscal-year"] = seedIf("accounting.fiscal-year", fiscalYears());
  out["accounting.currency-rate"] = seedIf("accounting.currency-rate", currencyRates(24));
  return out;
}
