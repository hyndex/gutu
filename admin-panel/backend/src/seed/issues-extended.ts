import { db } from "../db";
import { bulkInsert } from "../lib/query";

const COMPONENTS = ["auth", "billing", "dashboard", "api", "search", "mobile", "email", "reports"];
const FIRST = ["Ada", "Grace", "Linus", "Guido", "Alan", "Donald", "Katherine", "Barbara"];
const LAST = ["Lovelace", "Hopper", "Torvalds", "van Rossum", "Turing", "Knuth", "Johnson", "Liskov"];

const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length]!;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const code = (p: string, i: number, pad = 4) => `${p}-${String(1000 + i).padStart(pad, "0")}`;
const personName = (i: number) => `${pick(FIRST, i)} ${pick(LAST, i + 2)}`;

const count = (r: string) =>
  (db.prepare("SELECT COUNT(*) AS c FROM records WHERE resource = ?").get(r) as { c: number }).c;
const seedIf = (r: string, rows: Record<string, unknown>[]) =>
  count(r) > 0 ? 0 : bulkInsert(r, rows);

export function seedIssuesExtended(): Record<string, number> {
  const out: Record<string, number> = {};

  out["issues.issue"] = seedIf("issues.issue", Array.from({ length: 60 }, (_, i) => {
    const created = daysAgo(i * 0.5);
    const isResolved = i % 3 === 2;
    return {
      id: `iss_ext_${i + 1}`,
      code: code("ISS", i, 5),
      title: pick([
        "Login fails in Safari 18", "Slow dashboard with > 1k rows",
        "Typo in settings footer", "Export broken on large accounts",
        "Email bounces on subdomain", "API 429 under burst",
        "Mobile keyboard overlaps input", "Search misses recent items",
        "Incorrect tax computed", "Dark-mode contrast issue",
        "Cron job intermittently fails", "Webhook signature mismatch",
      ], i),
      component: pick(COMPONENTS, i),
      kind: pick(["bug", "bug", "regression", "feature", "task", "doc"], i),
      severity: pick(["critical", "major", "minor", "major", "trivial"], i),
      priority: pick(["low", "normal", "normal", "high", "urgent"], i),
      status: pick(["open", "in_progress", "resolved", "closed"], i),
      assignee: personName(i),
      reporter: personName(i + 7),
      reporterKind: pick(["customer", "customer", "internal", "automation"], i),
      labels: pick([["bug"], ["regression", "security"], ["performance"], ["ux"], ["docs"], ["infra"]], i),
      foundInRelease: pick(["v2.3.1", "v2.3.2", "v2.4.0", "v2.4.1"], i),
      fixedInRelease: isResolved ? pick(["v2.4.1", "v2.4.2", "v2.5.0"], i) : "",
      createdAt: created,
      resolvedAt: isResolved ? daysAgo(i * 0.3) : "",
      updatedAt: daysAgo(i * 0.4),
      slaBreached: i % 11 === 0,
      description: "",
      repro: "Steps: 1. …",
      resolution: isResolved ? "Fixed by rolling back feature flag X." : "",
    };
  }));

  out["issues.release"] = seedIf("issues.release", Array.from({ length: 10 }, (_, i) => ({
    id: `iss_rel_${i + 1}`,
    name: `v2.${Math.floor(i / 2)}.${i % 2}`,
    codename: pick(["Nimbus", "Orion", "Pegasus", "Quasar", "Rigel", "Sirius"], i),
    releasedAt: daysAgo((10 - i) * 14),
    channel: pick(["alpha", "beta", "rc", "stable", "stable"], i),
    issuesFixed: 5 + (i * 7) % 40,
    regressions: i % 4,
    status: i < 8 ? "released" : "planned",
  })));

  out["issues.issue-comment"] = seedIf("issues.issue-comment", Array.from({ length: 60 }, (_, i) => ({
    id: `iss_cmt_${i + 1}`,
    issueCode: code("ISS", i % 60, 5),
    author: personName(i),
    body: pick([
      "Repro'd on Chrome 131.", "Added tests.", "Cannot repro — need env details.",
      "Shipping in v2.5.0.", "Rolling back feature flag.", "Thanks — closing.",
    ], i),
    createdAt: daysAgo(i * 0.3),
    internal: i % 3 === 0,
  })));

  out["issues.issue-watcher"] = seedIf("issues.issue-watcher", Array.from({ length: 40 }, (_, i) => ({
    id: `iss_wch_${i + 1}`,
    issueCode: code("ISS", i % 60, 5),
    user: personName(i),
    addedAt: daysAgo(i * 0.4),
  })));

  return out;
}
