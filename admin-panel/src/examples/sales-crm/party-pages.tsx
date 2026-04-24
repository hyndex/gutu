import * as React from "react";
import { Users, Building2, Briefcase, UserCircle2, Search } from "lucide-react";
import { defineCustomView } from "@/builders";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { DetailHeader } from "@/admin-primitives/DetailHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/admin-primitives/Card";
import { PageGrid, Section, Inline, Stack } from "@/admin-primitives/PageLayout";
import { StatCard } from "@/admin-primitives/StatCard";
import { PropertyList } from "@/admin-primitives/PropertyList";
import { TabBar } from "@/admin-primitives/TabBar";
import { Avatar } from "@/primitives/Avatar";
import { Badge } from "@/primitives/Badge";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { cn } from "@/lib/cn";
import { type RelationshipEntity } from "./data";
import { useEdges, useEntities } from "./data-hooks";
import { Spinner } from "@/primitives/Spinner";
import { EmptyState } from "@/admin-primitives/EmptyState";
import { navigateTo } from "@/views/useRoute";

const KIND_COLOR: Record<RelationshipEntity["kind"], string> = {
  company: "rgb(var(--accent))",
  person: "rgb(var(--intent-info))",
  vendor: "rgb(var(--intent-warning))",
  partner: "rgb(var(--intent-success))",
};

const KIND_ICON: Record<RelationshipEntity["kind"], React.ComponentType<{ className?: string }>> = {
  company: Building2,
  person: UserCircle2,
  vendor: Briefcase,
  partner: Users,
};

/* ------------------------------------------------------------------------ */

export const partyGraphView = defineCustomView({
  id: "party-relationships.graph.view",
  title: "Relationship graph",
  description: "Visualize how entities connect.",
  resource: "party-relationships.relationship",
  render: () => <GraphPage />,
});

