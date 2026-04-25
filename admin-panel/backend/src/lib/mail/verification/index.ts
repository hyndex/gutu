/** Authentication-Results / SPF / DKIM / DMARC / ARC / BIMI extraction.
 *
 *  Performing real DKIM/SPF/DMARC validation requires DNS lookups + crypto
 *  on the raw RFC822, which is expensive and usually duplicative — every
 *  major provider already validates and writes the verdict to the
 *  `Authentication-Results` (RFC 8601) and `ARC-Authentication-Results`
 *  headers. We *parse* those headers and present the verdicts to the
 *  reader. Operators wanting independent verification can plug in a
 *  full validator later. */

export type VerifyResult = "pass" | "fail" | "neutral" | "softfail" | "none" | "permerror" | "temperror" | "policy" | "bestguesspass" | undefined;

export interface VerificationSummary {
  spf?: VerifyResult;
  dkim?: VerifyResult;
  dmarc?: VerifyResult;
  arc?: VerifyResult;
  bimi?: { logoUrl?: string; selector?: string; pass: boolean };
  raw?: string;
  source: "header" | "none";
}

export function parseAuthResults(headers: Record<string, string>): VerificationSummary {
  const ar = headers["authentication-results"] ?? headers["arc-authentication-results"];
  if (!ar) return { source: "none" };
  const out: VerificationSummary = { raw: ar, source: "header" };
  for (const part of splitMethods(ar)) {
    const m = part.match(/^([a-z0-9]+)\s*=\s*([a-z0-9]+)/i);
    if (!m) continue;
    const method = m[1].toLowerCase();
    const result = m[2].toLowerCase() as VerifyResult;
    if (method === "spf") out.spf = result;
    else if (method === "dkim") out.dkim = result;
    else if (method === "dmarc") out.dmarc = result;
    else if (method === "arc") out.arc = result;
    else if (method === "bimi") {
      out.bimi = { pass: result === "pass" };
      const sel = part.match(/header\.selector=([^\s;]+)/i)?.[1];
      const url = part.match(/policy\.indicator=([^\s;]+)/i)?.[1];
      if (sel) out.bimi.selector = sel;
      if (url) out.bimi.logoUrl = url;
    }
  }
  return out;
}

function splitMethods(s: string): string[] {
  // Splits "spf=pass smtp.helo=foo; dkim=pass header.d=bar.com; dmarc=pass action=none"
  // We split on `;` which is unambiguous in this header.
  return s.split(";").map((p) => p.trim()).filter(Boolean);
}

export interface PhishHeuristic {
  score: number; // 0..100
  reasons: string[];
}

export function phishHeuristics(
  fromEmail: string,
  fromName: string | undefined,
  subject: string | undefined,
  bodyText: string | undefined,
  verification: VerificationSummary,
  knownContact: boolean,
): PhishHeuristic {
  const reasons: string[] = [];
  let score = 0;

  if (verification.dmarc === "fail") { score += 40; reasons.push("DMARC failed"); }
  if (verification.dkim === "fail") { score += 25; reasons.push("DKIM failed"); }
  if (verification.spf === "fail") { score += 15; reasons.push("SPF failed"); }

  if (fromName && /[a-z]@[a-z]/i.test(fromName) && fromName.toLowerCase() !== fromEmail.toLowerCase()) {
    // Display name contains an email different from the actual sender.
    score += 25;
    reasons.push("Display name contains a different email address");
  }

  if (fromEmail) {
    const domain = fromEmail.split("@")[1] ?? "";
    if (looksLikeBrandImpersonation(fromName, domain)) {
      score += 20;
      reasons.push("Display name impersonates a brand on a generic domain");
    }
    if (containsLookalike(domain)) {
      score += 15;
      reasons.push("Domain uses lookalike characters");
    }
  }

  if (subject && /(urgent|verify|account suspend|password|reset)/i.test(subject)) {
    score += 5;
    reasons.push("Urgency / account-action subject");
  }
  if (bodyText) {
    if (/click\s+here.*verify/i.test(bodyText) || /confirm\s+your\s+account/i.test(bodyText)) {
      score += 5;
      reasons.push("Generic 'click to verify' wording");
    }
  }

  if (knownContact) score = Math.max(0, score - 20);
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

const BRAND_TERMS = [
  "paypal", "apple", "microsoft", "google", "amazon", "netflix", "facebook", "instagram", "linkedin",
  "bank", "chase", "wells fargo", "barclays", "hsbc", "citi", "santander", "doc? sign",
];
const FREE_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com", "icloud.com", "aol.com",
  "proton.me", "protonmail.com", "yandex.com", "mail.ru",
]);

function looksLikeBrandImpersonation(displayName: string | undefined, senderDomain: string): boolean {
  if (!displayName) return false;
  const lower = displayName.toLowerCase();
  if (!FREE_DOMAINS.has(senderDomain.toLowerCase())) return false;
  return BRAND_TERMS.some((b) => lower.includes(b));
}

function containsLookalike(domain: string): boolean {
  // Cyrillic vs Latin similar chars (a, e, o, p, c, x, y).
  return /[а-яёА-ЯЁ]/.test(domain);
}
