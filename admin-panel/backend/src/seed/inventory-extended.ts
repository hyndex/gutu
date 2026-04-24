import { db } from "../db";
import { bulkInsert } from "../lib/query";

/** Backend seed for the extended Inventory resources (bins, variants,
 *  prices, stock entries, material requests, delivery notes, purchase
 *  receipts, landed costs, batches, serial numbers, reconciliations,
 *  pick lists, packing slips, delivery trips, item-suppliers).
 *  Idempotent per-resource. */

const ITEMS = [
  "Widget A", "Gizmo B", "Part C", "Bracket D", "Screw E", "Nut F", "Bolt G", "Washer H",
  "Spring I", "Clip J", "Seal K", "Gear L", "Shaft M", "Bearing N", "Motor O", "Sensor P",
];
const SUPPLIERS = ["Acme Supply", "Globex Parts", "Initech Components", "Umbrella Hardware", "Hooli Logistics"];
const WH = ["SFO DC", "AUS DC", "LHR DC", "FRA DC", "NRT DC", "SYD DC"];

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

function items(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const onHand = (i * 13) % 500;
    const reorder = 20 + ((i * 7) % 60);
    const unitCost = money(i, 1, 200);
    return {
      id: `inv_item_ext_${i + 1}`,
      sku: code("SKU", i, 5),
      name: `${pick(ITEMS, i)} #${i}`,
      category: pick(["raw", "wip", "finished", "service"], i),
      uom: pick(["each", "kg", "m", "pack", "box"], i),
      onHand,
      reservedQty: Math.min(onHand, (i * 3) % 40),
      incomingQty: (i * 5) % 60,
      outgoingQty: (i * 7) % 80,
      reorderPoint: reorder,
      reorderQty: reorder * 3,
      unitCost,
      inventoryValue: Math.round(onHand * unitCost),
      avgDailyUsage: Math.max(1, (i * 2) % 20),
      belowReorder: onHand <= reorder,
      valuationMethod: pick(["fifo", "average", "lifo"], i),
      preferredSupplier: pick(SUPPLIERS, i),
      nextPoEta: daysFromNow((i % 30) + 3),
      lastReceivedAt: daysAgo((i * 13) % 180),
      hsCode: `${8400 + (i * 7) % 500}.${String(i % 100).padStart(2, "0")}`,
      barcode: `${1234567800000 + i * 17}`,
      active: i % 20 !== 0,
      description: "",
    };
  });
}

function bins(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const onHand = (i * 11) % 500;
    const reserved = (i * 3) % 50;
    return {
      id: `inv_bin_${i + 1}`,
      sku: code("SKU", i % 40, 5),
      warehouse: pick(WH, i),
      location: `A-${String(Math.floor(i / 10)).padStart(2, "0")}-${String(i % 10).padStart(2, "0")}`,
      onHand,
      reserved,
      available: Math.max(0, onHand - reserved),
      unitCost: money(i, 1, 200),
    };
  });
}

function variants(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `inv_var_${i + 1}`,
    sku: code("SKV", i, 6),
    parentSku: code("SKU", i % 10, 5),
    name: `${pick(ITEMS, i)} — ${pick(["Red", "Blue", "Small", "Large", "XL", "Matte", "Glossy"], i)}`,
    attributes: pick(["Color: Red", "Color: Blue, Size: L", "Finish: Matte", "Size: XL", "Color: Black"], i),
    unitCost: money(i, 1, 250),
    active: true,
  }));
}

function prices(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `inv_price_${i + 1}`,
    sku: code("SKU", i % 15, 5),
    priceList: pick(["standard-selling", "standard-buying", "wholesale", "retail"], i),
    price: money(i, 5, 400),
    currency: pick(["USD", "EUR", "GBP"], i),
    validFrom: daysAgo(30),
    validTo: daysFromNow(365),
  }));
}

function stockEntries(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `inv_stk_${i + 1}`,
    code: code("STK", i, 6),
    postedAt: daysAgo(i * 0.5),
    kind: pick(["receipt", "issue", "transfer", "manufacture", "reconciliation"], i),
    sku: code("SKU", i % 20, 5),
    warehouse: pick(["SFO DC", "AUS DC", "LHR DC", "FRA DC"], i),
    qty: 5 + ((i * 17) % 200),
    direction: i % 3 === 0 ? "out" : "in",
    reference: pick(["PO-1201", "SO-3308", "TFR-902", "MO-1104"], i),
    unitCost: money(i, 1, 200),
    postedBy: pick(["sam@gutu.dev", "alex@gutu.dev", "taylor@gutu.dev"], i),
    status: pick(["published", "published", "approved", "pending"], i),
    notes: "",
  }));
}

