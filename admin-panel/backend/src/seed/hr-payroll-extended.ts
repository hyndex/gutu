import { db } from "../db";
import { bulkInsert } from "../lib/query";

/** Backend seed for the extended HR & Payroll resources: departments,
 *  designations, leave types/applications/balances, attendance, shifts,
 *  holiday lists, salary structures/components/slips, expense claims,
 *  advances, appraisals, training events, job requisitions, onboarding,
 *  offboarding. Idempotent per-resource. */

const DEPT_VALUES = ["eng", "ops", "sales", "marketing", "support", "hr", "finance", "product"];
const DEPT_LABELS = ["Engineering", "Operations", "Sales", "Marketing", "Support", "HR", "Finance", "Product"];
const LEAVE_VALUES = ["annual", "sick", "personal", "maternity", "paternity", "bereavement", "unpaid", "study"];
const LEAVE_LABELS = ["Annual", "Sick", "Personal", "Maternity", "Paternity", "Bereavement", "Unpaid", "Study"];
const EXPENSE_CATS = ["travel", "meals", "software", "hardware", "training", "other"];

const FIRST = ["Ada", "Grace", "Linus", "Guido", "Alan", "Donald", "Katherine", "Barbara", "Margaret", "Anita", "Radia", "Shafi", "Leslie", "Dennis", "Edsger"];
const LAST = ["Lovelace", "Hopper", "Torvalds", "van Rossum", "Turing", "Knuth", "Johnson", "Liskov", "Hamilton", "Borg", "Perlman", "Goldwasser", "Lamport", "Ritchie", "Dijkstra"];

const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length]!;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const code = (p: string, i: number, pad = 4) => `${p}-${String(1000 + i).padStart(pad, "0")}`;
const money = (i: number, base = 100, spread = 5000) =>
  Math.round(base + ((i * 97 + 13) % spread) * 100) / 100;
const personName = (i: number) => `${pick(FIRST, i)} ${pick(LAST, i + 3)}`;
const personEmail = (i: number, d = "gutu.dev") =>
  `${pick(FIRST, i).toLowerCase()}.${pick(LAST, i + 3).toLowerCase().replace(/\s+/g, "")}@${d}`;

const count = (r: string) =>
  (db.prepare("SELECT COUNT(*) AS c FROM records WHERE resource = ?").get(r) as { c: number }).c;
const seedIf = (r: string, rows: Record<string, unknown>[]) =>
  count(r) > 0 ? 0 : bulkInsert(r, rows);

function employees(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const hired = daysAgo(i * 60);
    const h = new Date(hired);
    const birth = new Date(h.getFullYear() - 30 - (i % 20), (i * 3) % 12, ((i * 5) % 27) + 1);
    return {
      id: `hr_emp_ext_${i + 1}`,
      empCode: `EMP-${String(1000 + i).padStart(4, "0")}`,
      name: personName(i),
      email: personEmail(i),
      phone: `+1-555-${String(1000 + i).slice(-4)}`,
      department: pick(DEPT_VALUES, i),
      designation: pick(["Engineer", "Senior Engineer", "Staff Engineer", "Designer", "PM", "Manager", "Lead", "Specialist", "Analyst"], i),
      role: pick(["Engineer", "Designer", "Manager", "Lead", "Specialist"], i),
      grade: pick(["L1", "L2", "L3", "L4", "L5", "M1", "M2"], i),
      manager: personName(i + 2),
      employmentType: pick(["full-time", "full-time", "full-time", "contract", "part-time"], i),
      location: pick(["San Francisco", "New York", "London", "Berlin", "Tokyo", "Remote"], i),
      hiredAt: hired,
      anniversaryAt: new Date(new Date().getFullYear(), h.getMonth(), h.getDate()).toISOString(),
      birthday: birth.toISOString(),
      status: pick(["active", "active", "active", "active", "on-leave", "resigned"], i),
      currency: pick(["USD", "EUR", "GBP"], i),
      baseSalary: 60_000 + ((i * 7_313) % 200_000),
      bio: "",
    };
  });
}

function departments(): Record<string, unknown>[] {
  return DEPT_LABELS.map((name, i) => ({
    id: `hr_dept_${i + 1}`,
    code: pick(["ENG", "OPS", "SAL", "MKT", "SUP", "HRP", "FIN", "PRD"], i),
    name,
    head: personName(i),
    parent: "",
    headcount: 4 + ((i * 5) % 18),
    budgetAnnual: 500_000 + ((i * 23_171) % 2_000_000),
  }));
}

