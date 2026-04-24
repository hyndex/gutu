import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input } from "@/primitives/Input";
import { Button } from "@/primitives/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/primitives/Select";
import type { FilterDescriptor } from "@/contracts/views";

export interface FilterBarProps {
  search?: boolean;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  filters?: readonly FilterDescriptor[];
  filterValues?: Record<string, unknown>;
  onFilterChange?: (next: Record<string, unknown>) => void;
  className?: string;
  trailing?: React.ReactNode;
}

export function FilterBar({
  search,
  searchValue,
  onSearchChange,
  filters,
  filterValues = {},
  onFilterChange,
  className,
  trailing,
}: FilterBarProps) {
  const activeCount = Object.values(filterValues).filter(
    (v) => v !== undefined && v !== null && v !== "",
  ).length;

  return (
    <div
      className={cn(
        "flex items-center gap-2 flex-wrap py-2",
        className,
      )}
    >
      {search && (
        <div className="min-w-[220px] flex-1 max-w-sm">
          <Input
            placeholder="Search…"
            prefix={<Search className="h-3.5 w-3.5" />}
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
      )}
      {filters?.map((f) => (
        <FilterControl
          key={f.field}
          filter={f}
          value={filterValues[f.field]}
          onChange={(v) =>
            onFilterChange?.({ ...filterValues, [f.field]: v })
          }
        />
      ))}
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange?.({})}
          iconLeft={<X className="h-3 w-3" />}
        >
          Clear {activeCount}
        </Button>
      )}
      <div className="ml-auto flex items-center gap-2">{trailing}</div>
    </div>
  );
}

function FilterControl({
  filter,
  value,
  onChange,
}: {
  filter: FilterDescriptor;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (filter.kind === "enum") {
    return (
      <Select
        value={(value as string) ?? ""}
        onValueChange={(v) => onChange(v === "__all__" ? "" : v)}
      >
        <SelectTrigger className="h-8 min-w-[140px] w-auto">
          <SelectValue placeholder={filter.label ?? filter.field} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All</SelectItem>
          {filter.options?.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (filter.kind === "boolean") {
    return (
      <Select
        value={value === true ? "true" : value === false ? "false" : ""}
        onValueChange={(v) =>
          onChange(v === "__all__" ? "" : v === "true" ? true : false)
        }
      >
        <SelectTrigger className="h-8 min-w-[120px] w-auto">
          <SelectValue placeholder={filter.label ?? filter.field} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All</SelectItem>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  if (filter.kind === "text") {
    return (
      <Input
        placeholder={filter.label ?? filter.field}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-[180px]"
      />
    );
  }
  if (filter.kind === "date-range") {
    const v = (value as { from?: string; to?: string }) ?? {};
    return (
      <div className="flex items-center gap-1 text-sm">
        <Input
          type="date"
          value={v.from ?? ""}
          onChange={(e) =>
            onChange({ ...v, from: e.target.value || undefined })
          }
          className="h-8 w-[140px]"
        />
        <span className="text-text-muted">→</span>
        <Input
          type="date"
          value={v.to ?? ""}
          onChange={(e) =>
            onChange({ ...v, to: e.target.value || undefined })
          }
          className="h-8 w-[140px]"
        />
      </div>
    );
  }
  return null;
}
