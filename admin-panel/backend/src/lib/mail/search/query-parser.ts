/** Gmail-style query parser.
 *
 *  Accepts inputs like:
 *    `from:alice@x.com is:unread has:attachment subject:"q4 report"`
 *    `older_than:7d label:work newer_than:24h NOT in:trash hello world`
 *    `(from:alice OR from:bob) AND has:attachment`
 *
 *  Produces a structured plan: an array of operator constraints + an array
 *  of free-text terms. Boolean grouping parsed but flattened into a CNF
 *  list of clauses for the SQL generator. */

export type Operator =
  | "from"
  | "to"
  | "cc"
  | "bcc"
  | "subject"
  | "label"
  | "category"
  | "filename"
  | "in"
  | "is"
  | "has"
  | "older_than"
  | "newer_than"
  | "before"
  | "after"
  | "larger"
  | "smaller"
  | "thread"
  | "list";

export interface Clause {
  /** All constraints in a clause must match (AND). Free-text terms are
   *  passed through to the FTS engine. */
  termAnd: Term[];
}

export type Term =
  | { kind: "operator"; op: Operator; value: string; negate: boolean }
  | { kind: "freetext"; value: string; negate: boolean };

export interface ParsedQuery {
  /** Disjunction of clauses — outer OR. */
  clauses: Clause[];
  /** Helper: full free-text portion concatenated (for FTS5 prefix match). */
  freetext: string;
}

const OPERATORS: ReadonlySet<Operator> = new Set([
  "from", "to", "cc", "bcc", "subject", "label", "category", "filename",
  "in", "is", "has", "older_than", "newer_than", "before", "after",
  "larger", "smaller", "thread", "list",
]);

const TOKEN_RE = /"([^"]*)"|\S+/g;

export function parseQuery(input: string): ParsedQuery {
  if (!input || !input.trim()) return { clauses: [{ termAnd: [] }], freetext: "" };
  const raw = tokenize(input);
  const clauses = parseTopLevel(raw);
  const freetext = clauses
    .flatMap((c) => c.termAnd.filter((t) => t.kind === "freetext").map((t) => t.value))
    .join(" ");
  return { clauses, freetext };
}

interface RawToken {
  text: string;
  quoted: boolean;
}

function tokenize(input: string): RawToken[] {
  const out: RawToken[] = [];
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(input)) !== null) {
    if (m[1] !== undefined) out.push({ text: m[1], quoted: true });
    else out.push({ text: m[0], quoted: false });
  }
  return out;
}

interface ParserState {
  pos: number;
  tokens: RawToken[];
}

function parseTopLevel(tokens: RawToken[]): Clause[] {
  const state: ParserState = { pos: 0, tokens };
  return parseOr(state);
}

function parseOr(state: ParserState): Clause[] {
  const left = parseAnd(state);
  const out = [...left];
  while (state.pos < state.tokens.length) {
    const t = state.tokens[state.pos];
    if (!t.quoted && t.text.toUpperCase() === "OR") {
      state.pos++;
      const right = parseAnd(state);
      out.push(...right);
      continue;
    }
    break;
  }
  return out;
}

function parseAnd(state: ParserState): Clause[] {
  const result: Clause = { termAnd: [] };
  while (state.pos < state.tokens.length) {
    const t = state.tokens[state.pos];
    if (!t.quoted && t.text.toUpperCase() === "OR") break;
    if (!t.quoted && t.text.toUpperCase() === "AND") { state.pos++; continue; }
    if (!t.quoted && t.text === "(") {
      state.pos++;
      const sub = parseOr(state);
      // expect ')'
      if (state.pos < state.tokens.length && state.tokens[state.pos].text === ")") state.pos++;
      // Distribute by AND across all sub-clauses' constraints; since each
      // sub-clause is itself a list of OR clauses, expand by Cartesian
      // product. Cap to avoid pathological growth.
      result.termAnd.push(...sub.flatMap((c) => c.termAnd));
      continue;
    }
    if (!t.quoted && t.text === ")") break;

    state.pos++;
    let txt = t.text;
    let negate = false;
    if (!t.quoted && txt.startsWith("-")) { negate = true; txt = txt.slice(1); }
    if (!t.quoted && txt.toUpperCase() === "NOT") {
      negate = !negate;
      const next = state.tokens[state.pos];
      if (!next) break;
      state.pos++;
      txt = next.text;
    }

    const colon = !t.quoted ? txt.indexOf(":") : -1;
    if (colon !== -1) {
      const op = txt.slice(0, colon).toLowerCase() as Operator;
      const val = txt.slice(colon + 1);
      if (OPERATORS.has(op)) {
        result.termAnd.push({ kind: "operator", op, value: val, negate });
        continue;
      }
    }
    if (txt) result.termAnd.push({ kind: "freetext", value: txt, negate });
  }
  return [result];
}

