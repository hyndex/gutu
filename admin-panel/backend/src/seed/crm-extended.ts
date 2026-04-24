import { db } from "../db";
import { bulkInsert } from "../lib/query";

/** Backend seed for the extended CRM resources (leads, opportunities,
 *  campaigns, appointments, contracts, competitors, market segments, sales
 *  stages). Idempotent per-resource: only seeds a resource if zero records
 *  exist for it. Safe to run on every boot. */

const OWNERS = ["sam@gutu.dev", "alex@gutu.dev", "taylor@gutu.dev", "jordan@gutu.dev"];
const COMPANIES = ["Initech", "Umbrella", "Globex", "Tyrell", "Cyberdyne", "Hooli", "Stark Industries", "Dunder Mifflin", "Acme Co", "Massive Dynamic"];
const FIRST = ["Ada", "Grace", "Alan", "Linus", "Margaret", "Katherine", "Rachel", "Ken", "Barbara", "Guido"];
const LAST = ["Knuth", "Hopper", "Turing", "Torvalds", "Hamilton", "Johnson", "Pappas", "Thompson", "Liskov", "van Rossum"];
const TERR = ["NA East", "NA West", "EMEA", "APAC", "LATAM"];
const SOURCES = ["website", "referral", "cold-outreach", "event", "partner", "advertisement", "social", "inbound-chat"] as const;
const LEAD_STATUSES = ["new", "contacted", "qualified", "unqualified", "converted", "lost"] as const;
const OPP_STAGES = ["discovery", "qualification", "proposal", "negotiation", "won", "lost"] as const;
const STAGE_PROB: Record<string, number> = { discovery: 10, qualification: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 };
const LOST_REASONS = ["Budget", "Competitor", "Timing", "No decision", "Feature gap"];

const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length];
const name = (i: number) => `${pick(FIRST, i)} ${pick(LAST, i + 2)}`;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const code = (prefix: string, i: number, pad = 4) => `${prefix}-${String(i + 1).padStart(pad, "0")}`;

function count(resource: string): number {
  const r = db.prepare("SELECT COUNT(*) AS c FROM records WHERE resource = ?").get(resource) as { c: number };
  return r.c;
}
function seedIfEmpty(resource: string, rows: Record<string, unknown>[]): number {
  if (count(resource) > 0) return 0;
  return bulkInsert(resource, rows);
}

function leads(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const nm = name(i);
    const status = pick(LEAD_STATUSES, i);
    const createdAt = daysAgo(60 - (i % 60));
    const respMin = (i * 37) % 240;
    return {
      id: `lead_${i + 1}`,
      code: code("LD", i),
      name: nm,
      email: `${nm.toLowerCase().replace(/\s+/g, ".")}@${pick(COMPANIES, i).toLowerCase().replace(/\s+/g, "-")}.com`,
      phone: `+1-555-${String(1000 + i).slice(-4)}`,
      company: pick(COMPANIES, i),
      title: pick(["CTO", "VP Eng", "Head of Ops", "Director", "Founder", "PM"], i),
      source: pick(SOURCES, i),
      status,
      score: 20 + ((i * 13) % 80),
      owner: pick(OWNERS, i),
      territory: pick(TERR, i),
      campaign: i % 3 === 0 ? `camp_${(i % 10) + 1}` : undefined,
      industry: pick(["SaaS", "Retail", "Manufacturing", "Healthcare", "Finance"], i),
      createdAt,
      updatedAt: daysAgo((i * 0.3) % 30),
      firstResponseAt:
        status !== "new" ? new Date(Date.parse(createdAt) + respMin * 60_000).toISOString() : undefined,
      convertedAt: status === "converted" ? daysAgo((i * 0.5) % 25) : undefined,
      convertedToOpportunityId: status === "converted" ? `opp_${(i % 30) + 1}` : undefined,
      lostReason: status === "lost" || status === "unqualified" ? pick(LOST_REASONS, i) : undefined,
    };
  });
}

