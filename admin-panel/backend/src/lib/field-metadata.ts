/** Custom-fields runtime helpers.
 *
 *  The lightweight "metadata-driven schema" path: instead of giving
 *  every workspace its own Postgres schema (Twenty's heavy approach),
 *  we keep one generic `records` table and let users add custom
 *  fields via rows in `field_metadata`. Custom-field VALUES live
 *  inline in the same `records.data` JSON blob (under the field's
 *  `key`) so storage is unchanged.
 *
 *  At request time:
 *    - Reads merge custom-field metadata into the descriptor the
 *      frontend uses for forms, lists, and filters.
 *    - Writes accept arbitrary fields under user-defined keys; the
 *      generic resource handler just stores them.
 *    - Search and ACL work because they don't care about field names.
 *
 *  Trade-offs vs Twenty:
 *    + Zero schema drift: same column store, same backups, same
 *      query plan.
 *    + Adding a field is `INSERT INTO field_metadata` — no DDL.
 *    + Old records automatically get the new field (as undefined)
 *      without any backfill.
 *    - Indexed filtering is not free for custom fields. We keep an
 *      `indexed: 1` bit so the frontend can hint that a field
 *      should appear in filter chips, but query speed is the same
 *      `json_extract` we use for system fields.
 *    - No cross-object joins on custom relations. (Twenty also
 *      doesn't really do these efficiently.) */

import { db, nowIso } from "../db";
import { uuid } from "./id";

/** The 13 supported field kinds. Mirrors Twenty's catalog minus the
 *  composite types and morph_relation. We can add composites later
 *  by storing each sub-field as an independent custom field with a
 *  shared key prefix (e.g., `phones.primary.country`). */
export type FieldKind =
  | "text"
  | "long-text"
  | "rich-text"
  | "number"
  | "currency"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "multiselect"
  | "email"
  | "phone"
  | "url"
  | "relation"
  | "json";

export interface FieldOptions {
  /** select / multiselect: list of option values. */
  options?: Array<{ value: string; label: string; color?: string }>;
  /** currency: ISO 4217 code. */
  currency?: string;
  /** relation: target resource id (e.g. "crm.contact"). */
  relationTarget?: string;
  /** number: min/max/step. */
  min?: number;
  max?: number;
  step?: number;
  /** text/long-text/rich-text: character cap. */
  maxLength?: number;
  /** date/datetime: format hint. */
  format?: string;
  /** Default value applied when the user creates a new record. */
  defaultValue?: unknown;
  /** Help text shown under the input. */
  helpText?: string;
  /** UI placement hint — used by the Settings page to group columns. */
  group?: string;
}