function GraphPage() {
  const { data: ENTITIES, loading } = useEntities();
  const { data: EDGES } = useEdges();
  const [hover, setHover] = React.useState<string | null>(null);

  if (loading && ENTITIES.length === 0) return <LoadingShell />;

  const size = 480;
  const center = { x: size / 2, y: size / 2 };

  // Layout — put Gutu in the middle, others on a ring.
  const ring = ENTITIES.filter((e) => e.id !== "e_gutu");
  const positions = new Map<string, { x: number; y: number }>();
  positions.set("e_gutu", center);
  ring.forEach((e, i) => {
    const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
    const r = 180;
    positions.set(e.id, {
      x: center.x + r * Math.cos(angle),
      y: center.y + r * Math.sin(angle),
    });
  });

  const counts = (["company", "person", "vendor", "partner"] as const).map((k) => ({
    kind: k,
    count: ENTITIES.filter((e) => e.kind === k).length,
  }));

  return (
    <Stack>
      <PageHeader
        title="Relationship graph"
        description={`${ENTITIES.length} entities · ${EDGES.length} relationships.`}
      />

      <PageGrid columns={4}>
        {counts.map(({ kind, count }) => {
          const Icon = KIND_ICON[kind];
          return (
            <StatCard
              key={kind}
              label={kind}
              value={count}
              icon={<Icon className="h-3 w-3" />}
            />
          );
        })}
      </PageGrid>

      <PageGrid columns={3}>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Network</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <svg
                viewBox={`0 0 ${size} ${size}`}
                width="100%"
                className="max-h-[520px]"
                role="img"
                aria-label="Relationship graph"
              >
                {/* Edges */}
                {EDGES.map((e) => {
                  const from = positions.get(e.from);
                  const to = positions.get(e.to);
                  if (!from || !to) return null;
                  const highlighted =
                    !hover || hover === e.from || hover === e.to;
                  return (
                    <line
                      key={e.id}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="rgb(var(--text-muted))"
                      strokeWidth={1 + e.strength}
                      opacity={highlighted ? 0.6 : 0.1}
                    />
                  );
                })}

                {/* Nodes */}
                {ENTITIES.map((e) => {
                  const p = positions.get(e.id);
                  if (!p) return null;
                  const color = KIND_COLOR[e.kind];
                  const focused = hover === e.id || !hover;
                  return (
                    <g
                      key={e.id}
                      transform={`translate(${p.x} ${p.y})`}
                      onMouseEnter={() => setHover(e.id)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() =>
                        navigateTo(`/party-relationships/${e.id}`)
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        r={e.id === "e_gutu" ? 22 : 14}
                        fill={color}
                        opacity={focused ? 1 : 0.4}
                      />
                      <text
                        y={e.id === "e_gutu" ? 38 : 28}
                        textAnchor="middle"
                        fontSize="10"
                        className="fill-text-secondary"
                        opacity={focused ? 1 : 0.4}
                      >
                        {e.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Legend</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Stack gap="gap-2">
              {(["company", "person", "vendor", "partner"] as const).map((k) => {
                const Icon = KIND_ICON[k];
                return (
                  <Inline key={k} gap="gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: KIND_COLOR[k] }}
                    />
                    <Icon className="h-3.5 w-3.5 text-text-muted" />
                    <span className="text-sm capitalize text-text-primary">{k}</span>
                    <span className="ml-auto text-xs text-text-muted">
                      {ENTITIES.filter((e) => e.kind === k).length}
                    </span>
                  </Inline>
                );
              })}
            </Stack>
            <div className="mt-4 pt-3 border-t border-border-subtle">
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Relationship types
              </div>
              <Inline gap="gap-1" wrap>
                {[...new Set(EDGES.map((e) => e.kind))].map((k) => (
                  <Badge key={k} intent="neutral">
                    {k}
                  </Badge>
                ))}
              </Inline>
            </div>
          </CardContent>
        </Card>
      </PageGrid>
    </Stack>
  );
}

/* ------------------------------------------------------------------------ */

export const partyListView = defineCustomView({
  id: "party-relationships.list.view",
  title: "Relationships",
  description: "All entities and their links.",
  resource: "party-relationships.relationship",
  render: () => <RelationshipsList />,
});

function RelationshipsList() {
  const { data: ENTITIES, loading } = useEntities();
  const { data: EDGES } = useEdges();
  const [tab, setTab] = React.useState<"entities" | "edges">("entities");
  const [search, setSearch] = React.useState("");

  if (loading && ENTITIES.length === 0) return <LoadingShell />;

  const entities = ENTITIES.filter(
    (e) => !search || e.label.toLowerCase().includes(search.toLowerCase()),
  );
  const edges = EDGES.map((e) => ({
    ...e,
    fromLabel: ENTITIES.find((x) => x.id === e.from)?.label ?? e.from,
    toLabel: ENTITIES.find((x) => x.id === e.to)?.label ?? e.to,
  })).filter(
    (e) =>
      !search ||
      e.fromLabel.toLowerCase().includes(search.toLowerCase()) ||
      e.toLabel.toLowerCase().includes(search.toLowerCase()) ||
      e.kind.toLowerCase().includes(search.toLowerCase()),
  );

  const tabs = [
    { id: "entities", label: "Entities", count: ENTITIES.length },
    { id: "edges", label: "Relationships", count: EDGES.length },
  ];

  return (
    <Stack>
      <PageHeader
        title="Party relationships"
        description="Companies, people, vendors, and partners — and how they connect."
      />

      <Inline gap="gap-3" wrap>
        <div className="max-w-sm flex-1 min-w-[220px]">
          <Input
            placeholder="Search by label, kind…"
            prefix={<Search className="h-3.5 w-3.5" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Inline>

      <TabBar
        tabs={tabs}
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
      />

      {tab === "entities" ? (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border-subtle">
              {entities.map((e) => {
                const Icon = KIND_ICON[e.kind];
                const edgesOut = EDGES.filter((x) => x.from === e.id).length;
                const edgesIn = EDGES.filter((x) => x.to === e.id).length;
                return (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface-1 transition-colors"
                    onClick={() =>
                      navigateTo(`/party-relationships/${e.id}`)
                    }
                  >
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-white"
                      style={{ background: KIND_COLOR[e.kind] }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <Stack gap="gap-0.5" className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {e.label}
                      </span>
                      <span className="text-xs text-text-muted">
                        {edgesOut + edgesIn} links · {edgesOut} out · {edgesIn} in
                      </span>
                    </Stack>
                    <Badge intent="neutral" className="capitalize">
                      {e.kind}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-1 text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">From</th>
                  <th className="text-left py-2 font-medium">Kind</th>
                  <th className="text-left py-2 font-medium">To</th>
                  <th className="text-right py-2 font-medium pr-4">Strength</th>
                </tr>
              </thead>
              <tbody>
                {edges.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-border-subtle last:border-b-0"
                  >
                    <td className="px-4 py-2">
                      <Inline gap="gap-2">
                        <Avatar name={e.fromLabel} size="xs" />
                        <span className="text-text-primary">{e.fromLabel}</span>
                      </Inline>
                    </td>
                    <td className="py-2 text-text-secondary capitalize">
                      <Badge intent="accent">{e.kind}</Badge>
                    </td>
                    <td className="py-2">
                      <Inline gap="gap-2">
                        <Avatar name={e.toLabel} size="xs" />
                        <span className="text-text-primary">{e.toLabel}</span>
                      </Inline>
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <div
                        className="inline-block w-20 h-1.5 rounded-full bg-surface-2 overflow-hidden align-middle"
                      >
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${e.strength * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

/* ------------------------------------------------------------------------ */

export const partyEntityDetailView = defineCustomView({
  id: "party-relationships.entity-detail.view",
  title: "Entity",
  description: "Single entity and its graph neighborhood.",
  resource: "party-relationships.relationship",
  render: () => <EntityDetailPage />,
});

function EntityDetailPage() {
  const { data: ENTITIES, loading } = useEntities();
  const { data: EDGES } = useEdges();
  const id = useLastSegment();

  if (loading && ENTITIES.length === 0) return <LoadingShell />;

  const entity = ENTITIES.find((e) => e.id === id) ?? ENTITIES[0];
  if (!entity) {
    return (
      <EmptyState
        title="Entity not found"
        description={`No entity with id "${id}".`}
      />
    );
  }
  const Icon = KIND_ICON[entity.kind];
  const outgoing = EDGES.filter((e) => e.from === entity.id).map((e) => ({
    ...e,
    other: ENTITIES.find((x) => x.id === e.to),
  }));
  const incoming = EDGES.filter((e) => e.to === entity.id).map((e) => ({
    ...e,
    other: ENTITIES.find((x) => x.id === e.from),
  }));

  return (
    <Stack>
      <DetailHeader
        avatar={{ name: entity.label }}
        title={entity.label}
        subtitle={<span className="capitalize">{entity.kind}</span>}
        badges={
          <Badge intent="neutral" className="capitalize">
            {entity.kind}
          </Badge>
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1">
              <Icon className="h-3 w-3" /> {outgoing.length} outgoing
            </span>
            <span>{incoming.length} incoming</span>
          </>
        }
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigateTo("/party-relationships/graph")}
          >
            View on graph
          </Button>
        }
      />

      <PageGrid columns={3}>
        <div className="lg:col-span-2">
          <Stack>
            <Section title="Outgoing relationships">
              {outgoing.length === 0 ? (
                <div className="text-sm text-text-muted">No outgoing links.</div>
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {outgoing.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center gap-3 py-2 cursor-pointer hover:bg-surface-1 transition-colors px-2 -mx-2 rounded"
                      onClick={() =>
                        o.other &&
                        navigateTo(`/party-relationships/${o.other.id}`)
                      }
                    >
                      <Badge intent="accent" className="capitalize">
                        {o.kind}
                      </Badge>
                      <span className="text-sm text-text-muted">→</span>
                      <Avatar name={o.other?.label ?? "?"} size="sm" />
                      <span className="flex-1 text-sm text-text-primary">
                        {o.other?.label ?? "—"}
                      </span>
                      <span className="text-xs text-text-muted">
                        {Math.round(o.strength * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Incoming relationships">
              {incoming.length === 0 ? (
                <div className="text-sm text-text-muted">No incoming links.</div>
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {incoming.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center gap-3 py-2 cursor-pointer hover:bg-surface-1 transition-colors px-2 -mx-2 rounded"
                      onClick={() =>
                        o.other &&
                        navigateTo(`/party-relationships/${o.other.id}`)
                      }
                    >
                      <Avatar name={o.other?.label ?? "?"} size="sm" />
                      <span className="flex-1 text-sm text-text-primary">
                        {o.other?.label ?? "—"}
                      </span>
                      <span className="text-sm text-text-muted">→</span>
                      <Badge intent="accent" className="capitalize">
                        {o.kind}
                      </Badge>
                      <span className="text-xs text-text-muted">
                        {Math.round(o.strength * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </Stack>
        </div>
        <Stack>
          <Section title="About">
            <PropertyList
              items={[
                { label: "ID", value: <code className="font-mono text-xs">{entity.id}</code> },
                { label: "Kind", value: <span className="capitalize">{entity.kind}</span> },
                { label: "Outgoing", value: outgoing.length },
                { label: "Incoming", value: incoming.length },
              ]}
            />
          </Section>
        </Stack>
      </PageGrid>
    </Stack>
  );
}

function LoadingShell() {
  return (
    <div className="h-full w-full flex items-center justify-center gap-2 text-sm text-text-muted py-16">
      <Spinner size={14} />
      Loading…
    </div>
  );
}

function useLastSegment(): string | undefined {
  const [hash, setHash] = React.useState(() =>
    typeof window === "undefined" ? "" : window.location.hash.slice(1),
  );
  React.useEffect(() => {
    const on = () => setHash(window.location.hash.slice(1));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const parts = hash.replace(/^\/+/, "").split("/").filter(Boolean);
  return parts[parts.length - 1];
}