function materialRequests(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `inv_mr_${i + 1}`,
    code: code("MR", i, 5),
    purpose: pick(["purchase", "transfer", "issue", "manufacture"], i),
    sku: code("SKU", i % 15, 5),
    qty: 20 + ((i * 19) % 300),
    warehouse: pick(["SFO DC", "AUS DC", "LHR DC", "FRA DC"], i),
    neededBy: daysFromNow((i % 30) + 3),
    requestedBy: pick(["sam@gutu.dev", "alex@gutu.dev", "taylor@gutu.dev"], i),
    status: pick(["submitted", "submitted", "partially-fulfilled", "fulfilled", "draft"], i),
    linkedPo: i % 3 === 0 ? code("PO", i, 4) : "",
    notes: "",
  }));
}

function deliveryNotes(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `inv_dn_${i + 1}`,
    code: code("DN", i, 6),
    customer: pick(["Acme Corp", "Globex", "Initech", "Hooli", "Pied Piper", "Dunder Mifflin"], i),
    deliveredAt: daysAgo(i * 0.5),
    warehouse: pick(["SFO DC", "AUS DC", "LHR DC"], i),
    carrier: pick(["fedex", "ups", "dhl", "usps"], i),
    tracking: `TRK${String(1000000000 + i * 317).slice(-10)}`,
    amount: money(i, 50, 8000),
    status: pick(["delivered", "delivered", "in-transit", "submitted", "returned"], i),
    linkedSo: code("SO", i, 4),
  }));
}

function purchaseReceipts(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `inv_prc_${i + 1}`,
    code: code("PR", i, 6),
    supplier: pick(SUPPLIERS, i),
    receivedAt: daysAgo(i * 0.7),
    warehouse: pick(["SFO DC", "AUS DC", "LHR DC"], i),
    amount: money(i, 500, 25000),
    qcStatus: pick(["passed", "passed", "pending", "partial", "rejected"], i),
    status: pick(["published", "approved", "pending"], i),
    linkedPo: code("PO", i, 4),
  }));
}

function landedCosts(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const freight = money(i, 100, 3000);
    const duty = money(i + 1, 50, 1500);
    const insurance = money(i + 2, 20, 500);
    const handling = money(i + 3, 10, 300);
    return {
      id: `inv_lc_${i + 1}`,
      code: code("LC", i, 5),
      linkedReceipt: code("PR", i, 6),
      freight,
      customsDuty: duty,
      insurance,
      handling,
      total: freight + duty + insurance + handling,
      allocationMethod: pick(["by-value", "by-weight", "by-quantity"], i),
      postedAt: daysAgo(i * 3),
    };
  });
}

function batches(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const made = daysAgo(30 + i * 5);
    return {
      id: `inv_batch_${i + 1}`,
      code: code("BTH", i, 8),
      product: pick(ITEMS, i),
      sku: code("SKU", i % 10, 5),
      onHand: 10 + ((i * 19) % 200),
      manufacturedAt: made,
      expiresAt: new Date(Date.parse(made) + (30 + i * 10) * 86_400_000).toISOString(),
      supplier: pick(SUPPLIERS, i),
      qcPassed: i % 5 !== 0,
    };
  });
}

function serialNumbers(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `inv_sn_${i + 1}`,
    serial: `SN-${pick(ITEMS, i).replace(/\s+/g, "").toUpperCase().slice(0, 3)}-${String(10000 + i * 37).slice(-5)}`,
    sku: code("SKU", i % 10, 5),
    warehouse: pick(["SFO DC", "AUS DC", "LHR DC"], i),
    status: pick(["in-stock", "in-stock", "sold", "reserved", "returned", "scrapped"], i),
    customer: i % 4 === 0 ? pick(["Acme Corp", "Globex", "Initech"], i) : "",
    warrantyExpiresAt: daysFromNow(365 + (i * 7) % 365),
  }));
}

function reconciliations(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `inv_rec_${i + 1}`,
    code: code("REC", i, 5),
    postedAt: daysAgo(i * 15),
    warehouse: pick(["SFO DC", "AUS DC", "LHR DC", "FRA DC"], i),
    scope: pick(["cycle-count", "spot-check", "full-count"], i),
    itemsCounted: 20 + ((i * 13) % 180),
    variance: ((i % 2 === 0 ? -1 : 1) * (i * 3)) % 50,
    varianceValue: Math.round(((i % 2 === 0 ? -1 : 1) * (i * 3)) % 50) * 25,
    status: pick(["published", "approved", "pending"], i),
    postedBy: pick(["sam@gutu.dev", "alex@gutu.dev"], i),
  }));
}

function pickLists(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const items = 3 + ((i * 5) % 15);
    return {
      id: `inv_pl_${i + 1}`,
      code: code("PL", i, 5),
      warehouse: pick(["SFO DC", "AUS DC", "LHR DC"], i),
      assignee: pick(["Alex", "Sam", "Taylor", "Jordan"], i),
      createdAt: daysAgo(i * 0.4),
      itemsCount: items,
      picked: Math.min(items, items - (i % 4)),
      status: pick(["in-progress", "in-progress", "picked", "packed", "shipped", "pending"], i),
      linkedOrder: code("SO", i, 4),
    };
  });
}

