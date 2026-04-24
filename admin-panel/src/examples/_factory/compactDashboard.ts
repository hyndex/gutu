import type {
  WorkspaceDescriptor,
  WorkspaceFilterField,
} from "@/contracts/widgets";
import type { FilterTree } from "@/contracts/saved-views";
import { buildControlRoom } from "./controlRoomHelper";
import type { CustomView } from "@/contracts/views";

/** KPI spec — count or sum of a resource, optionally filtered/ranged. */
export interface KPISpec {
  label: string;
  resource: string;
  fn?: "count" | "sum" | "avg";
  field?: string;
  filter?: FilterTree;
  range?: "mtd" | "ytd" | "last-7" | "last-30";
  format?: "currency" | "percent";
  warnAbove?: number;
  dangerAbove?: number;
  drilldown?: string;
}

export interface ChartSpec {
  label: string;
  resource: string;
  chart: "donut" | "bar" | "line" | "area";
  groupBy?: string;
  field?: string;
  fn?: "count" | "sum" | "avg";
  period?: "day" | "week" | "month";
  lastDays?: number;
}

export interface ShortcutSpec {
  label: string;
  icon: string;
  href: string;
}

/** Compact builder that creates a Control Room from simpler inputs. */
export function buildCompactControlRoom(args: {
  viewId: string;
  resource: string;
  title: string;
  description?: string;
  kpis: readonly KPISpec[];
  charts: readonly ChartSpec[];
  shortcuts: readonly ShortcutSpec[];
  /** Optional filter bar — values AND-merge into every widget's aggregation. */
  filterBar?: readonly WorkspaceFilterField[];
}): CustomView {
  const cols = Math.floor(12 / Math.min(args.kpis.length, 4));
  const chartCols = args.charts.length <= 2 ? 6 : args.charts.length <= 4 ? 6 : 4;
  const shortcutCols = Math.floor(12 / Math.min(args.shortcuts.length, 4));
  const kpis = args.kpis.map((k, i) => ({
    id: `k-${i}`,
    type: "number_card" as const,
    col: cols,
    label: k.label,
    aggregation: {
      resource: k.resource,
      fn: k.fn ?? "count",
      field: k.field,
      filter: k.filter,
      range: k.range === "mtd" ? { kind: "mtd" as const }
        : k.range === "ytd" ? { kind: "ytd" as const }
        : k.range === "last-7" ? { kind: "last" as const, days: 7 }
        : k.range === "last-30" ? { kind: "last" as const, days: 30 }
        : undefined,
    },
    format: k.format,
    drilldown: k.drilldown,
    warnAbove: k.warnAbove,
    dangerAbove: k.dangerAbove,
  }));
  const charts = args.charts.map((c, i) => ({
    id: `c-${i}`,
    type: "chart" as const,
    col: chartCols,
    label: c.label,
    chart: c.chart,
    aggregation: {
      resource: c.resource,
      fn: c.fn ?? "count",
      field: c.field,
      groupBy: c.groupBy,
      period: c.period,
      range: c.lastDays ? { kind: "last" as const, days: c.lastDays } : undefined,
    },
  }));
  const shortcuts = args.shortcuts.map((s, i) => ({
    id: `sc-${i}`,
    type: "shortcut" as const,
    col: shortcutCols,
    label: s.label,
    icon: s.icon,
    href: s.href,
  }));
  const workspace: WorkspaceDescriptor = {
    id: `${args.viewId}.workspace`,
    label: args.title,
    filterBar: args.filterBar,
    widgets: [
      { id: "h1", type: "header", col: 12, label: "Overview", level: 2 },
      ...kpis,
      { id: "h2", type: "header", col: 12, label: "Charts", level: 2 },
      ...charts,
      { id: "h3", type: "header", col: 12, label: "Shortcuts", level: 2 },
      ...shortcuts,
    ],
  };
  return buildControlRoom({
    viewId: args.viewId,
    resource: args.resource,
    title: args.title,
    description: args.description,
    workspace,
  });
}