function designations(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `hr_des_${i + 1}`,
    name: pick(
      ["Engineer", "Senior Engineer", "Staff Engineer", "Principal Engineer", "Designer", "Senior Designer", "PM", "Senior PM", "Manager", "Director", "Analyst", "Specialist"],
      i,
    ),
    grade: pick(["L1", "L2", "L3", "L4", "L5", "M1", "M2", "M3"], i),
    department: pick(DEPT_VALUES, i),
    description: "",
  }));
}

function leaveTypes(): Record<string, unknown>[] {
  return LEAVE_LABELS.map((name, i) => ({
    id: `hr_lt_${i + 1}`,
    name,
    code: pick(LEAVE_VALUES, i).toUpperCase(),
    annualAllowance: pick([20, 10, 5, 180, 14, 5, 0, 5], i),
    paid: pick(LEAVE_VALUES, i) !== "unpaid",
    carryForward: pick([true, false, false, false, false, false, false, false], i),
    requiresApproval: true,
  }));
}

function leaveApplications(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const from = daysFromNow(i - 20);
    const days = 1 + (i % 8);
    return {
      id: `hr_la_${i + 1}`,
      code: code("LV", i, 5),
      employee: personName(i),
      leaveType: pick(LEAVE_VALUES, i),
      fromAt: from,
      toAt: new Date(Date.parse(from) + days * 86_400_000).toISOString(),
      days,
      reason: pick(["Family trip", "Medical", "Personal work", "Vacation", "Mental health", "Moving"], i),
      submittedAt: daysAgo(i * 0.5),
      approver: personName(i + 5),
      status: pick(["approved", "pending", "pending", "approved", "rejected", "cancelled"], i),
    };
  });
}

function leaveBalances(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const accrued = pick([20, 10, 5, 14, 5], i);
    const used = (i * 3) % Math.max(accrued, 1);
    return {
      id: `hr_lb_${i + 1}`,
      employee: personName(i % 20),
      leaveType: pick(LEAVE_VALUES, i),
      year: "2026",
      accrued,
      used,
      available: Math.max(0, accrued - used),
    };
  });
}

function attendance(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `hr_att_${i + 1}`,
    employee: personName(i % 20),
    date: daysAgo(i * 0.2),
    status: pick(["present", "present", "present", "present", "late", "leave", "absent"], i),
    checkIn: daysAgo(i * 0.2),
    checkOut: daysAgo(i * 0.2 - 0.3),
    hoursWorked: 8 - (i % 3) * 0.5,
    shift: pick(["Morning", "Evening", "Night"], i),
  }));
}

function shifts(): Record<string, unknown>[] {
  return [
    { id: "hr_shift_1", name: "Morning", startTime: "09:00", endTime: "18:00", breakMinutes: 30, active: true },
    { id: "hr_shift_2", name: "Afternoon", startTime: "13:00", endTime: "22:00", breakMinutes: 45, active: true },
    { id: "hr_shift_3", name: "Night", startTime: "22:00", endTime: "06:00", breakMinutes: 60, active: true },
    { id: "hr_shift_4", name: "Weekend", startTime: "09:00", endTime: "17:00", breakMinutes: 30, active: true },
  ];
}

function holidayLists(): Record<string, unknown>[] {
  return [
    { id: "hr_hol_1", name: "US Federal 2026", country: "USA", year: "2026", holidaysCount: 11 },
    { id: "hr_hol_2", name: "UK Bank Holidays 2026", country: "UK", year: "2026", holidaysCount: 8 },
    { id: "hr_hol_3", name: "IN Public Holidays 2026", country: "IN", year: "2026", holidaysCount: 12 },
    { id: "hr_hol_4", name: "JP National 2026", country: "JP", year: "2026", holidaysCount: 16 },
    { id: "hr_hol_5", name: "EU General 2026", country: "EU", year: "2026", holidaysCount: 14 },
  ];
}

