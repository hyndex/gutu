/** /api/mail/contacts — CRUD + autocomplete + vCard import/export. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db, nowIso } from "../../db";
import { uuid } from "../../lib/id";
import { recordAudit } from "../../lib/audit";
import { broadcastResourceChange } from "../../lib/ws";
import { isValidEmail, normalizeEmail } from "../../lib/mail/address";
import { errorResponse, loadRecord, saveRecord, tenantId, userIdOf } from "./_helpers";

export const contactsRoutes = new Hono();
contactsRoutes.use("*", requireAuth);

contactsRoutes.get("/", (c) => {
  const q = (c.req.query("q") ?? "").toLowerCase();
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 200);
  let rows: { data: string }[];
  if (q) {
    rows = db
      .prepare(
        `SELECT data FROM records WHERE resource = 'mail.contact'
         AND json_extract(data, '$.userId') = ?
         AND (LOWER(json_extract(data, '$.email')) LIKE ? OR LOWER(json_extract(data, '$.name')) LIKE ?)
         ORDER BY json_extract(data, '$.useCount') DESC LIMIT ?`,
      )
      .all(userIdOf(c), `%${q}%`, `%${q}%`, limit) as { data: string }[];
  } else {
    rows = db
      .prepare(
        `SELECT data FROM records WHERE resource = 'mail.contact'
         AND json_extract(data, '$.userId') = ?
         ORDER BY json_extract(data, '$.useCount') DESC LIMIT ?`,
      )
      .all(userIdOf(c), limit) as { data: string }[];
  }
  return c.json({ rows: rows.map((r) => JSON.parse(r.data)) });
});

contactsRoutes.post("/", async (c) => {
  let body: { email?: string; name?: string; phone?: string; notes?: string; tags?: string[] } = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  if (!body.email || !isValidEmail(body.email)) return errorResponse(c, 400, "bad-email", "valid email required");
  const id = `con_${uuid()}`;
  const con = {
    id,
    userId: userIdOf(c),
    tenantId: tenantId(),
    email: normalizeEmail(body.email),
    name: body.name,
    phone: body.phone,
    notes: body.notes,
    tags: body.tags ?? [],
    useCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  saveRecord("mail.contact", con);
  recordAudit({ actor: userIdOf(c), action: "mail.contact.created", resource: "mail.contact", recordId: id });
  broadcastResourceChange("mail.contact", id, "create", userIdOf(c));
  return c.json(con);
});

contactsRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id") ?? "";
  const con = loadRecord<Record<string, unknown>>("mail.contact", id);
  if (!con || con.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "contact not found");
  let body: Record<string, unknown> = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  const merged = { ...con, ...body, id, updatedAt: nowIso() };
  saveRecord("mail.contact", merged);
  broadcastResourceChange("mail.contact", id, "update", userIdOf(c));
  return c.json(merged);
});

contactsRoutes.delete("/:id", (c) => {
  const id = c.req.param("id") ?? "";
  const con = loadRecord<Record<string, unknown>>("mail.contact", id);
  if (!con || con.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "contact not found");
  db.prepare("DELETE FROM records WHERE resource = 'mail.contact' AND id = ?").run(id);
  recordAudit({ actor: userIdOf(c), action: "mail.contact.deleted", resource: "mail.contact", recordId: id });
  broadcastResourceChange("mail.contact", id, "delete", userIdOf(c));
  return c.json({ ok: true });
});

contactsRoutes.post("/import-vcard", async (c) => {
  const text = await c.req.text();
  const records = parseVCard(text);
  let imported = 0;
  for (const r of records) {
    if (!r.email) continue;
    const id = `con_${uuid()}`;
    saveRecord("mail.contact", {
      id,
      userId: userIdOf(c),
      tenantId: tenantId(),
      email: normalizeEmail(r.email),
      name: r.name,
      phone: r.phone,
      useCount: 0,
      tags: ["imported"],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    imported++;
  }
  recordAudit({ actor: userIdOf(c), action: "mail.contact.imported", resource: "mail.contact", payload: { count: imported } });
  return c.json({ imported });
});

contactsRoutes.get("/export-vcard", (c) => {
  const rows = db
    .prepare(`SELECT data FROM records WHERE resource = 'mail.contact' AND json_extract(data, '$.userId') = ?`)
    .all(userIdOf(c)) as { data: string }[];
  const parts = rows.map((r) => JSON.parse(r.data) as { email: string; name?: string; phone?: string }).map(toVCard).join("\r\n");
  c.header("Content-Disposition", `attachment; filename="gutu-contacts.vcf"`);
  return c.text(parts, 200, { "Content-Type": "text/vcard" });
});

function parseVCard(text: string): { email?: string; name?: string; phone?: string }[] {
  const out: { email?: string; name?: string; phone?: string }[] = [];
  const blocks = text.split(/END:VCARD/i);
  for (const block of blocks) {
    const lines = block.replace(/\r/g, "").split("\n");
    let email: string | undefined;
    let name: string | undefined;
    let phone: string | undefined;
    for (const line of lines) {
      const m = line.match(/^([A-Z]+)(;[^:]*)?:(.*)$/);
      if (!m) continue;
      const tag = m[1].toUpperCase();
      const value = m[3];
      if (tag === "EMAIL") email = value.trim();
      else if (tag === "FN") name = value.trim();
      else if (tag === "TEL") phone = value.trim();
    }
    if (email || name) out.push({ email, name, phone });
  }
  return out;
}

function toVCard(r: { email: string; name?: string; phone?: string }): string {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${(r.name ?? r.email).replace(/[\r\n]/g, " ")}`,
    `EMAIL;TYPE=INTERNET:${r.email}`,
    r.phone ? `TEL:${r.phone.replace(/[\r\n]/g, "")}` : "",
    "END:VCARD",
  ].filter(Boolean).join("\r\n");
}
