/** <CustomFieldsSection /> — renders inputs for every custom field
 *  declared on a resource via the field_metadata table.
 *
 *  Used in two places:
 *    1. Form views (insert below the Zod-derived form rows so users
 *       can edit custom fields when creating/updating)
 *    2. RichDetailPage rail (so the same fields are visible on the
 *       detail page without a separate form)
 *
 *  Why a single component for both: it lets us keep one renderer per
 *  field kind (select dropdown, multi-select checkboxes, date
 *  picker, etc.) and reuse it everywhere the platform exposes
 *  custom fields. Adding a new field kind is one switch case here +
 *  one in the backend's coercion logic. */
import * as React from "react";
import { useFieldMetadata, type CustomFieldMeta, type CustomFieldKind } from "@/runtime/useFieldMetadata";
import { Input } from "@/primitives/Input";

interface Props {
  resource: string;
  /** Current record values. The component reads custom-field values
   *  from this object by `key` and emits onChange for the same keys. */
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  /** Optional title shown above the section. Hidden when there are no
   *  custom fields. */
  title?: string;
  /** Read-only mode (detail-page render). */
  readOnly?: boolean;
  /** Compact one-column mode (used in detail-page rail). */
  compact?: boolean;
}

export function CustomFieldsSection({
  resource,
  values,
  onChange,
  title = "Custom fields",
  readOnly,
  compact,
}: Props): React.JSX.Element | null {
  const { fields, loading } = useFieldMetadata(resource);
  if (loading) return null;
  if (fields.length === 0) return null;

  // Group fields by their `options.group` (defaults to "Custom").
  const groups = new Map<string, CustomFieldMeta[]>();
  for (const f of fields) {
    const g = f.options.group ?? title;
    const list = groups.get(g) ?? [];
    list.push(f);
    groups.set(g, list);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Array.from(groups.entries()).map(([group, items]) => (
        <fieldset
          key={group}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            padding: 12,
            margin: 0,
          }}
        >
          <legend
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              padding: "0 6px",
            }}
          >
            {group}
          </legend>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {items.map((f) => (
              <CustomFieldRow
                key={f.id}
                field={f}
                value={values[f.key]}
                onChange={(v) => onChange(f.key, v)}
                readOnly={readOnly}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

interface RowProps {
  field: CustomFieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
}

function CustomFieldRow({ field, value, onChange, readOnly }: RowProps): React.JSX.Element {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: 13,
      }}
    >
      <span style={{ fontWeight: 500, color: "#374151" }}>
        {field.label}
        {field.required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
      </span>
      <CustomFieldInput field={field} value={value} onChange={onChange} readOnly={readOnly} />
      {field.options.helpText && !readOnly && (
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{field.options.helpText}</span>
      )}
    </label>
  );
}

function CustomFieldInput({ field, value, onChange, readOnly }: RowProps): React.JSX.Element {
  const k: CustomFieldKind = field.kind;
  const display = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "string" || typeof v === "number") return String(v);
    return JSON.stringify(v);
  };

  if (readOnly) {
    return (
      <span style={{ color: "#111827", fontWeight: 400, padding: "4px 0" }}>
        {value === undefined || value === null || value === ""
          ? <span style={{ color: "#9ca3af" }}>—</span>
          : k === "boolean"
          ? value ? "Yes" : "No"
          : k === "multiselect" && Array.isArray(value)
          ? value.join(", ")
          : k === "url" && typeof value === "string"
          ? <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>{value}</a>
          : display(value)}
      </span>
    );
  }

  switch (k) {
    case "text":
    case "email":
    case "phone":
    case "url":
      return (
        <Input
          type={k === "email" ? "email" : k === "url" ? "url" : "text"}
          value={display(value)}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.options.maxLength}
        />
      );
    case "long-text":
      return (
        <textarea
          rows={3}
          value={display(value)}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.options.maxLength}
          style={{
            width: "100%",
            padding: "6px 8px",
            border: "1px solid #d1d5db",
            borderRadius: 4,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        />
      );
    case "rich-text":
      // Lightweight — the editor stack uses TipTap inside iframes;
      // surfacing it here would balloon the bundle. Inputs as
      // textarea + persisted as HTML string. Future: lazy-load TipTap
      // for inline rich-text in forms.
      return (
        <textarea
          rows={4}
          value={display(value)}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 8px",
            border: "1px solid #d1d5db",
            borderRadius: 4,
            fontSize: 13,
            fontFamily: "ui-monospace, monospace",
          }}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={display(value)}
          min={field.options.min}
          max={field.options.max}
          step={field.options.step}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "currency":
      return (
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0 8px",
            border: "1px solid #d1d5db",
            borderRight: 0,
            borderRadius: "4px 0 0 4px",
            background: "#f3f4f6",
            fontSize: 12,
            color: "#6b7280",
          }}>{field.options.currency ?? "USD"}</span>
          <Input
            type="number"
            value={display(value)}
            step={field.options.step ?? 0.01}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            style={{ borderRadius: "0 4px 4px 0" }}
          />
        </div>
      );
    case "boolean":
      return (
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          style={{ alignSelf: "flex-start", marginTop: 6 }}
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={typeof value === "string" ? value.slice(0, 10) : ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    case "datetime":
      return (
        <Input
          type="datetime-local"
          value={typeof value === "string" ? value.slice(0, 16) : ""}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        />
      );
    case "select": {
      const options = field.options.options ?? [];
      return (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || null)}
          style={{
            padding: "6px 8px",
            border: "1px solid #d1d5db",
            borderRadius: 4,
            fontSize: 13,
            background: "#fff",
          }}
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    case "multiselect": {
      const options = field.options.options ?? [];
      const selected = new Set(Array.isArray(value) ? (value as string[]) : []);
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {options.map((o) => {
            const isOn = selected.has(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  const next = new Set(selected);
                  if (isOn) next.delete(o.value);
                  else next.add(o.value);
                  onChange(Array.from(next));
                }}
                style={{
                  padding: "3px 10px",
                  fontSize: 12,
                  border: `1px solid ${isOn ? (o.color ?? "#2563eb") : "#d1d5db"}`,
                  background: isOn ? (o.color ?? "#dbeafe") : "#fff",
                  color: isOn ? "#fff" : "#111827",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }
    case "relation":
      return (
        <Input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={field.options.relationTarget ? `${field.options.relationTarget} id` : "Record id"}
        />
      );
    case "json":
      return (
        <textarea
          rows={3}
          value={typeof value === "string" ? value : value ? JSON.stringify(value, null, 2) : ""}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          style={{
            width: "100%",
            padding: "6px 8px",
            border: "1px solid #d1d5db",
            borderRadius: 4,
            fontSize: 12,
            fontFamily: "ui-monospace, monospace",
          }}
        />
      );
  }
}