function payrolls(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const gross = money(i, 50_000, 200_000);
    const deductions = Math.round(gross * 0.08);
    const taxes = Math.round(gross * 0.2);
    return {
      id: `hr_pay_ext_${i + 1}`,
      period: `2026-${String(Math.max(1, 13 - i)).padStart(2, "0")}`,
      employees: 42 + (i % 10),
      gross,
      deductions,
      taxes,
      net: gross - deductions - taxes,
      currency: "USD",
      status: i < 2 ? "calculated" : i < 3 ? "approved" : "paid",
      processedAt: daysAgo(i * 30),
      processedBy: "sam@gutu.dev",
    };
  });
}

function salaryStructures(): Record<string, unknown>[] {
  return ["L1 Standard", "L2 Standard", "L3 Staff", "L4 Senior", "M1 Manager", "Contractor"].map(
    (name, i) => ({
      id: `hr_ss_${i + 1}`,
      name,
      currency: pick(["USD", "EUR", "GBP"], i),
      baseAnnual: 50_000 + i * 15_000,
      hra: Math.round((50_000 + i * 15_000) * 0.15),
      allowances: 3_000 + i * 500,
      active: true,
    }),
  );
}

function salaryComponents(): Record<string, unknown>[] {
  const names = ["Basic", "HRA", "Transport", "Meal", "Bonus", "Tax", "PF", "Insurance", "Loan Deduction", "Overtime"];
  const kinds = ["earning", "earning", "earning", "earning", "earning", "deduction", "deduction", "deduction", "deduction", "earning"];
  const formulas = ["base", "base * 0.15", "flat 500", "flat 200", "perf * 1000", "gross * 0.2", "gross * 0.08", "flat 150", "amount", "hours * rate"];
  return names.map((name, i) => ({
    id: `hr_sc_${i + 1}`,
    name,
    kind: kinds[i],
    formula: formulas[i],
    taxable: i % 2 === 0,
  }));
}

function salarySlips(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const basic = 3_000 + ((i * 317) % 8000);
    const hra = Math.round(basic * 0.2);
    const allowances = 500 + (i % 5) * 200;
    const pf = Math.round(basic * 0.08);
    const tax = Math.round((basic + hra + allowances) * 0.15);
    const other = (i % 4) * 100;
    const net = basic + hra + allowances - pf - tax - other;
    return {
      id: `hr_slip_${i + 1}`,
      code: code("SLIP", i, 5),
      period: `2026-${String(Math.max(1, 13 - (i % 12))).padStart(2, "0")}`,
      employee: personName(i % 20),
      basic,
      hra,
      allowances,
      pf,
      tax,
      otherDeductions: other,
      net,
      status: pick(["paid", "paid", "paid", "issued"], i),
    };
  });
}

function expenseClaims(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `hr_exp_${i + 1}`,
    code: code("EXP", i, 5),
    employee: personName(i % 20),
    category: pick(EXPENSE_CATS, i),
    amount: money(i, 20, 2000),
    submittedAt: daysAgo(i * 2),
    approver: personName(i + 5),
    status: pick(["reimbursed", "approved", "submitted", "rejected", "submitted", "reimbursed"], i),
    description: pick(["Client dinner", "Conference pass", "Team lunch", "SaaS subscription", "Flights", "Hotel", "Uber"], i),
  }));
}

function advances(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `hr_adv_${i + 1}`,
    code: code("ADV", i, 5),
    employee: personName(i % 20),
    amount: money(i, 500, 10000),
    purpose: pick(["Relocation", "Travel advance", "Personal", "Emergency"], i),
    repaymentMonths: pick([3, 6, 12], i),
    status: pick(["settled", "disbursed", "approved", "pending"], i),
    disbursedAt: daysAgo(i * 15),
  }));
}

function appraisals(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `hr_apr_${i + 1}`,
    code: code("APR", i, 5),
    employee: personName(i % 20),
    cycle: pick(["2026-H1", "2025-H2", "2025-H1", "2024-H2"], i),
    manager: personName(i + 5),
    overallRating: Math.round((3 + ((i * 0.7) % 2)) * 10) / 10,
    promotionProposed: i % 5 === 0,
    status: pick(["final", "final", "manager-review", "self-review", "calibrated"], i),
  }));
}

function trainingEvents(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `hr_tr_${i + 1}`,
    title: pick(
      ["React fundamentals", "Leadership 101", "Security awareness", "SQL deep-dive", "Effective writing", "Design systems", "Product thinking", "AWS Solutions Architect"],
      i,
    ),
    kind: pick(["classroom", "online", "workshop", "certification"], i),
    trainer: pick(["External", "Internal", "Sam", "Alex", "Taylor"], i),
    startAt: daysFromNow(i * 15 - 30),
    durationHours: pick([4, 8, 16, 24, 40], i),
    capacity: 20 + (i % 4) * 10,
    enrolled: 12 + ((i * 5) % 20),
    status: pick(["scheduled", "completed", "scheduled", "completed"], i),
  }));
}

