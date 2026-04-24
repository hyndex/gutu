import { db } from "../db";
import { bulkInsert } from "../lib/query";

const ASSETS = ["Forklift #2", "HVAC-North", "Press A", "Conveyor 1", "Compressor B", "Pump 3", "Robot-R5", "CNC-01"];
const TECHS = ["Taylor Turing", "Jordan Hamilton", "Casey Pappas", "Morgan Liskov", "Riley Perlman"];

const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length]!;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const code = (p: string, i: number, pad = 4) => `${p}-${String(1000 + i).padStart(pad, "0")}`;

const count = (r: string) =>
  (db.prepare("SELECT COUNT(*) AS c FROM records WHERE resource = ?").get(r) as { c: number }).c;
const seedIf = (r: string, rows: Record<string, unknown>[]) =>
  count(r) > 0 ? 0 : bulkInsert(r, rows);

export function seedCmmsExtended(): Record<string, number> {
  const out: Record<string, number> = {};

  out["maintenance-cmms.work-order"] = seedIf("maintenance-cmms.work-order", Array.from({ length: 40 }, (_, i) => {
    const created = daysAgo(i * 2);
    const isCompleted = i % 3 === 2;
    const due = daysAgo(i * 2 - 5);
    return {
      id: `cmms_wo_ext_${i + 1}`,
      code: code("WO", i, 6),
      title: pick([
        "Replace motor bearing", "Lubricate chain", "Inspect belt",
        "Calibrate sensor", "Replace filter", "Emergency repair",
        "Monthly PM check", "Quarterly overhaul",
      ], i),
      asset: pick(ASSETS, i),
      workType: pick(["corrective", "preventive", "preventive", "predictive", "inspection", "emergency"], i),
      task: pick(["Inspect", "Replace filter", "Lubricate", "Calibrate", "Replace bearing"], i),
      technician: pick(TECHS, i),
      priority: pick(["low", "normal", "high"], i),
      status: isCompleted ? "resolved" : pick(["open", "in_progress"], i),
      createdAt: created,
      dueAt: due,
      completedAt: isCompleted ? daysAgo(i * 2 - 3) : "",
      estimatedHours: pick([1, 2, 4, 8], i),
      actualHours: isCompleted ? pick([1, 2, 4, 6], i) : 0,
      overdue: !isCompleted && Date.parse(due) < Date.now(),
      laborCost: (isCompleted ? pick([1, 2, 4, 6], i) : 0) * 80,
      partsCost: (i * 29) % 500,
      notes: "",
    };
  }));

  out["maintenance-cmms.pm-schedule"] = seedIf("maintenance-cmms.pm-schedule", Array.from({ length: 20 }, (_, i) => {
    const interval = pick([30, 60, 90, 180, 365], i);
    const nextDue = daysFromNow(interval - (i % interval));
    return {
      id: `cmms_pm_${i + 1}`,
      code: code("PM", i, 5),
      asset: pick(ASSETS, i),
      task: pick(["Oil change", "Belt inspection", "Sensor calibration", "Full overhaul", "Cleaning"], i),
      intervalDays: interval,
      lastDoneAt: daysAgo(interval - (i % interval)),
      nextDueAt: nextDue,
      dueSoon: (Date.parse(nextDue) - Date.now()) / 86_400_000 < 30,
      missed: i % 9 === 0,
      lastCompletedOnTime: i % 5 !== 0,
      active: i !== 19,
    };
  }));

  out["maintenance-cmms.downtime"] = seedIf("maintenance-cmms.downtime", Array.from({ length: 18 }, (_, i) => ({
    id: `cmms_dt_${i + 1}`,
    code: code("DT", i, 5),
    asset: pick(ASSETS, i),
    reason: pick(["breakdown", "planned-pm", "changeover", "power-loss", "material-shortage"], i),
    startedAt: daysAgo(i),
    endedAt: daysAgo(i - 0.1),
    durationHours: 1 + (i * 0.7) % 8,
    costImpact: 500 + (i * 311) % 5000,
  })));

  out["maintenance-cmms.spare-part"] = seedIf("maintenance-cmms.spare-part", Array.from({ length: 30 }, (_, i) => ({
    id: `cmms_sp_${i + 1}`,
    sku: `SP-${String(10000 + i).slice(-5)}`,
    name: pick(["Motor", "Filter", "Belt", "Seal", "Pump", "Thermostat", "Sensor", "Bearing"], i),
    asset: pick(ASSETS, i),
    onHand: (i * 3) % 100,
    reorderPoint: 10 + (i * 2) % 20,
    unitCost: 15 + (i * 11) % 250,
    lastUsedAt: daysAgo(i * 2),
  })));

  out["maintenance-cmms.asset-kpi"] = seedIf("maintenance-cmms.asset-kpi", Array.from({ length: 8 }, (_, i) => ({
    id: `cmms_kpi_${i + 1}`,
    asset: pick(ASSETS, i),
    mtbfDays: 30 + (i * 17) % 200,
    mttrHours: 1 + (i * 0.5) % 10,
    availabilityPct: 80 + (i * 3) % 20,
    failures: 1 + (i % 8),
    asOfAt: daysAgo(i * 7),
  })));

  out["maintenance-cmms.checklist"] = seedIf("maintenance-cmms.checklist", Array.from({ length: 10 }, (_, i) => ({
    id: `cmms_cl_${i + 1}`,
    name: pick([
      "Forklift daily walk-around", "HVAC monthly PM", "Press A inspection",
      "Conveyor weekly clean", "Compressor annual overhaul",
    ], i),
    assetCategory: pick(["Vehicle", "HVAC", "Press", "Conveyor", "Compressor"], i),
    itemsCount: 5 + (i * 2) % 20,
    estimatedMinutes: 15 + (i * 5) % 60,
    active: i !== 9,
  })));

  return out;
}
