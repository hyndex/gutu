import * as React from "react";
import { cn } from "@/lib/cn";
import { formatValue } from "./widgets/formatters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/primitives/Select";

/** PivotTable — interactive cross-tab with row/column grouping + aggregation.
 *
 *  Users choose:
 *    - Rows (one field per dimension; multi-select reserved for future)
 *    - Columns (one field)
 *    - Value (field + aggregation: sum/avg/count/min/max)
 *
 *  ERPNext's pivot is a dialog over a report query. Ours operates on a live
 *  set of rows (already materialised by the ReportDefinition.execute) so it
 *  composes with the existing ReportBuilder without round-trips.
 *
 *  Zero external deps; runs client-side. For millions of rows, delegate to
 *  a server-side pivot (future work).
 */

export type PivotAgg = "sum" | "avg" | "count" | "min" | "max";

export interface PivotField {
  field: string;
  label: string;
  /** Allow as a row/column dimension? Default true. Set false for numeric
   *  measurement fields you want pinned to the Value selector. */
  asDimension?: boolean;
  /** Allow as a value? Default true for numeric-looking fields. */
  asValue?: boolean;
  /** Numeric formatter hint. */
  format?: "currency" | "percent" | "number";
  currency?: string;
}

export interface PivotTableProps {
  rows: readonly Record<string, unknown>[];
  fields: readonly PivotField[];
  /** Initial row dimension. Default: first dimension field. */
  defaultRow?: string;
  /** Initial column dimension. Default: none (just grouped rows). */
  defaultColumn?: string;
  /** Initial value field. Default: first value field. */
  defaultValue?: string;
  /** Initial aggregation. Default "sum". */
  defaultAgg?: PivotAgg;
  className?: string;
}

