import * as React from "react";
import * as Icons from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/admin-primitives/Card";
import { Badge } from "@/primitives/Badge";
import { Sparkline } from "@/admin-primitives/charts/Sparkline";
import { TimelineFeed } from "@/admin-primitives/TimelineFeed";
import { CustomFieldsSection } from "@/admin-primitives/CustomFieldsSection";
import { useAggregation } from "@/runtime/useAggregation";
import { useFieldMetadata } from "@/runtime/useFieldMetadata";
import type { AdminRegistry } from "@/shell/registry";
import type { DomainFieldConfig } from "./buildDomainPlugin";
import { renderValue } from "./renderValue";
import type { ActionDescriptor } from "@/contracts/actions";
import type { Intent } from "@/primitives/Badge";
import type { FilterTree } from "@/contracts/saved-views";
import { navigateTo } from "@/views/useRoute";
import { useRuntime } from "@/runtime/context";
import { getPath } from "@/lib/filterEngine";
import { cn } from "@/lib/cn";

/* ========================================================================== */
/* 1. Smart-section auto-grouping                                              */
/* ========================================================================== */

export interface SmartSection {
  id: string;
  title: string;
  icon: keyof typeof Icons;
  description?: string;
  fields: DomainFieldConfig[];
}

/** Classify fields into semantic groups. Unknown fields fall into "Details". */
export function groupFieldsSemantically(
  fields: readonly DomainFieldConfig[],
): SmartSection[] {
  const buckets: Record<string, DomainFieldConfig[]> = {
    identity: [],
    status: [],
    financial: [],
    temporal: [],
    relationships: [],
    categorization: [],
    contact: [],
    quantity: [],
    other: [],
  };

  for (const f of fields) {
    const bucket = classify(f);
    buckets[bucket].push(f);
  }

  const sections: SmartSection[] = [];
  const add = (
    id: string,
    title: string,
    icon: keyof typeof Icons,
    bucket: DomainFieldConfig[],
    description?: string,
  ) => {
    if (bucket.length > 0) {
      sections.push({ id, title, icon, description, fields: bucket });
    }
  };

  add("identity", "Identity", "IdCard", buckets.identity);
  add("status", "Status & progress", "Activity", buckets.status);
  add("financial", "Financial", "DollarSign", buckets.financial);
  add("quantity", "Quantities", "Hash", buckets.quantity);
  add("relationships", "Relationships", "Link2", buckets.relationships);
  add("contact", "Contact", "AtSign", buckets.contact);
  add("categorization", "Classification", "Tag", buckets.categorization);
  add("temporal", "Dates & timeline", "Calendar", buckets.temporal);
  add("other", "Details", "FileText", buckets.other);

  return sections;
}

const FINANCIAL_RE =
  /^(amount|revenue|cost|price|subtotal|total|tax|discount|balance|paid|due|outstanding|fee|fees|margin|profit|loss|gross|net|commission|bonus|budget|spend|limit|utilized|available|earnings|salary|wage|rate|hourlyRate|ytd|mtd|qtd|value|worth|billing|pay|payable|receivable|gap)/i;
const STATUS_RE =
  /^(status|stage|state|priority|severity|urgency|progress|progressPct|completionPct|health|risk|score|grade|rating|active|archived|published|confirmed|approved|rejected|won|lost|closed|open)/i;
const IDENTITY_RE = /^(id|code|sku|slug|name|title|label|subject|displayName|reference|externalId|key|handle|tag)/i;
const CONTACT_RE = /^(email|phone|mobile|fax|url|website|address|addr|street|city|country|state|zip|postal|timezone|language|locale)/i;
const RELATIONSHIP_RE =
  /^(customer|customerId|account|accountId|assignee|assigneeId|owner|ownerId|manager|managerId|partner|partnerId|technician|technicianId|staffId|author|authorId|createdBy|updatedBy|modifiedBy|reporter|reporterId|lead|leadId|contact|contactId|supplier|supplierId|vendor|vendorId|buyer|buyerId|client|clientId|organization|orgId|tenantId|workspaceId|parent|parentId|category|categoryId|group|groupId|team|teamId|project|projectId|deal|dealId|order|orderId|ticket|ticketId|invoice|invoiceId|product|productId|item|itemId|asset|assetId|location|locationId|site|siteId|warehouse|warehouseId|department|role|roles)/i;