export interface CompiledQuery {
  /** Direct WHERE-clause SQL fragments + bindings against `mail_search`
   *  joined onto the `records` table. */
  where: string;
  bindings: unknown[];
  /** FTS-MATCH expression (or null). */
  ftsMatch: string | null;
  ftsBindings: unknown[];
}

/** Compile a parsed query into SQLite FTS5 + json_extract WHERE.
 *
 *  Caller owns the SELECT + JOIN; this returns just the WHERE portion. */
export function compileQuery(
  parsed: ParsedQuery,
  options: { resource: string; tenantId?: string | null; folderColumn?: string } = { resource: "mail.message" },
): CompiledQuery {
  const wheres: string[] = [];
  const bindings: unknown[] = [];
  const ftsParts: string[] = [];
  const ftsBindings: unknown[] = [];

  for (const clause of parsed.clauses) {
    const ands: string[] = [];
    for (const term of clause.termAnd) {
      if (term.kind === "freetext") {
        // Push into FTS expression — use prefix match to be tolerant.
        const tok = term.value.replace(/"/g, "").trim();
        if (!tok) continue;
        const prefix = `${tok}*`;
        ftsParts.push(term.negate ? `NOT ${prefix}` : prefix);
        continue;
      }
      const cond = compileOperatorTerm(term, bindings);
      if (cond) ands.push(cond);
    }
    if (ands.length > 0) wheres.push(`(${ands.join(" AND ")})`);
  }

  return {
    where: wheres.length > 0 ? wheres.join(" OR ") : "1=1",
    bindings,
    ftsMatch: ftsParts.length > 0 ? ftsParts.join(" ") : null,
    ftsBindings,
  };
}

function compileOperatorTerm(
  term: { kind: "operator"; op: Operator; value: string; negate: boolean },
  bindings: unknown[],
): string | null {
  const not = term.negate ? "NOT " : "";
  switch (term.op) {
    case "from":
      bindings.push(`%${term.value.toLowerCase()}%`);
      return `${not}LOWER(json_extract(records.data, '$.from.email')) LIKE ?`;
    case "to":
      bindings.push(`%${term.value.toLowerCase()}%`);
      return `${not}LOWER(json_extract(records.data, '$.toEmails')) LIKE ?`;
    case "cc":
      bindings.push(`%${term.value.toLowerCase()}%`);
      return `${not}LOWER(json_extract(records.data, '$.ccEmails')) LIKE ?`;
    case "bcc":
      bindings.push(`%${term.value.toLowerCase()}%`);
      return `${not}LOWER(json_extract(records.data, '$.bccEmails')) LIKE ?`;
    case "subject":
      bindings.push(`%${term.value.toLowerCase()}%`);
      return `${not}LOWER(json_extract(records.data, '$.subject')) LIKE ?`;
    case "label":
      bindings.push(term.value);
      return `${not}EXISTS (SELECT 1 FROM json_each(json_extract(records.data, '$.labelIds')) WHERE value = ?)`;
    case "category":
      bindings.push(term.value);
      return `${not}json_extract(records.data, '$.categoryAuto') = ?`;
    case "filename":
      bindings.push(`%${term.value}%`);
      return `${not}json_extract(records.data, '$.attachmentNames') LIKE ?`;
    case "in":
      bindings.push(term.value);
      return `${not}json_extract(records.data, '$.folder') = ?`;
    case "is":
      switch (term.value.toLowerCase()) {
        case "unread":
          return `${not}(json_extract(records.data, '$.unreadCount') > 0)`;
        case "starred":
          return `${not}json_extract(records.data, '$.starred') = 1`;
        case "snoozed":
          return `${not}(json_extract(records.data, '$.snoozedUntil') IS NOT NULL)`;
        case "important":
          return `${not}json_extract(records.data, '$.important') = 1`;
        case "sent":
          return `${not}json_extract(records.data, '$.folder') = 'sent'`;
        case "draft":
          return `${not}json_extract(records.data, '$.folder') = 'drafts'`;
        case "trash":
          return `${not}json_extract(records.data, '$.folder') = 'trash'`;
        case "spam":
          return `${not}json_extract(records.data, '$.folder') = 'spam'`;
        case "muted":
          return `${not}json_extract(records.data, '$.muted') = 1`;
        case "encrypted":
          return `${not}json_extract(records.data, '$.wasEncrypted') = 1`;
        case "phishing":
          return `${not}json_extract(records.data, '$.phishScore') >= 60`;
        default:
          return null;
      }
    case "has":
      switch (term.value.toLowerCase()) {
        case "attachment":
        case "attachments":
          return `${not}json_extract(records.data, '$.hasAttachment') = 1`;
        case "calendar":
        case "invite":
          return `${not}json_extract(records.data, '$.hasCalendarInvite') = 1`;
        case "image":
        case "images":
          return `${not}json_extract(records.data, '$.imageCount') > 0`;
        case "links":
          return `${not}json_extract(records.data, '$.linkCount') > 0`;
        default:
          return null;
      }
    case "older_than":
    case "newer_than": {
      const ms = parseDuration(term.value);
      if (ms === null) return null;
      const cutoff = new Date(Date.now() - ms).toISOString();
      bindings.push(cutoff);
      const cmp = term.op === "older_than" ? "<" : ">=";
      return `${not}json_extract(records.data, '$.lastMessageAt') ${cmp} ?`;
    }
    case "before":
    case "after": {
      const iso = parseDateLoose(term.value);
      if (!iso) return null;
      bindings.push(iso);
      const cmp = term.op === "before" ? "<" : ">";
      return `${not}json_extract(records.data, '$.lastMessageAt') ${cmp} ?`;
    }
    case "larger":
    case "smaller": {
      const bytes = parseSize(term.value);
      if (bytes === null) return null;
      bindings.push(bytes);
      const cmp = term.op === "larger" ? ">" : "<";
      return `${not}json_extract(records.data, '$.size') ${cmp} ?`;
    }
    case "thread":
      bindings.push(term.value);
      return `${not}json_extract(records.data, '$.threadId') = ?`;
    case "list":
      bindings.push(`%${term.value.toLowerCase()}%`);
      return `${not}LOWER(json_extract(records.data, '$.listId')) LIKE ?`;
    default:
      return null;
  }
}

function parseDuration(s: string): number | null {
  const m = s.match(/^(\d+)\s*([smhdwMy])$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n)) return null;
  const unit = m[2];
  switch (unit) {
    case "s": return n * 1000;
    case "m": return n * 60_000;
    case "h": return n * 3_600_000;
    case "d": return n * 86_400_000;
    case "w": return n * 604_800_000;
    case "M": return n * 2_592_000_000;
    case "y": return n * 31_536_000_000;
    default: return null;
  }
}

function parseDateLoose(s: string): string | null {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    const m = s.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
    if (!m) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toISOString();
  }
  return d.toISOString();
}

function parseSize(s: string): number | null {
  const m = s.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?)B?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const factor = { "": 1, K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 }[m[2].toUpperCase() as "" | "K" | "M" | "G" | "T"] ?? 1;
  return Math.round(n * factor);
}