function opps(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => {
    const stage = pick(OPP_STAGES, i);
    const amount = 5_000 + ((i * 3_217) % 195_000);
    const probability = STAGE_PROB[stage];
    return {
      id: `opp_${i + 1}`,
      code: code("OP", i),
      name: `${pick(COMPANIES, i)} — ${pick(["expansion", "renewal", "new logo", "upsell", "cross-sell"], i)}`,
      account: pick(COMPANIES, i),
      contactId: `contact_${(i % 15) + 1}`,
      owner: pick(OWNERS, i),
      stage,
      amount,
      probability,
      weightedAmount: Math.round((amount * probability) / 100),
      closeDate: daysAgo(-7 - (i % 90)),
      source: pick(SOURCES, i),
      campaign: i % 4 === 0 ? `camp_${(i % 10) + 1}` : undefined,
      competitor: i % 5 === 0 ? `comp_${(i % 5) + 1}` : undefined,
      lostReason: stage === "lost" ? pick(LOST_REASONS, i) : undefined,
      nextStep:
        stage !== "won" && stage !== "lost"
          ? pick(["Schedule demo", "Send proposal", "Follow up with CTO", "Legal review", "Pricing discussion"], i)
          : undefined,
      createdAt: daysAgo(90 - (i % 90)),
      updatedAt: daysAgo((i * 0.4) % 30),
    };
  });
}

function campaigns(n: number): Record<string, unknown>[] {
  const CAMPAIGN_STATUSES = ["draft", "scheduled", "active", "paused", "completed", "archived"] as const;
  const CAMPAIGN_TYPES = ["email", "event", "webinar", "paid-ads", "content", "partner", "direct-mail"] as const;
  const NAMES = [
    "Q1 Webinar Series", "EU Expansion Launch", "Product-Led Growth Trial", "Partner Co-Marketing",
    "Re-engage Dormant", "Industry Conference", "Content Nurture Track", "Paid Search — Enterprise",
    "LinkedIn Outbound", "Holiday Promo",
  ];
  return Array.from({ length: n }, (_, i) => {
    const status = pick(CAMPAIGN_STATUSES, i);
    const budget = 5_000 + ((i * 7_537) % 45_000);
    const spent = status === "draft" ? 0 : Math.round(budget * (0.4 + ((i * 0.11) % 0.6)));
    const leadsGenerated = status === "draft" ? 0 : 10 + ((i * 17) % 200);
    const opportunitiesGenerated = Math.round(leadsGenerated * (0.05 + (i * 0.013) % 0.3));
    const revenueGenerated = opportunitiesGenerated * (10_000 + (i * 2137) % 40_000);
    return {
      id: `camp_${i + 1}`,
      code: code("CM", i),
      name: pick(NAMES, i),
      type: pick(CAMPAIGN_TYPES, i),
      status,
      budget,
      spent,
      owner: pick(OWNERS, i),
      startAt: daysAgo(60 - (i % 60)),
      endAt: daysAgo(-30 + (i % 60)),
      leadsGenerated,
      opportunitiesGenerated,
      revenueGenerated,
      targetAudience: pick(["SMB", "Mid-Market", "Enterprise", "Existing customers"], i),
      channel: pick(["Email", "LinkedIn", "Webinar", "Conference", "Ads"], i),
    };
  });
}

function appointments(n: number): Record<string, unknown>[] {
  const types = ["discovery-call", "demo", "follow-up", "onboarding", "check-in"] as const;
  const statuses = ["proposed", "confirmed", "completed", "cancelled", "no-show"] as const;
  return Array.from({ length: n }, (_, i) => {
    const status = pick(statuses, i);
    return {
      id: `appt_${i + 1}`,
      code: code("AP", i),
      subject: pick(["Intro call", "Product demo", "Follow-up on pricing", "Onboarding kickoff", "Quarterly check-in"], i),
      type: pick(types, i),
      status,
      contactId: `contact_${(i % 15) + 1}`,
      opportunityId: i % 3 === 0 ? `opp_${(i % 30) + 1}` : undefined,
      assignee: pick(OWNERS, i),
      startAt: daysAgo(-3 + i * 0.7),
      durationMinutes: pick([30, 45, 60, 90], i),
      location: i % 2 === 0 ? undefined : pick(["SF HQ", "NYC Office", "London"], i),
      meetingUrl: `https://meet.gutu.dev/${code("AP", i).toLowerCase()}`,
      notes:
        status === "completed"
          ? pick(
              [
                "Strong interest; next step: proposal.",
                "Pricing objection raised; follow up with discount options.",
                "CTO liked the ingestion rate; loop in security team next.",
                "Wants PoC; send statement of work.",
              ],
              i,
            )
          : undefined,
    };
  });
}

