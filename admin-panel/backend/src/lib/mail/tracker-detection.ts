/** Tracker detection — host-list + heuristic patterns.
 *
 *  When an inbound email's HTML references an external image, this module
 *  decides whether it's likely a tracking pixel / CRM beacon. The list is
 *  not exhaustive, but it captures the dominant SaaS senders. Operators
 *  can override via `MAIL_TRACKER_HOSTS` (comma list).
 *
 *  Detection is conservative — false positives manifest as "image not
 *  loading" UX. False negatives manifest as a tracker leaked to the
 *  sender. We err toward false positives (block more) and let the user
 *  whitelist a sender. */

const BASE_HOSTS = [
  "click.mail.com",
  "links.alphagra.de",
  "url.emailprotection.link",
  "track.mailchimp.com",
  "trk.bcfm.com",
  "open.convertkit-mail.com",
  "sendgrid.net",
  "mandrillapp.com",
  "mailgun.org",
  "open.spotify.com",
  "list-manage.com",
  "rs6.net",
  "sendinblue.com",
  "open.wisestamp.com",
  "ad.linksynergy.com",
  "tracking.tldrnewsletter.com",
  "redirect.viglink.com",
  "click.hubspot.com",
  "track.customer.io",
  "track.activecampaign.com",
  "img.constantcontact.com",
  "pixel.app.returnpath.net",
  "tracking.spotify.com",
  "mail.tracking.airmail.it",
  "open.aweber-systems.com",
  "smtp.benchmarkemail.com",
  "open.iterable.com",
];

let hostSet: Set<string> | null = null;

function loadHostSet(): Set<string> {
  if (hostSet) return hostSet;
  const out = new Set<string>(BASE_HOSTS);
  const env = (process.env.MAIL_TRACKER_HOSTS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const h of env) out.add(h.toLowerCase());
  hostSet = out;
  return out;
}

export interface DetectionResult {
  blocked: boolean;
  reason: "host" | "pattern" | "tracker-keyword" | "pixel-1x1" | null;
}

const TRACKER_KEYWORDS = [
  "open.gif", "pixel.gif", "beacon.gif", "track.gif",
  "open.png", "pixel.png", "beacon.png", "track.png",
  "/o/eJ", "/wf/open", "/b/op", "/Prod/a/", "/track/open",
  "?utm_source=", "&utm_source=",
];

const SUSPICIOUS_PATTERNS: RegExp[] = [
  /\/(open|pixel|beacon|track)\b/i,
  /[?&](click|track|email|recipient|cid)=/i,
  /\bencoded_email=/i,
  /\bmsg_id=/i,
];

/** Inspect a remote URL. Caller is the image-proxy / sanitizer; pass any
 *  width/height hints from the surrounding <img> if available. */
export function classifyTracker(
  url: string,
  hints: { width?: number; height?: number; alt?: string } = {},
): DetectionResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { blocked: true, reason: "pattern" };
  }
  const host = parsed.host.toLowerCase();
  if (loadHostSet().has(host)) return { blocked: true, reason: "host" };
  for (const seg of host.split(".")) {
    if (seg === "track" || seg === "click" || seg === "open" || seg === "pixel" || seg === "beacon") {
      return { blocked: true, reason: "host" };
    }
  }
  const path = parsed.pathname + (parsed.search ?? "");
  for (const k of TRACKER_KEYWORDS) {
    if (path.includes(k)) return { blocked: true, reason: "tracker-keyword" };
  }
  for (const re of SUSPICIOUS_PATTERNS) {
    if (re.test(path)) return { blocked: true, reason: "pattern" };
  }
  if (hints.width !== undefined && hints.height !== undefined) {
    if (hints.width <= 2 && hints.height <= 2) {
      return { blocked: true, reason: "pixel-1x1" };
    }
  }
  return { blocked: false, reason: null };
}
