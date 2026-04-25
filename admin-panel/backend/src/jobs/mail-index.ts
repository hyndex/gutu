/** Lexical + vector indexing job.
 *
 *  Walks recently-updated `mail.message` records and pushes them into
 *  the FTS5 index + vector store. Uses an `indexed_at` field on the
 *  message record so we don't reindex on every poll. */

import { db, nowIso } from "../db";
import { embed, packVector, vectorMagnitude } from "../lib/mail/search/embedding";
import { htmlToPlainText } from "../lib/mail/mime/sanitize";
import { registerJob } from "./scheduler";

const TICK_MS = parseInt(process.env.MAIL_INDEX_TICK_MS ?? "60000", 10);

async function tick(): Promise<void> {
  const rows = db
    .prepare(
      `SELECT id, data, updated_at FROM records WHERE resource = 'mail.message'
       AND (json_extract(data, '$.indexedAt') IS NULL OR json_extract(data, '$.indexedAt') < updated_at)
       LIMIT 200`,
    )
    .all() as { id: string; data: string; updated_at: string }[];
  for (const row of rows) {
    const msg = JSON.parse(row.data) as Record<string, unknown>;
    const subject = String(msg.subject ?? "");
    const fromEmail = ((msg.from as { email?: string } | undefined)?.email) ?? "";
    const fromName = ((msg.from as { name?: string } | undefined)?.name) ?? "";
    const toEmails = String(msg.toEmails ?? "");
    const ccEmails = String(msg.ccEmails ?? "");
    const labels = Array.isArray(msg.labelIds) ? (msg.labelIds as string[]).join(" ") : "";
    const text = String(msg.bodyText ?? htmlToPlainText(String(msg.bodyHtml ?? "")));
    const folder = String(msg.folder ?? "");
    const flags = JSON.stringify({ unread: !msg.isRead, starred: !!msg.isStarred });

    db.prepare(`DELETE FROM mail_search WHERE message_id = ?`).run(row.id);
    db.prepare(
      `INSERT INTO mail_search (message_id, thread_id, connection_id, tenant_id, folder, labels, from_name, from_email, to_emails, cc_emails, subject, preview, body_text, headers, received_at, flags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      row.id,
      String(msg.threadId ?? ""),
      String(msg.connectionId ?? ""),
      String(msg.tenantId ?? "default"),
      folder,
      labels,
      fromName,
      fromEmail,
      toEmails,
      ccEmails,
      subject,
      String(msg.preview ?? ""),
      text,
      JSON.stringify(msg.headers ?? {}),
      String(msg.receivedAt ?? ""),
      flags,
    );

    // Vector embedding.
    try {
      const v = await embed(`${subject}\n${text.slice(0, 4000)}`);
      const buf = packVector(v);
      const mag = vectorMagnitude(v);
      const tokens = Array.from(new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? [])).slice(0, 200).join(" ");
      db.prepare(
        `INSERT INTO mail_vector (target_kind, target_id, tenant_id, connection_id, dim, vector, magnitude, tokens, updated_at)
         VALUES ('message', ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(target_kind, target_id) DO UPDATE SET dim=excluded.dim, vector=excluded.vector, magnitude=excluded.magnitude, tokens=excluded.tokens, updated_at=excluded.updated_at`,
      ).run(row.id, String(msg.tenantId ?? "default"), String(msg.connectionId ?? ""), v.length, buf, mag, tokens, nowIso());
    } catch (err) {
      console.warn(`[mail-index] embed failed for ${row.id}`, err);
    }

    msg.indexedAt = nowIso();
    db.prepare(`UPDATE records SET data = ? WHERE resource = 'mail.message' AND id = ?`)
      .run(JSON.stringify(msg), row.id);
  }
}

export function registerMailIndex(): void {
  registerJob({ id: "mail.index", intervalMs: TICK_MS, fn: tick, runOnStart: false });
}