function jobRequisitions(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `hr_req_${i + 1}`,
    code: code("REQ", i, 5),
    title: pick(
      ["Senior Engineer", "Staff Engineer", "Product Manager", "Designer", "Engineering Manager", "SRE", "Sales Rep", "Marketing Manager"],
      i,
    ),
    department: pick(DEPT_VALUES, i),
    level: pick(["L3", "L4", "L5", "M1", "L2", "L3"], i),
    hiringManager: personName(i),
    openedAt: daysAgo(i * 10),
    targetHireAt: daysFromNow(30 - i),
    status: pick(["open", "open", "open", "filled", "on-hold", "draft"], i),
    applicants: (i * 13) % 80,
    budgetedSalary: 80_000 + (i * 12_000),
  }));
}

function onboarding(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const total = 8 + (i % 5);
    const done = Math.min(total, (i * 2) % (total + 2));
    return {
      id: `hr_ob_${i + 1}`,
      employee: personName(i),
      buddy: personName(i + 5),
      startAt: daysAgo(i * 7),
      tasksTotal: total,
      tasksDone: done,
      completionPct: Math.round((done / total) * 100),
      status: done === total ? "completed" : done > 0 ? "in-progress" : "pending",
    };
  });
}

function offboarding(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `hr_off_${i + 1}`,
    employee: personName(i + 10),
    lastDay: daysFromNow(i * 7 - 30),
    reason: pick(["voluntary", "voluntary", "retirement", "contract-end", "involuntary"], i),
    exitInterviewAt: daysFromNow(i * 7 - 25),
    assetsReturned: i > 1,
    accessRevoked: i > 2,
    finalSettlementDone: i > 3,
  }));
}

export function seedHrPayrollExtended(): Record<string, number> {
  const out: Record<string, number> = {};
  // The factory seeds a basic hr-payroll.employee + hr-payroll.payroll set; we
  // backfill richer records only if the resource is empty. Other resources
  // are net-new and always seeded on first boot.
  out["hr-payroll.employee"] = seedIf("hr-payroll.employee", employees(30));
  out["hr-payroll.department"] = seedIf("hr-payroll.department", departments());
  out["hr-payroll.designation"] = seedIf("hr-payroll.designation", designations(12));
  out["hr-payroll.leave-type"] = seedIf("hr-payroll.leave-type", leaveTypes());
  out["hr-payroll.leave-application"] = seedIf("hr-payroll.leave-application", leaveApplications(30));
  out["hr-payroll.leave-balance"] = seedIf("hr-payroll.leave-balance", leaveBalances(40));
  out["hr-payroll.attendance"] = seedIf("hr-payroll.attendance", attendance(60));
  out["hr-payroll.shift"] = seedIf("hr-payroll.shift", shifts());
  out["hr-payroll.holiday-list"] = seedIf("hr-payroll.holiday-list", holidayLists());
  out["hr-payroll.payroll"] = seedIf("hr-payroll.payroll", payrolls(14));
  out["hr-payroll.salary-structure"] = seedIf("hr-payroll.salary-structure", salaryStructures());
  out["hr-payroll.salary-component"] = seedIf("hr-payroll.salary-component", salaryComponents());
  out["hr-payroll.salary-slip"] = seedIf("hr-payroll.salary-slip", salarySlips(40));
  out["hr-payroll.expense-claim"] = seedIf("hr-payroll.expense-claim", expenseClaims(30));
  out["hr-payroll.advance"] = seedIf("hr-payroll.advance", advances(8));
  out["hr-payroll.appraisal"] = seedIf("hr-payroll.appraisal", appraisals(20));
  out["hr-payroll.training-event"] = seedIf("hr-payroll.training-event", trainingEvents(10));
  out["hr-payroll.job-requisition"] = seedIf("hr-payroll.job-requisition", jobRequisitions(12));
  out["hr-payroll.onboarding"] = seedIf("hr-payroll.onboarding", onboarding(8));
  out["hr-payroll.offboarding"] = seedIf("hr-payroll.offboarding", offboarding(6));
  return out;
}