function packingSlips(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `inv_ps_${i + 1}`,
    code: code("PS", i, 5),
    linkedDelivery: code("DN", i, 6),
    packedAt: daysAgo(i * 0.4),
    packedBy: pick(["Alex", "Sam", "Taylor"], i),
    boxCount: 1 + (i % 6),
    weightKg: 2 + ((i * 3) % 50),
    dimensions: `${30 + i % 20} x ${20 + i % 15} x ${10 + i % 10}`,
  }));
}

function deliveryTrips(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `inv_dt_${i + 1}`,
    code: code("DT", i, 5),
    driver: pick(["Casey Perlman", "Morgan Hamilton", "Riley Liskov"], i),
    vehicle: pick(["VAN-01", "VAN-02", "TRK-01", "TRK-02"], i),
    route: pick(["West Bay loop", "Downtown run", "Airport express", "Peninsula sweep"], i),
    stops: 3 + (i % 8),
    scheduledAt: daysFromNow(i - 3),
    status: pick(["planned", "in-progress", "completed", "completed"], i),
    totalKm: 20 + ((i * 17) % 180),
  }));
}

function itemSuppliers(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `inv_is_${i + 1}`,
    sku: code("SKU", i % 15, 5),
    supplier: pick(SUPPLIERS, i),
    supplierSku: `SUP-${pick(SUPPLIERS, i).substring(0, 3).toUpperCase()}-${i + 1000}`,
    leadTimeDays: 3 + ((i * 7) % 30),
    minOrderQty: 10 * (1 + (i % 5)),
    unitCost: money(i, 1, 200),
    preferred: i % 3 === 0,
    lastPurchaseAt: daysAgo(i * 7),
  }));
}

export function seedInventoryExtended(): Record<string, number> {
  const out: Record<string, number> = {};
  // The factory seeds a basic "inventory.item" set; we backfill richer rows
  // only if the resource is empty.
  out["inventory.item"] = seedIf("inventory.item", items(40));
  out["inventory.warehouse"] = seedIf("inventory.warehouse", Array.from({ length: 8 }, (_, i) => ({
    id: `inv_wh_ext_${i + 1}`,
    code: `WH-${pick(["SFO", "AUS", "LHR", "FRA", "NRT", "SYD", "SIN", "YYZ"], i)}`,
    name: pick(["San Francisco", "Austin", "London", "Frankfurt", "Tokyo", "Sydney", "Singapore", "Toronto"], i) + " DC",
    city: pick(["San Francisco", "Austin", "London", "Frankfurt", "Tokyo", "Sydney", "Singapore", "Toronto"], i),
    country: pick(["USA", "USA", "UK", "DE", "JP", "AU", "SG", "CA"], i),
    capacity: 50_000 + ((i * 10_000) % 200_000),
    utilization: 40 + ((i * 7) % 55),
    manager: pick(["Sam", "Alex", "Taylor", "Jordan", "Casey"], i),
    kind: pick(["main", "main", "transit", "quarantine", "consignment"], i),
    status: i === 7 ? "inactive" : "active",
  })));
  out["inventory.bin"] = seedIf("inventory.bin", bins(80));
  out["inventory.item-variant"] = seedIf("inventory.item-variant", variants(20));
  out["inventory.item-price"] = seedIf("inventory.item-price", prices(30));
  out["inventory.stock-entry"] = seedIf("inventory.stock-entry", stockEntries(60));
  out["inventory.material-request"] = seedIf("inventory.material-request", materialRequests(24));
  out["inventory.delivery-note"] = seedIf("inventory.delivery-note", deliveryNotes(30));
  out["inventory.purchase-receipt"] = seedIf("inventory.purchase-receipt", purchaseReceipts(30));
  out["inventory.landed-cost"] = seedIf("inventory.landed-cost", landedCosts(12));
  out["inventory.batch"] = seedIf("inventory.batch", batches(30));
  out["inventory.serial-number"] = seedIf("inventory.serial-number", serialNumbers(40));
  out["inventory.stock-reconciliation"] = seedIf("inventory.stock-reconciliation", reconciliations(14));
  out["inventory.pick-list"] = seedIf("inventory.pick-list", pickLists(20));
  out["inventory.packing-slip"] = seedIf("inventory.packing-slip", packingSlips(20));
  out["inventory.delivery-trip"] = seedIf("inventory.delivery-trip", deliveryTrips(12));
  out["inventory.item-supplier"] = seedIf("inventory.item-supplier", itemSuppliers(30));
  return out;
}