export function PivotTable({
  rows,
  fields,
  defaultRow,
  defaultColumn,
  defaultValue,
  defaultAgg = "sum",
  className,
}: PivotTableProps) {
  const dims = fields.filter((f) => f.asDimension !== false);
  const values = fields.filter((f) => f.asValue !== false);
  const [rowField, setRowField] = React.useState<string>(
    defaultRow ?? dims[0]?.field ?? "",
  );
  const [colField, setColField] = React.useState<string>(defaultColumn ?? "");
  const [valField, setValField] = React.useState<string>(
    defaultValue ?? values[0]?.field ?? "",
  );
  const [agg, setAgg] = React.useState<PivotAgg>(defaultAgg);

  const { table, rowKeys, colKeys, rowTotals, colTotals, grandTotal } =
    React.useMemo(
      () => computePivot(rows, rowField, colField, valField, agg),
      [rows, rowField, colField, valField, agg],
    );

  const valueFieldDef = values.find((v) => v.field === valField);
  const fmt = (v: number) =>
    valueFieldDef?.format
      ? formatValue(v, valueFieldDef.format, valueFieldDef.currency)
      : formatValue(v, "number");

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface-1 p-3">
        <LabeledSelect
          label="Rows"
          value={rowField}
          onChange={setRowField}
          options={dims.map((d) => ({ value: d.field, label: d.label }))}
        />
        <LabeledSelect
          label="Columns"
          value={colField || "__none__"}
          onChange={(v) => setColField(v === "__none__" ? "" : v)}
          options={[
            { value: "__none__", label: "(none)" },
            ...dims
              .filter((d) => d.field !== rowField)
              .map((d) => ({ value: d.field, label: d.label })),
          ]}
        />
        <LabeledSelect
          label="Values"
          value={valField}
          onChange={setValField}
          options={values.map((v) => ({ value: v.field, label: v.label }))}
        />
        <LabeledSelect
          label="Aggregation"
          value={agg}
          onChange={(v) => setAgg(v as PivotAgg)}
          options={[
            { value: "sum", label: "Sum" },
            { value: "avg", label: "Average" },
            { value: "count", label: "Count" },
            { value: "min", label: "Min" },
            { value: "max", label: "Max" },
          ]}
        />
      </div>

      <div className="overflow-x-auto border border-border rounded-md bg-surface-0">
        <table className="w-full text-sm">
          <thead className="bg-surface-1 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted border-b border-border">
                {dims.find((d) => d.field === rowField)?.label ?? rowField}
              </th>
              {colField
                ? colKeys.map((ck) => (
                    <th
                      key={ck}
                      className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted border-b border-border"
                    >
                      {ck === "__empty__" ? "—" : ck}
                    </th>
                  ))
                : (
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted border-b border-border">
                    {valueFieldDef?.label ?? valField}
                  </th>
                )}
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted border-b border-border bg-accent-subtle">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((rk) => (
              <tr
                key={rk}
                className="border-b border-border-subtle last:border-b-0 hover:bg-surface-1"
              >
                <td className="px-3 py-2 font-medium text-text-primary">
                  {rk === "__empty__" ? "—" : rk}
                </td>
                {colField
                  ? colKeys.map((ck) => {
                      const v = table.get(rk)?.get(ck);
                      return (
                        <td
                          key={ck}
                          className="px-3 py-2 text-right tabular-nums"
                        >
                          {v !== undefined ? fmt(v) : ""}
                        </td>
                      );
                    })
                  : (
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmt(rowTotals.get(rk) ?? 0)}
                    </td>
                  )}
                <td className="px-3 py-2 text-right tabular-nums font-semibold bg-accent-subtle">
                  {fmt(rowTotals.get(rk) ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-surface-1 font-semibold">
              <td className="px-3 py-2">Total</td>
              {colField
                ? colKeys.map((ck) => (
                    <td key={ck} className="px-3 py-2 text-right tabular-nums">
                      {fmt(colTotals.get(ck) ?? 0)}
                    </td>
                  ))
                : (
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmt(grandTotal)}
                  </td>
                )}
              <td className="px-3 py-2 text-right tabular-nums bg-accent-subtle">
                {fmt(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ---- helpers ---- */

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-text-muted">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 min-w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function computePivot(
  rows: readonly Record<string, unknown>[],
  rowField: string,
  colField: string,
  valField: string,
  agg: PivotAgg,
) {
  // For each (rowKey, colKey) bucket, accumulate an array of numeric values
  // so we can compute sum/avg/count/min/max consistently.
  const buckets = new Map<string, Map<string, number[]>>();
  const rowKeysSet = new Set<string>();
  const colKeysSet = new Set<string>();

  const getNum = (r: Record<string, unknown>) => {
    const v = r[valField];
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isFinite(n) ? n : agg === "count" ? 1 : 0;
    }
    return agg === "count" ? 1 : 0;
  };

  for (const r of rows) {
    const rk = String(r[rowField] ?? "__empty__");
    const ck = colField ? String(r[colField] ?? "__empty__") : "__all__";
    rowKeysSet.add(rk);
    colKeysSet.add(ck);
    const rowMap = buckets.get(rk) ?? new Map<string, number[]>();
    const list = rowMap.get(ck) ?? [];
    list.push(agg === "count" ? 1 : getNum(r));
    rowMap.set(ck, list);
    buckets.set(rk, rowMap);
  }

  const aggregate = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    switch (agg) {
      case "sum":
        return arr.reduce((a, b) => a + b, 0);
      case "avg":
        return arr.reduce((a, b) => a + b, 0) / arr.length;
      case "count":
        return arr.length;
      case "min":
        return Math.min(...arr);
      case "max":
        return Math.max(...arr);
    }
  };

  const table = new Map<string, Map<string, number>>();
  for (const [rk, rm] of buckets) {
    const agged = new Map<string, number>();
    for (const [ck, list] of rm) agged.set(ck, aggregate(list));
    table.set(rk, agged);
  }

  const rowKeys = [...rowKeysSet].sort();
  const colKeys = colField ? [...colKeysSet].sort() : [];
  const rowTotals = new Map<string, number>();
  const colTotals = new Map<string, number>();
  let grandTotal = 0;

  for (const rk of rowKeys) {
    const row = table.get(rk)!;
    let total = 0;
    for (const [ck, v] of row) {
      total += v;
      colTotals.set(ck, (colTotals.get(ck) ?? 0) + v);
    }
    rowTotals.set(rk, total);
    grandTotal += total;
  }

  return { table, rowKeys, colKeys, rowTotals, colTotals, grandTotal };
}