export interface FieldMeta {
  id: string;
  tenantId: string;
  resource: string;
  key: string;
  label: string;
  kind: FieldKind;
  options: FieldOptions;
  required: boolean;
  indexed: boolean;
  position: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface FieldRow {
  id: string;
  tenant_id: string;
  resource: string;
  key: string;
  label: string;
  kind: string;
  options: string | null;
  required: number;
  indexed: number;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const VALID_KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;
const RESERVED_KEYS = new Set([
  "id", "createdAt", "updatedAt", "createdBy", "updatedBy",
  "tenantId", "status", "role",
]);

function rowToMeta(r: FieldRow): FieldMeta {
  let options: FieldOptions = {};
  if (r.options) {
    try { options = JSON.parse(r.options) as FieldOptions; } catch { /* tolerate */ }
  }
  return {
    id: r.id,
    tenantId: r.tenant_id,
    resource: r.resource,
    key: r.key,
    label: r.label,
    kind: r.kind as FieldKind,
    options,
    required: r.required === 1,
    indexed: r.indexed === 1,
    position: r.position,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listFieldMetadata(tenantId: string, resource: string): FieldMeta[] {
  const rows = db
    .prepare(
      `SELECT * FROM field_metadata
       WHERE tenant_id = ? AND resource = ?
       ORDER BY position ASC, label COLLATE NOCASE ASC`,
    )
    .all(tenantId, resource) as FieldRow[];
  return rows.map(rowToMeta);
}

export function listFieldMetadataAcrossResources(tenantId: string): FieldMeta[] {
  const rows = db
    .prepare(`SELECT * FROM field_metadata WHERE tenant_id = ?`)
    .all(tenantId) as FieldRow[];
  return rows.map(rowToMeta);
}

export interface CreateFieldArgs {
  tenantId: string;
  resource: string;
  key: string;
  label: string;
  kind: FieldKind;
  options?: FieldOptions;
  required?: boolean;
  indexed?: boolean;
  position?: number;
  createdBy: string;
}

export class FieldMetadataError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "FieldMetadataError";
  }
}

export function createFieldMetadata(args: CreateFieldArgs): FieldMeta {
  if (!VALID_KEY_RE.test(args.key)) {
    throw new FieldMetadataError(
      "invalid-key",
      "Field key must be lowercase, start with a letter, and contain only letters/digits/underscores (max 64 chars)",
    );
  }
  if (RESERVED_KEYS.has(args.key)) {
    throw new FieldMetadataError(
      "reserved-key",
      `"${args.key}" is reserved (used by the platform)`,
    );
  }
  // Prevent collision with system fields. We don't have an
  // authoritative list, but a duplicate row with the same
  // (tenant, resource, key) would violate the UNIQUE — surface a
  // friendlier error.
  const existing = db
    .prepare(
      `SELECT id FROM field_metadata WHERE tenant_id = ? AND resource = ? AND key = ?`,
    )
    .get(args.tenantId, args.resource, args.key);
  if (existing) {
    throw new FieldMetadataError(
      "duplicate-key",
      `A field named "${args.key}" already exists on ${args.resource}`,
    );
  }
  const id = uuid();
  const now = nowIso();
  db.prepare(
    `INSERT INTO field_metadata
       (id, tenant_id, resource, key, label, kind, options, required, indexed, position, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    args.tenantId,
    args.resource,
    args.key,
    args.label,
    args.kind,
    args.options ? JSON.stringify(args.options) : null,
    args.required ? 1 : 0,
    args.indexed ? 1 : 0,
    args.position ?? 0,
    args.createdBy,
    now,
    now,
  );
  const row = db.prepare(`SELECT * FROM field_metadata WHERE id = ?`).get(id) as FieldRow;
  return rowToMeta(row);
}

export function updateFieldMetadata(
  tenantId: string,
  id: string,
  patch: Partial<Omit<FieldMeta, "id" | "tenantId" | "resource" | "key" | "createdBy" | "createdAt" | "updatedAt">>,
): FieldMeta | null {
  const existing = db
    .prepare(`SELECT * FROM field_metadata WHERE id = ? AND tenant_id = ?`)
    .get(id, tenantId) as FieldRow | undefined;
  if (!existing) return null;
  const fields: string[] = [];
  const args: unknown[] = [];
  if (patch.label !== undefined) { fields.push("label = ?"); args.push(patch.label.slice(0, 200)); }
  if (patch.kind !== undefined) { fields.push("kind = ?"); args.push(patch.kind); }
  if (patch.options !== undefined) { fields.push("options = ?"); args.push(JSON.stringify(patch.options)); }
  if (patch.required !== undefined) { fields.push("required = ?"); args.push(patch.required ? 1 : 0); }
  if (patch.indexed !== undefined) { fields.push("indexed = ?"); args.push(patch.indexed ? 1 : 0); }
  if (patch.position !== undefined) { fields.push("position = ?"); args.push(patch.position); }
  if (fields.length === 0) return rowToMeta(existing);
  fields.push("updated_at = ?"); args.push(nowIso());
  args.push(id);
  db.prepare(`UPDATE field_metadata SET ${fields.join(", ")} WHERE id = ?`).run(...args);
  const row = db.prepare(`SELECT * FROM field_metadata WHERE id = ?`).get(id) as FieldRow;
  return rowToMeta(row);
}

export function deleteFieldMetadata(tenantId: string, id: string): boolean {
  const result = db
    .prepare(`DELETE FROM field_metadata WHERE id = ? AND tenant_id = ?`)
    .run(id, tenantId);
  return result.changes > 0;
}

/** Validate a record body against the custom field metadata for a
 *  resource. Returns either the (possibly coerced) record body or a
 *  list of errors. Used by writes to avoid storing garbage. The
 *  generic CRUD path optionally calls this — the system fields are
 *  validated by the frontend Zod; this layer adds the custom fields. */
export function validateRecordAgainstFieldMeta(
  tenantId: string,
  resource: string,
  record: Record<string, unknown>,
):
  | { ok: true; record: Record<string, unknown> }
  | { ok: false; errors: Array<{ field: string; error: string }> } {
  const meta = listFieldMetadata(tenantId, resource);
  if (meta.length === 0) return { ok: true, record };
  const errors: Array<{ field: string; error: string }> = [];
  const out = { ...record };
  for (const f of meta) {
    const val = out[f.key];
    if (val === undefined || val === null || val === "") {
      if (f.required) errors.push({ field: f.key, error: "required" });
      // Apply default if missing.
      if (val === undefined && f.options.defaultValue !== undefined) {
        out[f.key] = f.options.defaultValue;
      }
      continue;
    }
    // Type coercion + validation per kind.
    const coerced = coerceValue(val, f);
    if (coerced.ok) out[f.key] = coerced.value;
    else errors.push({ field: f.key, error: coerced.error });
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, record: out };
}

function coerceValue(
  raw: unknown,
  f: FieldMeta,
): { ok: true; value: unknown } | { ok: false; error: string } {
  switch (f.kind) {
    case "text":
    case "long-text":
    case "rich-text":
    case "email":
    case "phone":
    case "url":
      return typeof raw === "string"
        ? { ok: true, value: f.options.maxLength ? raw.slice(0, f.options.maxLength) : raw }
        : { ok: false, error: "expected string" };
    case "number":
    case "currency":
      if (typeof raw === "number") return { ok: true, value: raw };
      if (typeof raw === "string") {
        const n = Number(raw);
        return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, error: "expected number" };
      }
      return { ok: false, error: "expected number" };
    case "boolean":
      return typeof raw === "boolean" ? { ok: true, value: raw } : { ok: false, error: "expected boolean" };
    case "date":
    case "datetime":
      if (typeof raw === "string" && !Number.isNaN(Date.parse(raw))) return { ok: true, value: raw };
      return { ok: false, error: "expected ISO date string" };
    case "select": {
      if (typeof raw !== "string") return { ok: false, error: "expected string" };
      const valid = (f.options.options ?? []).map((o) => o.value);
      return valid.length === 0 || valid.includes(raw)
        ? { ok: true, value: raw }
        : { ok: false, error: `must be one of ${valid.join(", ")}` };
    }
    case "multiselect": {
      if (!Array.isArray(raw)) return { ok: false, error: "expected array" };
      const valid = (f.options.options ?? []).map((o) => o.value);
      if (valid.length > 0) {
        for (const item of raw) {
          if (typeof item !== "string" || !valid.includes(item)) {
            return { ok: false, error: `each value must be one of ${valid.join(", ")}` };
          }
        }
      }
      return { ok: true, value: raw };
    }
    case "relation":
      // Stored as the related record's id (a string).
      return typeof raw === "string"
        ? { ok: true, value: raw }
        : { ok: false, error: "expected related record id (string)" };
    case "json":
      // Anything goes.
      return { ok: true, value: raw };
  }
}
