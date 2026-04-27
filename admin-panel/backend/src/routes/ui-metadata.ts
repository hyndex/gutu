/** /api/ui/* — picker-feeding metadata for the admin shell.
 *
 *  Endpoints:
 *
 *    GET  /api/ui/resources    — every resource + supported actions,
 *                                grouped for tree rendering. Used by the
 *                                ResourceScopePicker, ResourcePicker.
 *    GET  /api/ui/tools        — every MCP tool the registry knows
 *                                about, with risk + scope hints. Used
 *                                by the dual-key dialog and the agent
 *                                tool-name picker.
 *    GET  /api/ui/currencies   — ISO 4217 currency picker source.
 *    GET  /api/ui/timezones    — IANA timezone picker source.
 *    GET  /api/ui/locales      — BCP-47 locale picker source.
 *
 *  The aggregator endpoints are read-only and authenticated under the
 *  same operator session that drives the admin UI. They're intentionally
 *  cheap — the shell calls them on every page mount so the picker is
 *  always fresh against the current plugin set. */

import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { listUiResources } from "../lib/ui/metadata";
import { listTools } from "../lib/mcp/tools";
import { bootstrapMcpTools } from "../lib/mcp/bootstrap";
import { db } from "../db";

export const uiMetadataRoutes = new Hono();
uiMetadataRoutes.use("*", requireAuth);

uiMetadataRoutes.get("/resources", (c) => {
  // Pick up newly-introduced resources without restarting — same idea
  // the MCP transport uses for tools/list.
  bootstrapMcpTools();
  const rows = listUiResources();
  return c.json({ rows });
});

uiMetadataRoutes.get("/tools", (c) => {
  bootstrapMcpTools();
  const rows = listTools().map((t) => ({
    name: t.definition.name,
    description: t.definition.description ?? "",
    resource: t.resource ?? null,
    scopeAction: t.scopeAction ?? null,
    risk: t.risk,
    annotations: t.definition.annotations ?? null,
  }));
  return c.json({ rows });
});

/* ---- bounded enums ----------------------------------------------- */

/** ISO 4217 — the subset most ERPs care about. Plugins that need an
 *  uncommon code (e.g. CLF, XAU) can append via the runtime registry,
 *  not modify this list. */
const ISO_CURRENCIES: Array<{ code: string; name: string }> = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "INR", name: "Indian Rupee" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "ZAR", name: "South African Rand" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "KRW", name: "South Korean Won" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "THB", name: "Thai Baht" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "BGN", name: "Bulgarian Lev" },
  { code: "RON", name: "Romanian Leu" },
  { code: "UAH", name: "Ukrainian Hryvnia" },
  { code: "ARS", name: "Argentine Peso" },
  { code: "CLP", name: "Chilean Peso" },
  { code: "COP", name: "Colombian Peso" },
  { code: "PEN", name: "Peruvian Sol" },
];

uiMetadataRoutes.get("/currencies", (c) => c.json({ rows: ISO_CURRENCIES }));

/** Common IANA timezones. Same philosophy as currencies — broad but
 *  not exhaustive. The picker should accept free-form too. */
const TIMEZONES: string[] = [
  "UTC",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Anchorage", "America/Honolulu", "America/Toronto", "America/Vancouver",
  "America/Mexico_City", "America/Sao_Paulo", "America/Argentina/Buenos_Aires",
  "Europe/London", "Europe/Dublin", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
  "Europe/Rome", "Europe/Amsterdam", "Europe/Brussels", "Europe/Zurich",
  "Europe/Vienna", "Europe/Stockholm", "Europe/Oslo", "Europe/Copenhagen",
  "Europe/Helsinki", "Europe/Moscow", "Europe/Istanbul", "Europe/Athens",
  "Africa/Cairo", "Africa/Lagos", "Africa/Johannesburg", "Africa/Nairobi",
  "Asia/Dubai", "Asia/Tehran", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka",
  "Asia/Bangkok", "Asia/Singapore", "Asia/Hong_Kong", "Asia/Shanghai",
  "Asia/Tokyo", "Asia/Seoul", "Asia/Manila", "Asia/Jakarta", "Asia/Riyadh",
  "Asia/Jerusalem", "Australia/Sydney", "Australia/Melbourne", "Australia/Perth",
  "Pacific/Auckland", "Pacific/Fiji",
];

uiMetadataRoutes.get("/timezones", (c) => c.json({ rows: TIMEZONES }));

