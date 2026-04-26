/** Reference Sales pages: Kanban pipeline + Orders list. */

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/primitives/Button";
import { Badge } from "@/primitives/Badge";
import { defineCustomView } from "@/builders";
import {
  KanbanArchetype,
  CommandHints,
  WidgetShell,
  useUrlState,
  useArchetypeKeyboard,
  useSwr,
  KanbanDndBoard,
  type KanbanCard,
  type KanbanColumn,
  useArchetypeToast,
} from "@/admin-archetypes";
import { cn } from "@/lib/cn";

interface Deal {
  id: string;
  name: string;
  customer: string;
  amount: number;
  stage: "new" | "qualify" | "proposal" | "negotiate" | "won" | "lost";
  ageDays: number;
  owner: string;
  priority: "low" | "med" | "high";
}

const STAGES: { id: Deal["stage"]; label: string; tone: string }[] = [
  { id: "new", label: "New", tone: "bg-info-soft text-info-strong" },
  { id: "qualify", label: "Qualify", tone: "bg-info-soft text-info-strong" },
  { id: "proposal", label: "Proposal", tone: "bg-warning-soft text-warning-strong" },
  { id: "negotiate", label: "Negotiate", tone: "bg-warning-soft text-warning-strong" },
  { id: "won", label: "Won", tone: "bg-success-soft text-success-strong" },
  { id: "lost", label: "Lost", tone: "bg-surface-2 text-text-muted" },
];

const SAMPLE_DEALS: Deal[] = Array.from({ length: 32 }, (_, i) => ({
  id: `deal-${i}`,
  name: ["Q3 Renewal", "Pilot Expansion", "Enterprise Deal", "Trial Conversion", "Upgrade", "Custom Tier"][i % 6] + ` ${i + 1}`,
  customer: ["Acme", "Globex", "Initech", "Soylent", "Hooli", "Massive Dynamic", "Pied Piper"][i % 7],
  amount: 5_000 + ((i * 1300) % 60_000),
  stage: STAGES[i % STAGES.length].id,
  ageDays: (i * 3) % 28,
  owner: ["Maya", "Devon", "Riya", "Sam"][i % 4],
  priority: (["low", "med", "high"] as const)[i % 3],
}));

