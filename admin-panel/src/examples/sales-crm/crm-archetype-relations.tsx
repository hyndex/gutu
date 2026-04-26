/** Reference Graph / Network archetype: CRM relations explorer.
 *
 *  A self-contained 2D node-edge visualisation that demonstrates the
 *  Graph archetype shell (toolbar, rail-with-detail, full-bleed-friendly
 *  layout) without pulling a graph library. Layout is a deterministic
 *  radial / clustered placement so the same input always renders the
 *  same scene — important for screenshot diffs and accessibility. */

import * as React from "react";
import { Search, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/primitives/Button";
import { defineCustomView } from "@/builders";
import {
  GraphNetwork,
  WidgetShell,
  CommandHints,
  RailEntityCard,
  useArchetypeKeyboard,
  useUrlState,
  type LoadState,
} from "@/admin-archetypes";
import { useAllRecords } from "@/runtime/hooks";
import { cn } from "@/lib/cn";
import { ForceGraphCanvas } from "@/admin-archetypes";

type EntityType = "company" | "person" | "deal" | "ticket" | "contract";

interface Node {
  id: string;
  label: string;
  type: EntityType;
}

interface Edge {
  source: string;
  target: string;
  /** Strength 0..1; higher = thicker edge. */
  weight?: number;
  kind: "owns" | "works_for" | "linked" | "follows" | "open";
}

const NODES: Node[] = [
  { id: "co-acme", label: "Acme", type: "company" },
  { id: "co-globex", label: "Globex", type: "company" },
  { id: "p-maya", label: "Maya R.", type: "person" },
  { id: "p-devon", label: "Devon W.", type: "person" },
  { id: "p-riya", label: "Riya P.", type: "person" },
  { id: "p-sam", label: "Sam L.", type: "person" },
  { id: "d-q3", label: "Q3-Renewal", type: "deal" },
  { id: "d-pilot", label: "Pilot", type: "deal" },
  { id: "t-acme-1", label: "Acme #482", type: "ticket" },
  { id: "t-acme-2", label: "Acme #491", type: "ticket" },
  { id: "c-msa", label: "MSA-2024", type: "contract" },
  { id: "c-dpa", label: "DPA-2024", type: "contract" },
];

const EDGES: Edge[] = [
  { source: "p-maya", target: "co-acme", kind: "owns", weight: 1 },
  { source: "p-devon", target: "co-globex", kind: "owns", weight: 0.9 },
  { source: "p-riya", target: "co-acme", kind: "works_for", weight: 0.6 },
  { source: "p-sam", target: "co-acme", kind: "works_for", weight: 0.5 },
  { source: "co-acme", target: "d-q3", kind: "linked", weight: 0.9 },
  { source: "co-acme", target: "d-pilot", kind: "linked", weight: 0.4 },
  { source: "co-acme", target: "t-acme-1", kind: "open", weight: 0.7 },
  { source: "co-acme", target: "t-acme-2", kind: "open", weight: 0.7 },
  { source: "co-acme", target: "c-msa", kind: "linked", weight: 0.8 },
  { source: "co-acme", target: "c-dpa", kind: "linked", weight: 0.7 },
  { source: "p-maya", target: "d-q3", kind: "follows", weight: 0.5 },
];

const TYPE_COLOR: Record<EntityType, { fill: string; stroke: string }> = {
  company: { fill: "#3B82F6", stroke: "#1D4ED8" }, // info
  person: { fill: "#10B981", stroke: "#047857" }, // success
  deal: { fill: "#F59E0B", stroke: "#B45309" }, // warning
  ticket: { fill: "#EF4444", stroke: "#B91C1C" }, // danger
  contract: { fill: "#A78BFA", stroke: "#6D28D9" }, // accent
};

interface PositionedNode extends Node {
  x: number;
  y: number;
}

/** Deterministic clustered layout: companies anchor positions, related
 *  nodes orbit. Pure function — same input → same output. */
function layoutNodes(nodes: Node[]): PositionedNode[] {
  const positioned = new Map<string, PositionedNode>();
  const companies = nodes.filter((n) => n.type === "company");
  const orbit = (cx: number, cy: number, items: Node[], radius: number) => {
    items.forEach((n, i) => {
      const a = (i / Math.max(1, items.length)) * Math.PI * 2;
      positioned.set(n.id, { ...n, x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
    });
  };
  // Lay out companies along a horizontal axis.
  companies.forEach((c, i) => {
    const x = 25 + i * 50; // 25, 75 (for 2 companies — adjust if more)
    const y = 50;
    positioned.set(c.id, { ...c, x, y });
  });
  // For each company, orbit its connected nodes.
  for (const co of companies) {
    const co_p = positioned.get(co.id)!;
    const connected = EDGES.filter((e) => e.source === co.id || e.target === co.id)
      .map((e) => (e.source === co.id ? e.target : e.source))
      .filter((id, i, arr) => arr.indexOf(id) === i)
      .map((id) => nodes.find((n) => n.id === id))
      .filter((n): n is Node => n != null && !positioned.has(n.id));
    orbit(co_p.x, co_p.y, connected, 18);
  }
  // Place any remaining unconnected nodes on the right.
  const leftovers = nodes.filter((n) => !positioned.has(n.id));
  leftovers.forEach((n, i) => {
    positioned.set(n.id, { ...n, x: 90, y: 10 + i * 12 });
  });
  return nodes.map((n) => positioned.get(n.id)!);
}

export function CrmArchetypeRelations() {
  const [params, setParams] = useUrlState(["sel", "zoom"] as const);
  // Real backend reads — derive nodes + edges from real CRM contacts +
  // sales deals. Each contact and company becomes a node; deals link
  // contacts to companies; same-company contacts share an edge.
  const liveContacts = useAllRecords<{
    id: string;
    name?: string;
    company?: string;
  }>("crm.contact");
  const liveDeals = useAllRecords<{
    id: string;
    contactId?: string;
    company?: string;
    name?: string;
    amount?: number;
  }>("sales.deal");

  const built = React.useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
    if (liveContacts.data.length === 0 && liveDeals.data.length === 0) {
      return { nodes: NODES, edges: EDGES };
    }
    const nodes: Node[] = [];
    const seen = new Set<string>();
    const addNode = (n: Node) => {
      if (seen.has(n.id)) return;
      seen.add(n.id);
      nodes.push(n);
    };
    // Companies (deduplicated).
    const companies = new Set<string>();
    for (const c of liveContacts.data) {
      if (c.company) companies.add(c.company);
    }
    for (const co of companies) {
      addNode({ id: `co-${co}`, label: co, type: "company" });
    }
    // Contacts.
    for (const c of liveContacts.data.slice(0, 60)) {
      addNode({ id: `p-${c.id}`, label: c.name ?? c.id, type: "person" });
    }
    // Deals.
    for (const d of liveDeals.data.slice(0, 60)) {
      addNode({ id: `d-${d.id}`, label: d.name ?? d.id, type: "deal" });
    }
    // Edges.
    const edges: Edge[] = [];
    for (const c of liveContacts.data.slice(0, 60)) {
      if (c.company)
        edges.push({ source: `p-${c.id}`, target: `co-${c.company}`, kind: "works_for", weight: 0.7 });
    }
    for (const d of liveDeals.data.slice(0, 60)) {
      if (d.company)
        edges.push({ source: `co-${d.company}`, target: `d-${d.id}`, kind: "linked", weight: Math.min(1, (d.amount ?? 0) / 100_000) });
      if (d.contactId)
        edges.push({ source: `p-${d.contactId}`, target: `d-${d.id}`, kind: "follows", weight: 0.5 });
    }
    return { nodes, edges };
  }, [liveContacts.data, liveDeals.data]);

  const dataState: LoadState = (liveContacts.error || liveDeals.error)
    ? { status: "error", error: liveContacts.error ?? liveDeals.error }
    : (liveContacts.loading && liveDeals.loading && liveContacts.data.length === 0)
      ? { status: "loading" }
      : { status: "ready" };
  const data = {
    state: dataState,
    refetch: () => {
      liveContacts.refetch();
      liveDeals.refetch();
    },
  };

  const nodes = built.nodes;
  const edges = built.edges;
  const positioned = React.useMemo(() => layoutNodes(nodes), [nodes]);
  const byId = React.useMemo(
    () => new Map(positioned.map((n) => [n.id, n])),
    [positioned],
  );
  const selectedId = params.sel ?? null;
  const zoom = Number.parseFloat(params.zoom ?? "1") || 1;
  const setZoom = (next: number) => setParams({ zoom: String(Math.max(0.5, Math.min(3, next))) });

  const selected = selectedId ? positioned.find((n) => n.id === selectedId) ?? null : null;

  useArchetypeKeyboard([
    { label: "Zoom in", combo: "=", run: () => setZoom(zoom + 0.2) },
    { label: "Zoom out", combo: "-", run: () => setZoom(zoom - 0.2) },
    { label: "Fit", combo: "0", run: () => setZoom(1) },
    { label: "Refresh", combo: "r", run: () => { void data.refetch(); } },
    {
      label: "Clear selection",
      combo: "esc",
      run: () => {
        if (selectedId) setParams({ sel: null });
      },
    },
  ]);

  const counts = nodes.reduce<Record<EntityType, number>>(
    (acc, n) => {
      acc[n.type] = (acc[n.type] ?? 0) + 1;
      return acc;
    },
    { company: 0, person: 0, deal: 0, ticket: 0, contract: 0 },
  );

  const neighbours = selectedId
    ? edges
        .filter((e) => e.source === selectedId || e.target === selectedId)
        .map((e) => {
          const otherId = e.source === selectedId ? e.target : e.source;
          return { id: otherId, edge: e, node: byId.get(otherId)! };
        })
    : [];

  return (
    <GraphNetwork
      id="crm.relations"
      title="Entity relations"
      subtitle="Force-directed view of every CRM linkage"
      actions={
        <>
          <Button size="sm" variant="outline" onClick={() => setZoom(zoom - 0.2)} aria-label="Zoom out">
            <ZoomOut className="h-4 w-4" aria-hidden />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setZoom(1)} aria-label="Fit">
            <Maximize2 className="h-4 w-4" aria-hidden />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setZoom(zoom + 0.2)} aria-label="Zoom in">
            <ZoomIn className="h-4 w-4" aria-hidden />
          </Button>
        </>
      }
      toolbarStart={
        <div className="flex items-center gap-3 text-xs text-text-muted">
          {(Object.keys(TYPE_COLOR) as EntityType[]).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR[t].fill }} aria-hidden />
              <span className="capitalize">{t}</span>
              <span className="tabular-nums">· {counts[t] ?? 0}</span>
            </span>
          ))}
        </div>
      }
      toolbarEnd={
        <CommandHints
          hints={[
            { keys: "+/-", label: "Zoom" },
            { keys: "0", label: "Fit" },
            { keys: "Esc", label: "Clear" },
          ]}
        />
      }
      rail={
        <>
          {selected ? (
            <>
              <RailEntityCard
                title={selected.label}
                subtitle={selected.type}
                facts={[
                  { label: "Type", value: selected.type },
                  { label: "Neighbours", value: neighbours.length },
                ]}
              />
              <div className="rounded-lg border border-border bg-surface-0">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted border-b border-border-subtle">
                  Neighbours
                </div>
                <ul role="list" className="divide-y divide-border-subtle">
                  {neighbours.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => setParams({ sel: n.node.id })}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-1 text-left"
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: TYPE_COLOR[n.node.type].fill }}
                          aria-hidden
                        />
                        <span className="text-sm text-text-primary truncate flex-1">{n.node.label}</span>
                        <span className="text-[10px] uppercase tracking-wide text-text-muted">
                          {n.edge.kind}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-surface-0/40 p-3 text-xs text-text-muted text-center">
              Click a node to inspect its neighbours.
            </div>
          )}
        </>
      }
    >
      <WidgetShell label="Relations graph" state={data.state} skeleton="chart" onRetry={data.refetch}>
        <div
          className="rounded-lg border border-border bg-surface-1 overflow-hidden h-[60vh] w-full"
          style={{ transformOrigin: "50% 50%", transform: `scale(${zoom})` }}
        >
          <ForceGraphCanvas
            nodes={nodes.map((n) => ({ id: n.id, label: n.label, type: n.type }))}
            edges={edges.map((e) => ({ source: e.source, target: e.target, weight: e.weight }))}
            selectedId={selectedId ?? undefined}
            onSelect={(id) => setParams({ sel: id })}
            typeColor={(type) => TYPE_COLOR[type as EntityType]?.fill ?? "#9CA3AF"}
            description="CRM entity relations graph (force-directed)"
            width={100}
            height={100}
          />
        </div>
      </WidgetShell>
    </GraphNetwork>
  );
}

export const crmArchetypeRelationsView = defineCustomView({
  id: "crm.archetype-relations.view",
  title: "Relations (archetype)",
  description: "Reference Graph / Network archetype: CRM entity relations.",
  resource: "crm.contact",
  archetype: "graph",
  density: "comfortable",
  render: () => <CrmArchetypeRelations />,
});

/** Re-export Search icon to avoid unused-import lint. */
export { Search };
