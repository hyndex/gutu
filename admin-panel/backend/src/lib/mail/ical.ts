/** Tiny ICS parser/builder — covers VEVENT meeting invites & replies.
 *
 *  Not a full RFC 5545 implementation. Handles:
 *    - METHOD: REQUEST / REPLY / CANCEL / PUBLISH
 *    - VEVENT: UID, DTSTART, DTEND (or DURATION), SUMMARY, DESCRIPTION,
 *              LOCATION, ORGANIZER, ATTENDEE (with PARTSTAT, ROLE, RSVP),
 *              SEQUENCE, STATUS, RRULE (passthrough).
 *    - Line unfolding (CRLF + space).
 *    - Common parameter encoding. */

export type Partstat =
  | "ACCEPTED"
  | "DECLINED"
  | "TENTATIVE"
  | "NEEDS-ACTION"
  | "DELEGATED";

export interface IcalAttendee {
  email: string;
  cn?: string;
  partstat?: Partstat;
  role?: string;
  rsvp?: boolean;
}

export interface IcalEvent {
  uid: string;
  sequence: number;
  method?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
  duration?: string;
  organizer?: { email: string; cn?: string };
  attendees: IcalAttendee[];
  rrule?: string;
}

export function parseIcal(content: string): IcalEvent | null {
  const unfolded = unfold(content);
  const lines = unfolded.split(/\r?\n/);
  const stack: Array<{ kind: string; props: Map<string, ParsedLine[]> }> = [];
  const top = (): { kind: string; props: Map<string, ParsedLine[]> } | undefined => stack[stack.length - 1];
  let method: string | undefined;
  let event: IcalEvent | null = null;

  for (const raw of lines) {
    if (!raw) continue;
    const parsed = parseLine(raw);
    if (!parsed) continue;
    if (parsed.name === "BEGIN") {
      stack.push({ kind: parsed.value, props: new Map() });
      continue;
    }
    if (parsed.name === "END") {
      const ctx = stack.pop();
      if (!ctx) continue;
      if (ctx.kind === "VEVENT") {
        event = readEvent(ctx.props, method);
      }
      continue;
    }
    if (parsed.name === "METHOD" && top()?.kind === "VCALENDAR") {
      method = parsed.value;
      continue;
    }
    const ctx = top();
    if (!ctx) continue;
    const arr = ctx.props.get(parsed.name);
    if (arr) arr.push(parsed);
    else ctx.props.set(parsed.name, [parsed]);
  }

  return event;
}

function unfold(input: string): string {
  return input.replace(/\r?\n[ \t]/g, "");
}

interface ParsedLine {
  name: string;
  value: string;
  params: Record<string, string>;
}

function parseLine(line: string): ParsedLine | null {
  const colon = findUnquoted(line, ":");
  if (colon === -1) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const segments = head.split(";");
  const name = segments[0].toUpperCase();
  const params: Record<string, string> = {};
  for (const seg of segments.slice(1)) {
    const eq = seg.indexOf("=");
    if (eq === -1) continue;
    const k = seg.slice(0, eq).toUpperCase();
    let v = seg.slice(eq + 1);
    v = v.replace(/^"(.*)"$/, "$1");
    params[k] = v;
  }
  return { name, value: unescape(value), params };
}

function findUnquoted(line: string, ch: string): number {
  let q = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') q = !q;
    if (!q && line[i] === ch) return i;
  }
  return -1;
}

function unescape(s: string): string {
  return s.replace(/\\([\\,;nN])/g, (_m, c) => {
    if (c === "n" || c === "N") return "\n";
    return c;
  });
}

function readEvent(
  props: Map<string, ParsedLine[]>,
  method: string | undefined,
): IcalEvent {
  const attendees: IcalAttendee[] = [];
  for (const att of props.get("ATTENDEE") ?? []) {
    const email = mailtoEmail(att.value);
    if (!email) continue;
    attendees.push({
      email,
      cn: att.params.CN,
      partstat: att.params.PARTSTAT as Partstat | undefined,
      role: att.params.ROLE,
      rsvp: att.params.RSVP === "TRUE",
    });
  }
  const orgRaw = props.get("ORGANIZER")?.[0];
  const organizer = orgRaw && mailtoEmail(orgRaw.value)
    ? { email: mailtoEmail(orgRaw.value) as string, cn: orgRaw.params.CN }
    : undefined;

  return {
    uid: props.get("UID")?.[0]?.value ?? `${Date.now()}@local`,
    sequence: parseInt(props.get("SEQUENCE")?.[0]?.value ?? "0", 10) || 0,
    method,
    status: props.get("STATUS")?.[0]?.value,
    summary: props.get("SUMMARY")?.[0]?.value,
    description: props.get("DESCRIPTION")?.[0]?.value,
    location: props.get("LOCATION")?.[0]?.value,
    start: props.get("DTSTART")?.[0]?.value,
    end: props.get("DTEND")?.[0]?.value,
    duration: props.get("DURATION")?.[0]?.value,
    organizer,
    attendees,
    rrule: props.get("RRULE")?.[0]?.value,
  };
}

function mailtoEmail(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^mailto:(.+)$/i);
  return m ? m[1].trim() : null;
}

/** Build a METHOD:REPLY ICS for a single attendee. */
export function buildReply(
  base: IcalEvent,
  attendee: { email: string; cn?: string },
  partstat: Partstat,
): string {
  const out: string[] = [];
  out.push("BEGIN:VCALENDAR");
  out.push("VERSION:2.0");
  out.push("PRODID:-//Gutu Mail//ICS Reply//EN");
  out.push("METHOD:REPLY");
  out.push("BEGIN:VEVENT");
  out.push(`UID:${base.uid}`);
  out.push(`SEQUENCE:${base.sequence ?? 0}`);
  if (base.organizer)
    out.push(`ORGANIZER${base.organizer.cn ? `;CN=${base.organizer.cn}` : ""}:mailto:${base.organizer.email}`);
  out.push(
    `ATTENDEE;PARTSTAT=${partstat};RSVP=FALSE${attendee.cn ? `;CN=${attendee.cn}` : ""}:mailto:${attendee.email}`,
  );
  if (base.summary) out.push(`SUMMARY:${escape(base.summary)}`);
  if (base.start) out.push(`DTSTART:${base.start}`);
  if (base.end) out.push(`DTEND:${base.end}`);
  out.push(`DTSTAMP:${nowIcsStamp()}`);
  out.push("END:VEVENT");
  out.push("END:VCALENDAR");
  return out.join("\r\n");
}

function escape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function nowIcsStamp(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
    d.getUTCHours(),
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
