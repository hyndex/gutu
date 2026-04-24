import { db } from "../db";
import { bulkInsert } from "../lib/query";

/** Backend seed for extended Booking resources (service/resource/staff/
 *  availability-rule/location/waitlist). Idempotent per-resource. */

const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length]!;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const code = (p: string, i: number, pad = 4) => `${p}-${String(1000 + i).padStart(pad, "0")}`;

const count = (r: string) =>
  (db.prepare("SELECT COUNT(*) AS c FROM records WHERE resource = ?").get(r) as { c: number }).c;
const seedIf = (r: string, rows: Record<string, unknown>[]) =>
  count(r) > 0 ? 0 : bulkInsert(r, rows);

export function seedBookingExtended(): Record<string, number> {
  const out: Record<string, number> = {};

  out["booking.service"] = seedIf(
    "booking.service",
    Array.from({ length: 10 }, (_, i) => ({
      id: `svc_${i + 1}`,
      code: code("SVC", i, 4),
      name: pick(
        ["Consultation", "Deep clean", "Strategy call", "On-site visit", "Training",
          "Quick tune-up", "Full service", "Emergency call-out", "Quarterly check", "Bespoke work"],
        i,
      ),
      category: pick(["consultation", "cleaning", "training", "maintenance", "custom"], i),
      durationMin: pick([30, 45, 60, 90, 120], i),
      price: 75 + i * 30,
      currency: "USD",
      active: i !== 9,
      description: "",
    })),
  );

  out["booking.resource"] = seedIf(
    "booking.resource",
    Array.from({ length: 14 }, (_, i) => ({
      id: `res_${i + 1}`,
      code: code("RES", i, 4),
      name: pick(
        ["Meeting Room A", "Meeting Room B", "Workshop Bay 1", "Workshop Bay 2", "Van #1", "Van #2",
          "Desk 1", "Desk 2", "Table T1", "Projector", "Demo Room", "Lab A", "Lab B", "Studio"],
        i,
      ),
      kind: pick(["room", "equipment", "vehicle", "desk", "table"], i),
      location: pick(["HQ", "HQ", "HQ", "Field Depot", "Downtown", "Field Depot"], i),
      capacity: pick([8, 4, 12, 6, 2, 2, 1, 1, 4, 0, 10, 8, 8, 6], i),
      status: pick(["available", "available", "available", "in-use", "maintenance"], i),
    })),
  );

  out["booking.staff"] = seedIf(
    "booking.staff",
    Array.from({ length: 8 }, (_, i) => ({
      id: `staff_${i + 1}`,
      code: code("STF", i, 4),
      name: pick(
        ["Sam Hopper", "Alex Knuth", "Taylor Turing", "Jordan Hamilton", "Casey Pappas",
          "Morgan Liskov", "Riley Perlman", "Dakota Shamir"],
        i,
      ),
      role: pick(["Consultant", "Technician", "Trainer", "Specialist", "Lead"], i),
      skills: pick([
        ["react", "typescript"],
        ["plumbing", "electrical"],
        ["sales", "onboarding"],
        ["cleaning", "setup"],
        ["training", "coaching"],
      ], i),
      hourlyRate: 40 + i * 15,
      active: i !== 7,
    })),
  );

  out["booking.availability-rule"] = seedIf(
    "booking.availability-rule",
    Array.from({ length: 30 }, (_, i) => {
      const staff = Math.floor(i / 5) + 1;
      return {
        id: `ar_${i + 1}`,
        staffId: `staff_${Math.min(staff, 7)}`,
        dayOfWeek: pick(["mon", "tue", "wed", "thu", "fri"], i % 5),
        startTime: "09:00",
        endTime: "17:00",
        timezone: pick(["America/Los_Angeles", "America/New_York", "Europe/London"], staff),
      };
    }),
  );

  out["booking.location"] = seedIf(
    "booking.location",
    Array.from({ length: 5 }, (_, i) => ({
      id: `loc_${i + 1}`,
      code: pick(["HQ", "DWN", "FLD", "EU1", "AP1"], i),
      name: pick(["HQ", "Downtown Office", "Field Depot", "London Hub", "Tokyo Hub"], i),
      address: pick(["100 Main St", "200 Market Ave", "300 Industrial Way", "10 Baker St", "1 Chome"], i),
      city: pick(["San Francisco", "San Francisco", "Austin", "London", "Tokyo"], i),
      country: pick(["USA", "USA", "USA", "UK", "JP"], i),
      timezone: pick(["America/Los_Angeles", "America/Los_Angeles", "America/Chicago", "Europe/London", "Asia/Tokyo"], i),
      active: true,
    })),
  );

  out["booking.waitlist"] = seedIf(
    "booking.waitlist",
    Array.from({ length: 12 }, (_, i) => ({
      id: `wl_${i + 1}`,
      code: code("WL", i, 5),
      customer: pick(["Acme Corp", "Globex", "Initech", "Hooli", "Pied Piper", "Dunder Mifflin"], i),
      service: pick(["Consultation", "Deep clean", "Strategy call", "On-site visit", "Training"], i),
      requestedAt: daysAgo(i * 0.5),
      desiredWindow: pick(["Next week", "Within 48h", "Tomorrow AM", "Anytime this month"], i),
      status: pick(["waiting", "waiting", "offered", "converted", "expired", "cancelled"], i),
    })),
  );

  return out;
}