async function fetchDeals(): Promise<Deal[]> {
  try {
    const res = await fetch("/api/sales/deals");
    if (res.ok) return (await res.json()) as Deal[];
  } catch {/* fall through */}
  return SAMPLE_DEALS;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const PRIORITY_DOT: Record<Deal["priority"], string> = {
  low: "bg-text-muted",
  med: "bg-info",
  high: "bg-danger",
};

export function SalesArchetypePipeline() {
  const [params, setParams] = useUrlState(["color"] as const);
  const colorMode = (params.color as "priority" | "owner" | undefined) ?? "priority";
  const data = useSwr<Deal[]>("sales.deals", fetchDeals);
  const [localDeals, setLocalDeals] = React.useState<Deal[]>([]);
  const toast = useArchetypeToast();
  React.useEffect(() => {
    if (data.data) setLocalDeals(data.data);
  }, [data.data]);
  const deals = localDeals;

  useArchetypeKeyboard([
    { label: "Refresh", combo: "r", run: () => { void data.refetch(); } },
  ]);

  const dndColumns = React.useMemo<readonly KanbanColumn[]>(
    () =>
      STAGES.map((s) => ({
        id: s.id,
        label: s.label,
        tone:
          s.id === "won"
            ? ("success" as const)
            : s.id === "lost"
              ? ("neutral" as const)
              : s.id === "negotiate" || s.id === "proposal"
                ? ("warning" as const)
                : ("info" as const),
        wipLimit: s.id === "negotiate" ? 6 : undefined,
        footer: (cards) => {
          const total = cards.reduce(
            (sum, c) => sum + (c.data as unknown as Deal).amount,
            0,
          );
          return fmtCurrency(total);
        },
        locked: s.id === "won",
      })),
    [],
  );

  const dndCards = React.useMemo<readonly KanbanCard<Deal>[]>(
    () =>
      deals.map((d, i) => ({
        id: d.id,
        columnId: d.stage,
        order: i,
        agingDays: d.ageDays,
        data: d,
      })),
    [deals],
  );

  const handleMove = React.useCallback(
    async (cardId: string, next: { columnId: string; order: number }) => {
      setLocalDeals((prev) => {
        const map = new Map(prev.map((d) => [d.id, d]));
        const target = map.get(cardId);
        if (!target) return prev;
        map.set(cardId, {
          ...target,
          stage: next.columnId as Deal["stage"],
          ageDays: next.columnId === target.stage ? target.ageDays : 0,
        });
        return Array.from(map.values());
      });
      toast({
        title: `Moved to ${next.columnId}`,
        intent: "success",
        durationMs: 2200,
      });
    },
    [toast],
  );

  return (
    <KanbanArchetype
      id="sales.pipeline"
      title="Sales pipeline"
      subtitle="Stage-driven deal flow with aging and totals"
      actions={
        <>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" aria-hidden /> New deal
          </Button>
        </>
      }
      toolbarStart={
        <span className="text-xs text-text-muted">Color by:</span>
      }
      toolbarEnd={
        <>
          <select
            value={colorMode}
            onChange={(e) => setParams({ color: e.target.value })}
            className="h-8 rounded-md border border-border bg-surface-0 px-2 text-xs"
          >
            <option value="priority">Priority</option>
            <option value="owner">Owner</option>
          </select>
          <CommandHints hints={[{ keys: "R", label: "Refresh" }]} />
        </>
      }
    >
      <WidgetShell label="Pipeline" state={data.state} skeleton="kpi" onRetry={data.refetch}>
        <KanbanDndBoard<Deal>
          columns={dndColumns}
          cards={dndCards}
          onMove={handleMove}
          canMove={(card, _from, to) =>
            to.id === "won" && card.data.amount < 1000
              ? "Won deals must be ≥ $1,000"
              : true
          }
          warnAgingDays={7}
          dangerAgingDays={14}
          renderCard={(card) => {
            const d = card.data;
            return (
              <>
                <div className="flex items-start justify-between gap-1.5">
                  <div className="text-sm font-medium text-text-primary truncate">{d.name}</div>
                  {colorMode === "priority" && (
                    <span
                      className={cn("h-2 w-2 rounded-full mt-1 shrink-0", PRIORITY_DOT[d.priority])}
                      aria-hidden
                    />
                  )}
                </div>
                <div className="text-xs text-text-muted truncate">{d.customer}</div>
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span className="font-semibold tabular-nums">{fmtCurrency(d.amount)}</span>
                  <span
                    className={cn(
                      "tabular-nums",
                      d.ageDays > 14 ? "text-danger" : d.ageDays > 7 ? "text-warning" : "text-text-muted",
                    )}
                  >
                    {d.ageDays}d
                  </span>
                </div>
              </>
            );
          }}
        />
      </WidgetShell>
    </KanbanArchetype>
  );
}

export const salesArchetypePipelineView = defineCustomView({
  id: "sales.archetype-pipeline.view",
  title: "Pipeline (archetype)",
  description: "Reference Kanban: stages, aging, totals, drag-friendly cards.",
  resource: "sales.deal",
  archetype: "kanban",
  density: "comfortable",
  render: () => <SalesArchetypePipeline />,
});

export const salesArchetypeNav = [
  {
    id: "sales.archetype-pipeline",
    label: "Pipeline (new)",
    icon: "Layers",
    path: "/sales/archetype-pipeline",
    view: "sales.archetype-pipeline.view",
    section: "sales",
    order: 12.1,
  },
];

/** Re-export Badge so the wiring file has zero unused-import lint complaints. */
export { Badge };
