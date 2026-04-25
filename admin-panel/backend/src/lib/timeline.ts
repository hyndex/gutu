/** Per-record timeline events.
 *
 *  Subscribes to the in-process record event bus. Every CRUD event
 *  becomes a `timeline_events` row scoped to (tenant, resource,
 *  recordId). The frontend Activity tab on detail pages reads these
 *  rows back to show "Sarah created this · Bob changed stage to
 *  Customer · Mailer ran a workflow" without each feature wiring
 *  its own audit chain.
 *
 *  Different from `audit_events` (admin-facing global log) — this is
 *  RECORD-facing, only joined to one record's detail view.
 *
 *  We summarise the event into a short message for the timeline:
 *    - created      → "Created"
 *    - updated      → "Updated 3 fields: stage, owner, …"
 *    - deleted      → "Deleted (soft)"
 *    - restored     → "Restored from soft-delete"
 *    - destroyed    → "Permanently destroyed"
 *
 *  The full diff is stored as JSON for callers that want to render
 *  field-by-field changes. */
import { db, nowIso } from "../db";
import { uuid } from "./id";
import { subscribeRecordEvents, type RecordEvent } from "./event-bus";

function summarise(event: RecordEvent): string {
  switch (event.type) {
    case "record.created":
      return "Created";
    case "record.updated": {
      const fields = Object.keys(event.diff ?? {});
      if (fields.length === 0) return "Updated";
      if (fields.length <= 3) return `Updated ${fields.join(", ")}`;
      return `Updated ${fields.slice(0, 3).join(", ")} +${fields.length - 3} more`;
    }
    case "record.deleted": return "Soft-deleted";
    case "record.restored": return "Restored";
    case "record.destroyed": return "Permanently destroyed";
  }
}

function kindFor(event: RecordEvent): string {
  return event.type.replace(/^record\./, "");
}

export function startTimelineWriter(): () => void {
  return subscribeRecordEvents((event) => {
    try {
      db.prepare(
        `INSERT INTO timeline_events
           (id, tenant_id, resource, record_id, kind, actor, diff, message, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        uuid(),
        event.tenantId,
        event.resource,
        event.recordId,
        kindFor(event),
        event.actor,
        event.diff ? JSON.stringify(event.diff) : null,
        summarise(event),
        event.occurredAt ?? nowIso(),
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[timeline] write failed", err);
    }
  });
}

export interface TimelineRow {
  id: string;
  tenantId: string;
  resource: string;
  recordId: string;
  kind: string;
  actor: string | null;
  diff: Record<string, { from: unknown; to: unknown }> | null;
  message: string;
  occurredAt: string;
}

interface TimelineDb {
  id: string;
  tenant_id: string;
  resource: string;
  record_id: string;
  kind: string;
  actor: string | null;
  diff: string | null;
  message: string;
  occurred_at: string;
}

/** Read the timeline for a record. Caller MUST have already verified
 *  the user can read the record (via ACL middleware). */
export function readTimeline(
  tenantId: string,
  resource: string,
  recordId: string,
  limit = 50,
): TimelineRow[] {
  const rows = db
    .prepare(
      `SELECT * FROM timeline_events
       WHERE tenant_id = ? AND resource = ? AND record_id = ?
       ORDER BY occurred_at DESC
       LIMIT ?`,
    )
    .all(tenantId, resource, recordId, limit) as TimelineDb[];
  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    resource: r.resource,
    recordId: r.record_id,
    kind: r.kind,
    actor: r.actor,
    diff: r.diff ? JSON.parse(r.diff) : null,
    message: r.message,
    occurredAt: r.occurred_at,
  }));
}