function contracts(n: number): Record<string, unknown>[] {
  const statuses = ["draft", "sent", "signed", "active", "renewed", "expired", "terminated"] as const;
  return Array.from({ length: n }, (_, i) => {
    const status = pick(statuses, i);
    const startAt = daysAgo(365 - (i * 7) % 365);
    return {
      id: `ctr_${i + 1}`,
      code: code("CT", i),
      name: `Master Services Agreement — ${pick(COMPANIES, i)}`,
      counterparty: pick(COMPANIES, i),
      contactId: `contact_${(i % 15) + 1}`,
      opportunityId: `opp_${(i % 30) + 1}`,
      value: 25_000 + ((i * 4_927) % 200_000),
      currency: "USD",
      startAt,
      endAt: new Date(Date.parse(startAt) + 365 * 86_400_000).toISOString(),
      status,
      autoRenew: i % 2 === 0,
      owner: pick(OWNERS, i),
      templateId: pick(["tpl_msa", "tpl_dpa", "tpl_sla"], i),
      signedAt:
        status === "signed" || status === "active" || status === "renewed"
          ? daysAgo(300 - (i * 5) % 300)
          : undefined,
      lastReviewAt: daysAgo((i * 8) % 120),
    };
  });
}

function competitors(n: number): Record<string, unknown>[] {
  const names = ["Rival A", "Rival B", "Rival C", "Rival D", "Rival E", "Rival F"];
  return Array.from({ length: n }, (_, i) => ({
    id: `comp_${i + 1}`,
    name: pick(names, i),
    website: `https://${pick(names, i).toLowerCase().replace(/\s+/g, "-")}.com`,
    category: pick(["Direct", "Indirect", "Emerging"], i),
    strengths: pick([
      ["Brand recognition", "Marketing spend"],
      ["Low price", "Self-service onboarding"],
      ["Integrations", "Developer mindshare"],
      ["Enterprise relationships", "Compliance certifications"],
    ], i),
    weaknesses: pick([
      ["Poor support SLA", "Clunky UX"],
      ["Limited API", "No multi-tenant"],
      ["Steep pricing", "Lock-in"],
      ["Slow roadmap", "Thin docs"],
    ], i),
    winRateVsUs: 35 + ((i * 11) % 50),
    notes: pick([
      "Tends to win on price in SMB; loses to us on flexibility.",
      "Strong in EU; we win on latency in APAC.",
      "Newer entrant; watch their Series B funding.",
    ], i),
  }));
}

function marketSegments(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `seg_${i + 1}`,
    name: pick([
      "EU SaaS Mid-Market", "US Enterprise Retail", "APAC Fintech SMB", "Global Manufacturing",
      "Healthcare Compliance", "Public Sector NA", "Education & Nonprofit", "Hospitality",
    ], i),
    industry: pick(["SaaS", "Retail", "Finance", "Manufacturing", "Healthcare", "Public Sector", "Education", "Hospitality"], i),
    geo: pick(["NA", "EMEA", "APAC", "LATAM", "Global"], i),
    companySize: pick(["SMB", "Mid-Market", "Enterprise"], i),
    targetAccountCount: 50 + ((i * 37) % 450),
    coveragePct: 15 + ((i * 11) % 70),
    owner: pick(OWNERS, i),
  }));
}

function salesStages(): Record<string, unknown>[] {
  return OPP_STAGES.map((s, i) => ({
    id: `stg_${s}`,
    name:
      s === "won" ? "Closed Won" : s === "lost" ? "Closed Lost" : s.charAt(0).toUpperCase() + s.slice(1),
    order: i + 1,
    probability: STAGE_PROB[s],
    description:
      s === "discovery"
        ? "Initial conversation; understanding the customer's problem."
        : s === "qualification"
          ? "Confirming budget, authority, need, and timeline."
          : s === "proposal"
            ? "Formal proposal sent; waiting on feedback."
            : s === "negotiation"
              ? "Terms + pricing under active negotiation."
              : s === "won"
                ? "Contract signed. Hand off to onboarding."
                : "Lost — capture reason + save for future re-engagement.",
  }));
}

export function seedCrmExtended(): Record<string, number> {
  const out: Record<string, number> = {};
  out["crm.lead"] = seedIfEmpty("crm.lead", leads(40));
  out["crm.opportunity"] = seedIfEmpty("crm.opportunity", opps(30));
  out["crm.campaign"] = seedIfEmpty("crm.campaign", campaigns(10));
  out["crm.appointment"] = seedIfEmpty("crm.appointment", appointments(20));
  out["crm.contract"] = seedIfEmpty("crm.contract", contracts(15));
  out["crm.competitor"] = seedIfEmpty("crm.competitor", competitors(6));
  out["crm.market-segment"] = seedIfEmpty("crm.market-segment", marketSegments(8));
  out["crm.sales-stage"] = seedIfEmpty("crm.sales-stage", salesStages());
  return out;
}