const CATEGORIZATION_RE =
  /^(type|kind|category|tag|tags|label|labels|section|segment|channel|source|medium|industry|vertical)/i;
const TEMPORAL_RE =
  /(At$|Date$|^(from|to|until|since|start|end)|^created|^updated|^deleted|^published|^scheduled|^closed|^opened|^resolved|^completed|^cancelled|^delivered|^invoiced|^paid|^due|^expires|^expiry|^effective|^valid|^renewed|^started|^finished|time$|Time$|duration|timeline|timezone)/i;
const QUANTITY_RE =
  /^(qty|quantity|count|amount|hours|hrs|days|weeks|months|units|capacity|allocation|stock|inventory|onHand|reorder|reserved|available|members|headcount|size|volume|weight|distance|area)/i;

function classify(f: DomainFieldConfig): string {
  const name = f.name;
  const kind = f.kind;

  // Hard kind-based routing first
  if (kind === "currency") return "financial";
  if (kind === "email" || kind === "url" || kind === "phone") return "contact";
  if (kind === "date" || kind === "datetime") return "temporal";
  if (kind === "boolean") {
    if (STATUS_RE.test(name) || /^(is|has|can|should)/.test(name)) return "status";
    return "other";
  }
  if (kind === "enum") {
    if (STATUS_RE.test(name)) return "status";
    if (CATEGORIZATION_RE.test(name)) return "categorization";
    if (RELATIONSHIP_RE.test(name)) return "relationships";
    return "categorization";
  }
  // Name-based heuristics
  if (IDENTITY_RE.test(name)) return "identity";
  if (STATUS_RE.test(name)) return "status";
  if (TEMPORAL_RE.test(name)) return "temporal";
  if (FINANCIAL_RE.test(name) && (kind === "number" || kind === "text")) return "financial";
  if (QUANTITY_RE.test(name) && kind === "number") return "quantity";
  if (RELATIONSHIP_RE.test(name)) return "relationships";
  if (CONTACT_RE.test(name)) return "contact";
  if (CATEGORIZATION_RE.test(name)) return "categorization";
  return "other";
}

/* ========================================================================== */
/* 2. Overview rendered as smart sections                                      */
/* ========================================================================== */

export function OverviewSections({
  record,
  fields,
}: {
  record: Record<string, unknown>;
  fields: readonly DomainFieldConfig[];
}) {
  const sections = React.useMemo(() => groupFieldsSemantically(fields), [fields]);
  return (
    <div className="flex flex-col gap-3">
      {sections.map((s) => (
        <SectionCard key={s.id} section={s} record={record} />
      ))}
    </div>
  );
}

