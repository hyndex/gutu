import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Checkbox } from "@/primitives/Checkbox";
import { Button } from "@/primitives/Button";
import { Skeleton } from "./Skeleton";

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  width?: number | string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  sortKey?: string;
}

export interface DataTableProps<T> {
  columns: readonly DataTableColumn<T>[];
  data: readonly T[];
  total?: number;
  page?: number;
  pageSize?: number;
  loading?: boolean;
  rowKey?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  selection?: {
    selected: Set<string>;
    onChange: (next: Set<string>) => void;
  };
  sort?: { field: string; dir: "asc" | "desc" };
  onSortChange?: (sort: { field: string; dir: "asc" | "desc" } | null) => void;
  onPageChange?: (page: number) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  total,
  page = 1,
  pageSize = 25,
  loading,
  rowKey = (row, i) => String((row as { id?: unknown }).id ?? i),
  onRowClick,
  selection,
  sort,
  onSortChange,
  onPageChange,
  emptyState,
  className,
}: DataTableProps<T>) {
  const pageCount = total != null ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const allIds = data.map((r, i) => rowKey(r, i));
  const allSelected =
    selection != null && allIds.length > 0 && allIds.every((id) => selection.selected.has(id));
  const someSelected =
    selection != null && allIds.some((id) => selection.selected.has(id));

  const toggleAll = () => {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (allSelected) {
      for (const id of allIds) next.delete(id);
    } else {
      for (const id of allIds) next.add(id);
    }
    selection.onChange(next);
  };

  const toggleRow = (id: string) => {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selection.onChange(next);
  };

  const handleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable || !onSortChange) return;
    const key = col.sortKey ?? col.id;
    if (sort?.field !== key) onSortChange({ field: key, dir: "asc" });
    else if (sort.dir === "asc") onSortChange({ field: key, dir: "desc" });
    else onSortChange(null);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="overflow-auto rounded-md border border-border bg-surface-0">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-surface-1 border-b border-border sticky top-0 z-[1]">
            <tr>
              {selection && (
                <th className="w-9 px-3" style={{ height: "var(--row-h)" }}>
                  <Checkbox
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
              )}
              {columns.map((col) => {
                const key = col.sortKey ?? col.id;
                const active = sort?.field === key;
                return (
                  <th
                    key={col.id}
                    className={cn(
                      "px-3 text-left font-medium text-text-secondary text-xs uppercase tracking-wide",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.sortable && "cursor-pointer select-none hover:text-text-primary",
                    )}
                    style={{
                      width: col.width,
                      height: "var(--row-h)",
                      paddingTop: 0,
                      paddingBottom: 0,
                    }}
                    onClick={() => handleSort(col)}
                    aria-sort={
                      active ? (sort?.dir === "asc" ? "ascending" : "descending") : "none"
                    }
                  >
                    <span className="inline-flex items-center gap-1 align-middle">
                      {col.header}
                      {col.sortable && (
                        <span className="text-text-muted">
                          {active ? (
                            sort?.dir === "asc" ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && data.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-border-subtle">
                  {selection && (
                    <td className="px-3" style={{ height: "var(--row-h)" }}>
                      <Skeleton className="h-4 w-4" />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td
                      key={c.id}
                      className="px-3"
                      style={{ height: "var(--row-h)" }}
                    >
                      <Skeleton className="h-3 w-[60%]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selection ? 1 : 0)}
                  className="text-center py-10 text-text-muted"
                >
                  {emptyState ?? "No results"}
                </td>
              </tr>
            ) : (
              data.map((row, i) => {
                const id = rowKey(row, i);
                const isSelected = selection?.selected.has(id);
                return (
                  <tr
                    key={id}
                    className={cn(
                      "border-b border-border-subtle last:border-b-0",
                      "transition-colors",
                      onRowClick && "cursor-pointer hover:bg-surface-1",
                      isSelected && "bg-accent-subtle/40",
                    )}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("[data-stop-row]")) return;
                      onRowClick?.(row);
                    }}
                  >
                    {selection && (
                      <td
                        className="px-3"
                        style={{ height: "var(--row-h)" }}
                        data-stop-row
                      >
                        <Checkbox
                          checked={!!isSelected}
                          onCheckedChange={() => toggleRow(id)}
                          aria-label={`Select row ${id}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          "px-3 text-text-primary",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                        )}
                        style={{
                          height: "var(--row-h)",
                          width: col.width,
                        }}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total != null && total > pageSize && (
        <div className="flex items-center justify-between py-3 text-sm text-text-muted">
          <div>
            {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 text-text-secondary">
              Page {page} / {pageCount}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= pageCount}
              onClick={() => onPageChange?.(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