/** BCP-47 locales — the ones the i18n module actually accepts (see
 *  `LOCALE_RE` in lib/i18n.ts). Picker can union with what the tenant
 *  has explicitly stored. */
const LOCALES: Array<{ code: string; name: string }> = [
  { code: "en", name: "English" },
  { code: "en-GB", name: "English (United Kingdom)" },
  { code: "en-US", name: "English (United States)" },
  { code: "es", name: "Spanish" },
  { code: "es-MX", name: "Spanish (Mexico)" },
  { code: "fr", name: "French" },
  { code: "fr-CA", name: "French (Canada)" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "ru", name: "Russian" },
  { code: "uk", name: "Ukrainian" },
  { code: "tr", name: "Turkish" },
  { code: "ar", name: "Arabic" },
  { code: "he", name: "Hebrew" },
  { code: "fa", name: "Persian" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "zh-Hant", name: "Chinese (Traditional)" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "fil", name: "Filipino" },
  { code: "sv", name: "Swedish" },
  { code: "no", name: "Norwegian" },
  { code: "da", name: "Danish" },
  { code: "fi", name: "Finnish" },
  { code: "cs", name: "Czech" },
  { code: "hu", name: "Hungarian" },
  { code: "ro", name: "Romanian" },
  { code: "bg", name: "Bulgarian" },
  { code: "el", name: "Greek" },
];

uiMetadataRoutes.get("/locales", (c) => c.json({ rows: LOCALES }));

/* ---- per-resource field discovery -------------------------------- */

/** Field-name hints for a resource, used by condition + filter
 *  pickers (notification rules, workflow filters). Two sources:
 *
 *    1. `field_metadata` rows for this resource + tenant — these are
 *       the custom fields a tenant has explicitly defined, so the
 *       label is good. Type is the field kind.
 *    2. Top-level keys discovered from up to 50 recent records of the
 *       resource. Captures system fields (`status`, `createdAt`,
 *       `tenantId`) and any field a writer has set without it being
 *       declared in metadata.
 *
 *  Both sources are merged; metadata wins on conflict. The output is
 *  intentionally a flat key list — nested paths (`customer.id`) are
 *  surfaced one level deep for object-typed values, keeping the UI
 *  picker shallow without a full schema crawl. */
uiMetadataRoutes.get("/fields/:resource", (c) => {
  const resource = c.req.param("resource");
  if (!resource || !/^[a-z][a-z0-9_.-]*$/i.test(resource)) {
    return c.json({ error: "invalid resource" }, 400);
  }
  type FieldRow = { key: string; kind?: string; label?: string };
  const out = new Map<string, FieldRow>();

  // Custom fields from field_metadata.
  try {
    const metaRows = db
      .prepare(
        `SELECT key, kind, label FROM field_metadata
         WHERE resource = ? ORDER BY position ASC, key ASC LIMIT 200`,
      )
      .all(resource) as Array<{ key: string; kind: string; label: string }>;
    for (const r of metaRows) {
      out.set(r.key, { key: r.key, kind: r.kind, label: r.label });
    }
  } catch {
    // field_metadata table may not exist on a fresh install; tolerate.
  }

  // System keys from sample records.
  try {
    const recordRows = db
      .prepare(
        `SELECT data FROM records WHERE resource = ?
         ORDER BY updated_at DESC LIMIT 50`,
      )
      .all(resource) as Array<{ data: string }>;
    for (const row of recordRows) {
      let parsed: Record<string, unknown> | undefined;
      try {
        parsed = JSON.parse(row.data) as Record<string, unknown>;
      } catch {
        continue;
      }
      for (const [k, v] of Object.entries(parsed)) {
        if (!out.has(k)) {
          out.set(k, { key: k, kind: typeofForUi(v) });
        }
        // One-level nested path discovery for object-typed values
        // (e.g. customer.id, customer.email).
        if (v && typeof v === "object" && !Array.isArray(v)) {
          for (const k2 of Object.keys(v as Record<string, unknown>)) {
            const nested = `${k}.${k2}`;
            if (!out.has(nested)) {
              out.set(nested, { key: nested, kind: typeofForUi((v as Record<string, unknown>)[k2]) });
            }
          }
        }
      }
    }
  } catch {
    // records table is core; failure here means a deeper problem,
    // but the picker should still degrade gracefully.
  }

  return c.json({ rows: Array.from(out.values()).sort((a, b) => a.key.localeCompare(b.key)) });
});

function typeofForUi(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "object") return "object";
  return typeof v;
}