function SectionCard({
  section,
  record,
}: {
  section: SmartSection;
  record: Record<string, unknown>;
}) {
  const IconC = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    section.icon
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            {IconC && <IconC className="h-4 w-4 text-accent" />}
            {section.title}
          </span>
        </CardTitle>
        {section.description && (
          <CardDescription>{section.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          {section.fields.map((f) => (
            <FieldCell key={f.name} field={f} record={record} />
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function FieldCell({
  field,
  record,
}: {
  field: DomainFieldConfig;
  record: Record<string, unknown>;
}) {
  const value = getPath(record, field.name);
  return (
    <div className="flex flex-col min-w-0">
      <dt className="text-xs text-text-muted uppercase tracking-wider">
        {field.label ?? humanize(field.name)}
      </dt>
      <dd className="text-sm text-text-primary mt-0.5 break-words">
        {field.kind === "enum" && typeof value === "string"
          ? renderEnumBadge(field, value)
          : renderValue(value, field)}
      </dd>
    </div>
  );
}

function renderEnumBadge(field: DomainFieldConfig, v: string) {
  const opt = field.options?.find((o) => o.value === v);
  if (!opt) return v;
  return <Badge intent={(opt.intent as Intent | undefined) ?? "neutral"}>{opt.label}</Badge>;
}

/* ========================================================================== */
/* 3. BI panel — peer aggregations, age, trend                                 */
/* ========================================================================== */

export function BIPanel({
  resource,
  record,
  fields,
}: {
  resource: string;
  record: Record<string, unknown>;
  fields: readonly DomainFieldConfig[];
}) {
  const statusField = fields.find((f) => f.kind === "enum" && STATUS_RE.test(f.name));
  const statusValue = statusField ? record[statusField.name] : undefined;
  const moneyField = fields.find((f) => f.kind === "currency");

  // Age since createdAt (falls back to first date field).
  const createdAt =
    (record.createdAt as string | undefined) ||
    (record.created as string | undefined) ||
    (fields.find((f) => f.kind === "datetime") &&
      (record[
        fields.find((f) => f.kind === "datetime")!.name
      ] as string));
  const ageDays = createdAt
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000),
      )
    : null;

  const peerFilter: FilterTree | undefined = statusField && typeof statusValue === "string"
    ? { field: statusField.name, op: "eq", value: statusValue }
    : undefined;

  const peerCount = useAggregation({ resource, fn: "count", filter: peerFilter });
  const peerAvg = useAggregation(
    moneyField
      ? { resource, fn: "avg", field: moneyField.name, filter: peerFilter }
      : null,
  );
  const peerSum = useAggregation(
    moneyField
      ? { resource, fn: "sum", field: moneyField.name, filter: peerFilter }
      : null,
  );
  const trend = useAggregation({
    resource,
    fn: "count",
    period: "day",
    range: { kind: "last", days: 30 },
  });

  const stats: { label: string; value: React.ReactNode; helper?: string }[] = [];
  if (ageDays !== null) {
    stats.push({
      label: "Age",
      value: `${ageDays.toLocaleString()}d`,
      helper: createdAt ? new Date(createdAt).toLocaleDateString() : undefined,
    });
  }
  if (statusField && typeof statusValue === "string") {
    stats.push({
      label: `Peers in "${statusValue}"`,
      value: peerCount.data?.count?.toLocaleString() ?? "—",
    });
  } else {
    stats.push({
      label: "Total in resource",
      value: peerCount.data?.count?.toLocaleString() ?? "—",
    });
  }
  if (moneyField && peerAvg.data) {
    stats.push({
      label: `Peer avg ${moneyField.label ?? moneyField.name}`,
      value: peerAvg.data.value
        ? `$${Number(peerAvg.data.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
        : "—",
    });
  }
  if (moneyField && peerSum.data) {
    stats.push({
      label: `Peer total ${moneyField.label ?? moneyField.name}`,
      value: peerSum.data.value
        ? `$${Number(peerSum.data.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
        : "—",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <Icons.BarChart3 className="h-4 w-4 text-accent" />
              Peer stats
            </span>
          </CardTitle>
          <CardDescription>
            Comparing this record against the rest of the collection{statusField ? ` (same ${statusField.name})` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col">
                <div className="text-xs text-text-muted uppercase tracking-wider">
                  {s.label}
                </div>
                <div className="text-2xl font-semibold tabular-nums text-text-primary mt-0.5">
                  {s.value}
                </div>
                {s.helper && (
                  <div className="text-xs text-text-muted mt-0.5">{s.helper}</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {trend.data?.series && trend.data.series.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Icons.TrendingUp className="h-4 w-4 text-accent" />
                Volume trend (30d)
              </span>
            </CardTitle>
            <CardDescription>New records created per day.</CardDescription>
          </CardHeader>
          <CardContent>
            <Sparkline
              data={trend.data.series.map((s) => s.value)}
              height={48}
              color="rgb(var(--accent))"
            />
            <div className="mt-2 text-xs text-text-muted">
              Avg/day:{" "}
              {(
                trend.data.series.reduce((a, b) => a + b.value, 0) /
                trend.data.series.length
              ).toFixed(1)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ========================================================================== */
/* 4. Auto-discovered Connections tab                                          */
/* ========================================================================== */

/** Scan the registry for resources whose list-view columns reference this
 *  resource's id pattern (e.g. `customerId`, `customer_id`, `customer`). For
 *  each hit, render a "related records" card with a count + "view all" link. */
export function AutoConnectionsPanel({
  resource,
  recordId,
  registry,
  basePathMap,
}: {
  resource: string;
  recordId: string;
  registry: AdminRegistry;
  /** Map from resource id → list base path for deep-links. */
  basePathMap: Record<string, string>;
}) {
  const hits = React.useMemo(
    () => discoverBackReferences(resource, recordId, registry),
    [resource, recordId, registry],
  );

  if (hits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
          <CardDescription>No back-references detected.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {hits.map((h) => (
        <ConnectionCard
          key={`${h.resource}-${h.field}`}
          resource={h.resource}
          field={h.field}
          recordId={recordId}
          basePath={basePathMap[h.resource] ?? `/${h.resource.replace(".", "/")}`}
          label={h.label}
        />
      ))}
    </div>
  );
}

function ConnectionCard({
  resource,
  field,
  recordId,
  basePath,
  label,
}: {
  resource: string;
  field: string;
  recordId: string;
  basePath: string;
  label: string;
}) {
  const filter: FilterTree = { field, op: "eq", value: recordId };
  const count = useAggregation({ resource, fn: "count", filter });
  const href = `${basePath}?filter=${encodeURIComponent(JSON.stringify(filter))}`;

  return (
    <Card
      className="cursor-pointer hover:border-accent/40 transition-colors"
      onClick={() => navigateTo(href)}
    >
      <CardContent className="py-3 flex items-center gap-3">
        <Icons.Link2 className="h-4 w-4 text-accent" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary truncate">
            {label}
          </div>
          <div className="text-xs text-text-muted truncate">
            {resource} · {field}
          </div>
        </div>
        <div className="text-xl font-semibold tabular-nums text-text-primary">
          {count.loading && !count.data ? "…" : count.data?.count ?? 0}
        </div>
        <Icons.ArrowUpRight className="h-3.5 w-3.5 text-text-muted" />
      </CardContent>
    </Card>
  );
}

/** Scan every list view in the registry for a column whose name suggests it
 *  references the given resource, and return hits. Heuristic only — authors
 *  can still supply an explicit ConnectionDescriptor. */
function discoverBackReferences(
  resource: string,
  _recordId: string,
  registry: AdminRegistry,
): { resource: string; field: string; label: string }[] {
  // Examples:
  //   resource "crm.contact"  → look for `contactId` or `contact` on others
  //   resource "sales.deal"   → look for `dealId` or `deal`
  const tokens = resourceNameTokens(resource);
  const hits: { resource: string; field: string; label: string }[] = [];

  for (const view of Object.values(registry.views)) {
    if (view.type !== "list") continue;
    if (view.resource === resource) continue;
    for (const col of view.columns) {
      const fname = col.field;
      const matches = tokens.some(
        (t) =>
          fname === `${t}Id` ||
          fname === `${t}_id` ||
          fname === t ||
          fname.toLowerCase() === `${t}id`,
      );
      if (matches) {
        hits.push({
          resource: view.resource,
          field: fname,
          label: view.title,
        });
        break; // one hit per related view
      }
    }
  }
  return hits;
}

function resourceNameTokens(resource: string): string[] {
  // "crm.contact" → ["contact"]; "sales.sales-partner" → ["salesPartner", "partner"]
  const last = resource.split(".").pop() ?? resource;
  const camel = last.replace(/[-_](\w)/g, (_, c) => c.toUpperCase());
  const out = new Set<string>();
  out.add(camel);
  out.add(last.replace(/[-_]/g, ""));
  // Add singular "word" form of multi-word: "salesPartner" → "partner"
  const parts = camel.split(/(?=[A-Z])/).map((p) => p.toLowerCase());
  if (parts.length > 1) {
    out.add(parts[parts.length - 1]);
  }
  return [...out];
}

/* ========================================================================== */
/* 5. Actions panel — full list of resource actions + state-dependent steps    */
/* ========================================================================== */

export function ActionsPanel({
  actions,
  record,
  resource,
  onNavigateEdit,
}: {
  actions: readonly ActionDescriptor[];
  record: Record<string, unknown>;
  resource: string;
  onNavigateEdit: () => void;
}) {
  const runtime = useRuntime();
  const visible = actions.filter(
    (a) => !a.guard || a.guard({ records: [record], resource, runtime: runtime.actions }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Icons.Zap className="h-4 w-4 text-accent" />
            Actions
          </span>
        </CardTitle>
        <CardDescription>Every available action for this record.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border-subtle">
          <ActionRow
            label="Edit"
            description="Modify this record's fields"
            icon="Pencil"
            onClick={onNavigateEdit}
          />
          {visible.map((a) => (
            <ActionRow
              key={a.id}
              label={a.label}
              description={a.confirm?.description}
              icon={iconForAction(a)}
              intent={a.intent}
              onClick={async () => {
                if (a.confirm) {
                  const ok = await runtime.actions.confirm({
                    title: a.confirm.title,
                    description: a.confirm.description,
                    destructive: a.confirm.destructive,
                  });
                  if (!ok) return;
                }
                await a.run({
                  records: [record],
                  resource,
                  runtime: runtime.actions,
                });
              }}
            />
          ))}
          {visible.length === 0 && (
            <li className="px-3 py-3 text-xs text-text-muted">
              No resource-specific actions registered.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function ActionRow({
  label,
  description,
  icon,
  intent,
  onClick,
}: {
  label: string;
  description?: string;
  icon: keyof typeof Icons;
  intent?: string;
  onClick: () => void;
}) {
  const IconC = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    icon
  ];
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-1 text-left",
          intent === "danger" && "text-intent-danger hover:bg-intent-danger/10",
        )}
      >
        {IconC && <IconC className="h-3.5 w-3.5" />}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary truncate">
            {label}
          </div>
          {description && (
            <div className="text-xs text-text-muted truncate">{description}</div>
          )}
        </div>
        <Icons.ChevronRight className="h-3 w-3 text-text-muted" />
      </button>
    </li>
  );
}

function iconForAction(a: ActionDescriptor): keyof typeof Icons {
  const lower = a.label.toLowerCase();
  if (lower.includes("delete") || lower.includes("remove")) return "Trash2";
  if (lower.includes("duplicate") || lower.includes("copy")) return "Copy";
  if (lower.includes("send") || lower.includes("email")) return "Send";
  if (lower.includes("archive")) return "Archive";
  if (lower.includes("approve")) return "CheckCircle2";
  if (lower.includes("reject")) return "XCircle";
  if (lower.includes("cancel")) return "Ban";
  if (lower.includes("mark") || lower.includes("complete")) return "CheckCheck";
  if (lower.includes("export")) return "Download";
  if (lower.includes("print")) return "Printer";
  if (lower.includes("share")) return "Share2";
  if (lower.includes("convert")) return "Shuffle";
  if (lower.includes("new") || lower.includes("create")) return "Plus";
  return "Zap";
}

/* ========================================================================== */
/* 6. Related / Quick-actions rail cards                                       */
/* ========================================================================== */

/** Compact right-rail card that surfaces a single related resource count. */
export function RelatedRailCard({
  icon,
  label,
  resource,
  filter,
  href,
}: {
  icon: keyof typeof Icons;
  label: string;
  resource: string;
  filter: FilterTree;
  href: string;
}) {
  const { data, loading } = useAggregation({ resource, fn: "count", filter });
  const IconC = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    icon
  ];
  return (
    <Card
      className="cursor-pointer hover:border-accent/40 transition-colors"
      onClick={() => navigateTo(href)}
    >
      <CardContent className="py-3 flex items-center gap-2">
        {IconC && <IconC className="h-4 w-4 text-accent" />}
        <div className="flex-1 text-sm text-text-primary truncate">{label}</div>
        <div className="text-sm font-semibold tabular-nums text-text-primary">
          {loading && !data ? "…" : data?.count ?? 0}
        </div>
        <Icons.ChevronRight className="h-3 w-3 text-text-muted" />
      </CardContent>
    </Card>
  );
}

/* ========================================================================== */
/* Activity tab + rail (TimelineFeed)                                          */
/* ========================================================================== */

/** Full per-record activity timeline (used as the "Activity" tab body).
 *
 *  Wraps `<TimelineFeed />` — which reads `/api/timeline/<resource>/<id>` —
 *  in the standard Card chrome so it lines up visually with the other tab
 *  panels. */
export function ActivityTabPanel({
  resource,
  recordId,
}: {
  resource: string;
  recordId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>
          Every mutation, workflow transition, and comment on this record.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3">
        <TimelineFeed resource={resource} recordId={recordId} />
      </CardContent>
    </Card>
  );
}

/** Compact 10-event timeline shown in the right rail so users see recent
 *  activity without switching tabs. */
export function RecentActivityRailCard({
  resource,
  recordId,
}: {
  resource: string;
  recordId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <TimelineFeed resource={resource} recordId={recordId} compact />
      </CardContent>
    </Card>
  );
}

/* ========================================================================== */
/* Custom-fields rail (inline-editable)                                        */
/* ========================================================================== */

/** Right-rail card showing the workspace's custom fields for the resource,
 *  inline-editable with optimistic write-through. PATCH the record via
 *  `runtime.resources.update` on every change; on failure roll back to the
 *  previous value and toast the error.
 *
 *  Returns null when the resource has zero custom fields so the card never
 *  shows up empty. */
export function CustomFieldsRailCard({
  resource,
  recordId,
  record,
  editable,
}: {
  resource: string;
  recordId: string;
  record: Record<string, unknown>;
  editable: boolean;
}) {
  const runtime = useRuntime();
  const { fields, loading } = useFieldMetadata(resource);

  // Local override map — lets us optimistically reflect a pending write
  // even before the underlying record refetches. Cleared per record.
  const [overrides, setOverrides] = React.useState<Record<string, unknown>>({});
  React.useEffect(() => {
    setOverrides({});
  }, [recordId, resource]);

  if (loading) return null;
  if (fields.length === 0) return null;

  const values: Record<string, unknown> = { ...record, ...overrides };

  const onChange = async (key: string, next: unknown): Promise<void> => {
    if (!editable) return;
    const prev = (record as Record<string, unknown>)[key];
    // Optimistic: surface the new value immediately.
    setOverrides((o) => ({ ...o, [key]: next }));
    try {
      await runtime.resources.update(resource, recordId, { [key]: next });
      // Cache invalidation inside ResourceClient.update will trigger a
      // refetch of the record; once that completes we can drop our
      // override (the canonical value lives on `record` again).
      setOverrides((o) => {
        const { [key]: _drop, ...rest } = o;
        return rest;
      });
    } catch (err) {
      // Rollback to the previous value.
      setOverrides((o) => ({ ...o, [key]: prev }));
      // Then drop the override one tick later so the next render reads
      // straight from the canonical record again.
      queueMicrotask(() => {
        setOverrides((o) => {
          const { [key]: _drop, ...rest } = o;
          return rest;
        });
      });
      runtime.actions.toast({
        title: "Couldn't save",
        description: err instanceof Error ? err.message : String(err),
        intent: "danger",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom fields</CardTitle>
        <CardDescription>
          Workspace-defined fields. Manage them in Settings → Custom fields.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CustomFieldsSection
          resource={resource}
          values={values}
          onChange={onChange}
          title=""
          readOnly={!editable}
          compact
        />
      </CardContent>
    </Card>
  );
}

/* ========================================================================== */
/* Helpers                                                                     */
/* ========================================================================== */

function humanize(s: string): string {
  return s
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .trim();
}
