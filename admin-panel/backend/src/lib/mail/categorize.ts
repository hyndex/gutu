/** Heuristic auto-categorization.
 *
 *  Runs at ingest time without an AI call. The AI classifier is
 *  available separately at /api/mail/ai/classify for higher-quality
 *  categorization; this path keeps the inbox usable when AI is
 *  disabled or rate-limited. */

export type Category = "primary" | "promotions" | "social" | "updates" | "forums";

const SOCIAL_DOMAINS = [
  "facebook.com", "facebookmail.com", "instagram.com", "linkedin.com",
  "twitter.com", "x.com", "youtube.com", "pinterest.com", "tumblr.com",
  "reddit.com", "discord.com", "slack.com", "snapchat.com", "tiktok.com",
];
const PROMOTIONS_DOMAINS = [
  "mailchimp.com", "sendgrid.net", "constantcontact.com", "campaignmonitor.com",
  "convertkit.com", "klaviyo.com", "drip.com", "intercom.com",
  "hubspot.com", "iterable.com", "list-manage.com", "rsgsv.net",
];
const UPDATE_KEYWORDS = [
  "receipt", "invoice", "order", "shipped", "delivery", "payment",
  "statement", "verification", "confirmation", "password", "security alert",
  "subscription", "renewal", "billing", "ticket", "booking",
];
const FORUM_HINTS = ["forum", "discussion", "topic", "reply", "mailing-list", "list-id"];

export interface Headers { [key: string]: string }

export function categorize(args: {
  fromEmail?: string;
  fromName?: string;
  subject?: string;
  bodyText?: string;
  headers?: Headers;
  hasListId?: boolean;
  hasUnsubscribe?: boolean;
}): Category {
  const fromDomain = (args.fromEmail ?? "").toLowerCase().split("@")[1] ?? "";
  const subject = (args.subject ?? "").toLowerCase();
  const headers = args.headers ?? {};
  const text = (args.bodyText ?? "").toLowerCase();
  const hasListId = args.hasListId ?? !!headers["list-id"];
  const hasUnsub = args.hasUnsubscribe ?? !!(headers["list-unsubscribe"] ?? headers["list-unsubscribe-post"]);

  // Social — strict on domain match.
  for (const d of SOCIAL_DOMAINS) {
    if (fromDomain === d || fromDomain.endsWith(`.${d}`)) return "social";
  }

  // Forums — list headers + reply patterns.
  if (hasListId) {
    if (FORUM_HINTS.some((h) => (headers["list-id"] ?? "").toLowerCase().includes(h))) return "forums";
    if (FORUM_HINTS.some((h) => subject.includes(h))) return "forums";
  }

  // Promotions — bulk-mail provider domain or marketing-style headers.
  for (const d of PROMOTIONS_DOMAINS) {
    if (fromDomain.endsWith(d)) return "promotions";
  }
  if ((headers["precedence"] ?? "").toLowerCase().includes("bulk")) return "promotions";
  if (hasUnsub && /\b(sale|discount|offer|deal|promo|% off|limited time|free shipping)\b/i.test(subject + " " + text.slice(0, 500))) {
    return "promotions";
  }

  // Updates — transactional language.
  if (UPDATE_KEYWORDS.some((k) => subject.includes(k))) return "updates";
  if (UPDATE_KEYWORDS.some((k) => text.slice(0, 800).includes(k))) return "updates";

  // Forums — list headers without keyword match.
  if (hasListId) return "forums";

  // Promotions — fallback for anything with List-Unsubscribe.
  if (hasUnsub) return "promotions";

  return "primary";
}
