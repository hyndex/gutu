/** RFC 2369 + 8058 List-Unsubscribe handling.
 *
 *  Inbound: parse the message's `List-Unsubscribe` + `List-Unsubscribe-Post`
 *  headers into a structured plan: which method to invoke and how. We
 *  prefer one-click (RFC 8058) when available, mailto: as second choice,
 *  and HTTP GET as last resort.
 *
 *  Outbound: when the user clicks "Unsubscribe", the route at
 *  `/api/mail/unsubscribe/:messageId` runs the plan via fetch (for HTTP
 *  POST/GET) or by composing a tiny mail and queuing it through the send
 *  pipeline (for mailto:). */

export interface UnsubscribePlan {
  oneClick: boolean;
  http?: { url: string; method: "POST" | "GET"; body?: string };
  mailto?: { to: string; subject?: string; body?: string };
}

export function parseUnsubscribe(
  listUnsubscribe: string | undefined,
  listUnsubscribePost: string | undefined,
): UnsubscribePlan | null {
  if (!listUnsubscribe) return null;
  const tokens = parseRfcUnsubscribe(listUnsubscribe);
  if (tokens.length === 0) return null;
  const httpEntry = tokens.find((t) => t.startsWith("http://") || t.startsWith("https://"));
  const mailtoEntry = tokens.find((t) => t.startsWith("mailto:"));
  const oneClick = listUnsubscribePost?.toLowerCase().includes("list-unsubscribe=one-click") ?? false;
  const plan: UnsubscribePlan = { oneClick };
  if (httpEntry) {
    if (oneClick) {
      plan.http = { url: httpEntry, method: "POST", body: "List-Unsubscribe=One-Click" };
    } else {
      plan.http = { url: httpEntry, method: "GET" };
    }
  }
  if (mailtoEntry) {
    const m = parseMailto(mailtoEntry);
    if (m) plan.mailto = m;
  }
  return plan.http || plan.mailto ? plan : null;
}

function parseRfcUnsubscribe(value: string): string[] {
  // Strips < > and splits on commas not inside angle-brackets.
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (const c of value) {
    if (c === "<") { depth++; continue; }
    if (c === ">") { depth = Math.max(0, depth - 1); continue; }
    if (c === "," && depth === 0) {
      const t = buf.trim();
      if (t) out.push(t);
      buf = "";
      continue;
    }
    buf += c;
  }
  const last = buf.trim();
  if (last) out.push(last);
  return out;
}

function parseMailto(input: string): { to: string; subject?: string; body?: string } | null {
  if (!input.startsWith("mailto:")) return null;
  try {
    const u = new URL(input);
    return {
      to: decodeURIComponent(u.pathname),
      subject: u.searchParams.get("subject") ?? undefined,
      body: u.searchParams.get("body") ?? undefined,
    };
  } catch {
    return null;
  }
}
