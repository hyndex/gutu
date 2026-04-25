/** Workflow detail / edit page.
 *
 *  Three tabs:
 *    1. Builder — graph editor on top of @/admin-primitives/WorkflowCanvas.
 *       Add nodes from a floating "Add step" menu, click to inspect, edit
 *       params in the right-rail panel. Save patches the definition JSON.
 *    2. Runs — paginated list of workflow_runs. Click a row → drawer with
 *       full payload + per-node output + error.
 *    3. Settings — name / description / status + trigger-kind-specific
 *       config editor.
 *
 *  Top action: "Run now" button (modal with JSON payload textarea →
 *  POST /:id/run, shows result inline).
 *
 *  Routing: this page is mounted as a CustomView under /settings/workflows
 *  in the admin-tools plugin. The custom view inspects the hash to decide
 *  whether to render the LIST or the DETAIL — when the hash matches
 *  `/settings/workflows/<id>`, we render this component.  */

import * as React from "react";
import {
  ArrowLeft,
  Plus,
  Play,
  Save,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  GitBranch,
  Webhook as WebhookIcon,
  Bell,
  Sparkles,
  Code,
  Mail,
  Database,
  Globe,
  Repeat,
  ChevronRight,
  Workflow as WorkflowIcon,
  ClipboardCopy,
} from "lucide-react";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/admin-primitives/Card";
import { StatusDot } from "@/admin-primitives/StatusDot";
import { EmptyStateFramework } from "@/admin-primitives/EmptyStateFramework";
import { ErrorRecoveryFramework } from "@/admin-primitives/ErrorRecoveryFramework";
import {
  WorkflowCanvas,
  type WorkflowNode as CanvasNode,
  type WorkflowEdge as CanvasEdge,
  type WorkflowNodeKind,
} from "@/admin-primitives/WorkflowCanvas";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/primitives/Tabs";
import { Button } from "@/primitives/Button";
import { Badge } from "@/primitives/Badge";
import { Input } from "@/primitives/Input";
import { Label } from "@/primitives/Label";
import { Textarea } from "@/primitives/Textarea";
import { Checkbox } from "@/primitives/Checkbox";
import { Dialog, DialogContent } from "@/primitives/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/primitives/Select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/primitives/DropdownMenu";
import { apiFetch } from "@/runtime/auth";
import { useRuntime } from "@/runtime/context";
import { useHash, navigateTo } from "@/views/useRoute";
import { formatRelative } from "@/lib/format";
import type {
  WorkflowDefinition,
  WorkflowGraphNode,
  WorkflowStatus,
  WorkflowTrigger,
  WorkflowRunStatus,
  WorkflowActionType,
  CronTrigger,
  DatabaseEventTrigger,
  ManualTrigger,
  WebhookTrigger,
} from "./types";

/* ───────────── API shapes ────────────── */

interface WorkflowRowApi {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  definition: WorkflowDefinition;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  role?: string;
}

interface RunListRow {
  id: string;
  workflowId: string;
  status: WorkflowRunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  error: string | null;
}

interface RunDetailApi extends RunListRow {
  triggerPayload: unknown;
  output: Record<string, unknown> | null;
}

/* ───────────── action catalog (the "Add step" menu) ─────────── */

interface ActionCatalogEntry {
  type: WorkflowActionType;
  /** Visual category — matches WorkflowCanvas node kinds. */
  kind: WorkflowNodeKind;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Default params to seed when this node is inserted. */
  defaults: () => Record<string, unknown>;
}

const ACTION_CATALOG: readonly ActionCatalogEntry[] = [
  {
    type: "record.create",
    kind: "action",
    label: "Create record",
    description: "Insert a new row on a resource.",
    icon: Database,
    defaults: () => ({ resource: "", data: {} }),
  },
  {
    type: "record.update",
    kind: "action",
    label: "Update record",
    description: "Patch a record by id.",
    icon: Database,
    defaults: () => ({ resource: "", id: "", patch: {} }),
  },
  {
    type: "record.delete",
    kind: "action",
    label: "Delete record",
    description: "Remove a record by id.",
    icon: Database,
    defaults: () => ({ resource: "", id: "" }),
  },
  {
    type: "record.find",
    kind: "action",
    label: "Find record",
    description: "Look up a record and place it on the variables bag.",
    icon: Database,
    defaults: () => ({ resource: "", id: "" }),
  },
  {
    type: "http.request",
    kind: "action",
    label: "HTTP request",
    description: "Fetch any URL with optional body and headers.",
    icon: Globe,
    defaults: () => ({ url: "https://", method: "GET", timeoutMs: 15000 }),
  },
  {
    type: "mail.send",
    kind: "notification",
    label: "Send email",
    description: "Send through the configured mail relay.",
    icon: Mail,
    defaults: () => ({ to: "", subject: "", body: "", format: "text" }),
  },
  {
    type: "webhook.outbound",
    kind: "webhook",
    label: "Outbound webhook",
    description: "POST a payload to a configured webhook or URL.",
    icon: WebhookIcon,
    defaults: () => ({ url: "https://", payload: {} }),
  },
  {
    type: "delay",
    kind: "delay",
    label: "Delay",
    description: "Wait N milliseconds before the next step.",
    icon: Clock,
    defaults: () => ({ ms: 1000 }),
  },
  {
    type: "if-else",
    kind: "condition",
    label: "If / else",
    description: "Branch on a comparison against a variable path.",
    icon: GitBranch,
    defaults: () => ({ path: "trigger.record.status", op: "eq", value: "" }),
  },
  {
    type: "iterator",
    kind: "action",
    label: "Iterator",
    description: "Loop a sub-graph over an array on the variables bag.",
    icon: Repeat,
    defaults: () => ({ path: "trigger.records", itemVar: "item", maxIterations: 100 }),
  },
  {
    type: "code",
    kind: "ai",
    label: "Code",
    description: "Run a JavaScript snippet with the variables bag in scope.",
    icon: Code,
    defaults: () => ({ source: "// vars.* available\nreturn 42;", timeoutMs: 5000 }),
  },
  {
    type: "log",
    kind: "notification",
    label: "Log",
    description: "Append a templated message to the run log.",
    icon: Bell,
    defaults: () => ({ message: "", level: "info" }),
  },
];

/* ───────────── helpers ────────────── */

const STATUS_OPTIONS: ReadonlyArray<{
  value: WorkflowStatus;
  label: string;
  intent: "success" | "warning" | "neutral" | "info";
}> = [
  { value: "draft", label: "Draft", intent: "info" },
  { value: "active", label: "Active", intent: "success" },
  { value: "paused", label: "Paused", intent: "warning" },
  { value: "archived", label: "Archived", intent: "neutral" },
];

function statusIntent(status: WorkflowStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.intent ?? "neutral";
}

function runStatusIntent(
  s: WorkflowRunStatus,
): "success" | "danger" | "info" | "warning" | "neutral" {
  switch (s) {
    case "success":
      return "success";
    case "failure":
      return "danger";
    case "running":
      return "info";
    case "pending":
      return "warning";
    case "skipped":
    default:
      return "neutral";
  }
}

function actionEntry(t: WorkflowActionType): ActionCatalogEntry | undefined {
  return ACTION_CATALOG.find((a) => a.type === t);
}

function triggerKindIcon(kind: WorkflowTrigger["kind"]): React.ReactNode {
  switch (kind) {
    case "manual":
      return <Play className="h-3 w-3" />;
    case "database-event":
      return <Database className="h-3 w-3" />;
    case "cron":
      return <Clock className="h-3 w-3" />;
    case "webhook":
      return <WebhookIcon className="h-3 w-3" />;
  }
}

/* ───────────── canvas ↔ definition bridge ────────────── */

/** Convert the persisted definition into the canvas's typed shape. We
 *  also synthesize a "trigger" canvas node anchored to a synthetic
 *  `start` id so users always see the entry point; canvas edges from
 *  `start` correspond to the persisted `start` edges. */
function definitionToCanvas(def: WorkflowDefinition): {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
} {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];

  // Trigger anchor.
  nodes.push({
    id: "start",
    type: "trigger",
    position: { x: 40, y: 40 },
    data: {
      kind: "trigger",
      label: triggerLabel(def.trigger),
      description: triggerSubtitle(def.trigger),
    },
  });

  // Action nodes.
  def.nodes.forEach((n, i) => {
    const entry = actionEntry(n.type);
    nodes.push({
      id: n.id,
      type: entry?.kind ?? "action",
      position: {
        x: 40 + (i % 3) * 240,
        y: 180 + Math.floor(i / 3) * 140,
      },
      data: {
        kind: entry?.kind ?? "action",
        label: n.label || entry?.label || n.type,
        description: shortParamsDescription(n),
        payload: { actionType: n.type, params: n.params, label: n.label },
      },
    });
  });

  // Edges.
  def.edges.forEach((e, i) => {
    edges.push({
      id: e.id ?? `e_${i}`,
      source: e.from,
      target: e.to,
      sourceHandle: e.branch === "true" ? "yes" : e.branch === "false" ? "no" : undefined,
      label: e.branch && e.branch !== "default" ? e.branch : undefined,
    });
  });

  return { nodes, edges };
}

function triggerLabel(t: WorkflowTrigger): string {
  switch (t.kind) {
    case "manual":
      return "Manual trigger";
    case "database-event":
      return "Database event";
    case "cron":
      return "Schedule";
    case "webhook":
      return "Webhook";
  }
}

function triggerSubtitle(t: WorkflowTrigger): string {
  switch (t.kind) {
    case "manual":
      return t.availability ?? "global";
    case "database-event":
      return `${t.resource} · ${t.on.join(", ")}`;
    case "cron":
      return t.cron ?? (t.intervalMs ? `every ${t.intervalMs}ms` : "");
    case "webhook":
      return t.apiKey ? "key required" : "open ingest";
  }
}

function shortParamsDescription(n: WorkflowGraphNode): string {
  const p = n.params ?? {};
  switch (n.type) {
    case "record.create":
    case "record.update":
    case "record.delete":
    case "record.find":
      return String((p as { resource?: string }).resource ?? "");
    case "http.request":
      return `${(p as { method?: string }).method ?? "GET"} ${(p as { url?: string }).url ?? ""}`;
    case "mail.send":
      return `to ${(p as { to?: string | string[] }).to ?? ""}`;
    case "webhook.outbound":
      return String((p as { url?: string; webhookId?: string }).url ?? (p as { webhookId?: string }).webhookId ?? "");
    case "delay":
      return `${(p as { ms?: number }).ms ?? 0}ms`;
    case "if-else":
      return `${(p as { path?: string }).path ?? ""} ${(p as { op?: string }).op ?? ""}`;
    case "iterator":
      return String((p as { path?: string }).path ?? "");
    case "code":
      return "JS snippet";
    case "log":
      return String((p as { message?: string }).message ?? "");
    default:
      return "";
  }
}

/* ───────────── component ────────────── */

interface DetailHashState {
  workflowId: string | null;
  tab: "builder" | "runs" | "settings";
}

/** Resolve the workflow id and active tab from the hash. The hash format is
 *    /settings/workflows/<id>?tab=builder
 *  (the optional ?tab= query lets users deep-link to a tab; default is
 *  "builder"). When the id segment is missing or the path is /settings/
 *  workflows itself, we return `workflowId: null`. */
function parseDetailHash(hash: string): DetailHashState {
  const cleanedFull = hash.replace(/^#/, "");
  const [pathPart, queryPart] = cleanedFull.split("?");
  const cleaned = pathPart.replace(/\/+$/, "");
  const m = cleaned.match(/^\/settings\/workflows\/([^/]+)/);
  const id = m?.[1] ?? null;
  const params = new URLSearchParams(queryPart ?? "");
  const tabParam = params.get("tab");
  const tab: DetailHashState["tab"] =
    tabParam === "runs" || tabParam === "settings" ? tabParam : "builder";
  return { workflowId: id, tab };
}

export function WorkflowDetailPage() {
  const runtime = useRuntime();
  const hash = useHash();
  const { workflowId, tab } = parseDetailHash(hash);

  const [wf, setWf] = React.useState<WorkflowRowApi | null>(null);
  const [loadError, setLoadError] = React.useState<Error | null>(null);
  const [draft, setDraft] = React.useState<WorkflowDefinition | null>(null);
  const [draftMeta, setDraftMeta] = React.useState<{
    name: string;
    description: string;
    status: WorkflowStatus;
  } | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [runDialogOpen, setRunDialogOpen] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!workflowId) return;
    try {
      const out = await apiFetch<WorkflowRowApi>(`/workflows/${workflowId}`);
      setWf(out);
      setDraft(out.definition);
      setDraftMeta({
        name: out.name,
        description: out.description ?? "",
        status: out.status,
      });
      setDirty(false);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [workflowId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  /* ─── persistence ─── */

  const save = React.useCallback(async () => {
    if (!wf || !draft || !draftMeta) return;
    setSaving(true);
    try {
      const out = await apiFetch<WorkflowRowApi>(`/workflows/${wf.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: draftMeta.name,
          description: draftMeta.description || null,
          status: draftMeta.status,
          definition: draft,
        }),
      });
      setWf(out);
      setDirty(false);
      runtime.actions.toast({ title: "Saved", intent: "success" });
    } catch (err) {
      runtime.actions.toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : undefined,
        intent: "danger",
      });
    } finally {
      setSaving(false);
    }
  }, [wf, draft, draftMeta, runtime]);

  /* ─── defs change handlers ─── */

  const updateNodeParams = React.useCallback(
    (id: string, patch: Partial<WorkflowGraphNode>) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        next.nodes = prev.nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                ...(patch.label !== undefined ? { label: patch.label } : {}),
                ...(patch.params !== undefined ? { params: patch.params } : {}),
              }
            : n,
        );
        return next;
      });
      setDirty(true);
    },
    [],
  );

  const removeNode = React.useCallback((id: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== id),
        edges: prev.edges.filter((e) => e.from !== id && e.to !== id),
      };
    });
    setDirty(true);
  }, []);

  const addNode = React.useCallback((entry: ActionCatalogEntry) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const newId = `n_${Math.random().toString(36).slice(2, 9)}`;
      const newNode: WorkflowGraphNode = {
        id: newId,
        type: entry.type,
        label: entry.label,
        params: entry.defaults(),
      };
      const lastId = prev.nodes.at(-1)?.id ?? "start";
      return {
        ...prev,
        nodes: [...prev.nodes, newNode],
        edges: [...prev.edges, { from: lastId, to: newId }],
      };
    });
    setDirty(true);
  }, []);

  const updateTrigger = React.useCallback((next: WorkflowTrigger) => {
    setDraft((prev) => (prev ? { ...prev, trigger: next } : prev));
    setDirty(true);
  }, []);

  const updateMeta = React.useCallback(
    (patch: Partial<{ name: string; description: string; status: WorkflowStatus }>) => {
      setDraftMeta((prev) => (prev ? { ...prev, ...patch } : prev));
      setDirty(true);
    },
    [],
  );

  /* ─── tab navigation ─── */

  const setTab = (next: DetailHashState["tab"]) => {
    if (!workflowId) return;
    navigateTo(`/settings/workflows/${workflowId}?tab=${next}`);
  };

  /* ─── loading / error / not-found ─── */

  if (!workflowId) {
    return (
      <EmptyStateFramework
        kind="no-results"
        title="No workflow selected"
        description="Pick a workflow from the list."
        primary={{ label: "Workflows", href: "/settings/workflows" }}
      />
    );
  }

  if (loadError) {
    return (
      <ErrorRecoveryFramework
        message={loadError.message}
        onRetry={() => void refresh()}
      />
    );
  }

  if (!wf || !draft || !draftMeta) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-xs text-text-muted">
          Loading workflow…
        </CardContent>
      </Card>
    );
  }

  /* ─── render ─── */

  const triggerKind = draft.trigger.kind;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <WorkflowIcon className="h-4 w-4 text-text-muted" />
            {draftMeta.name}
            {dirty && (
              <Badge intent="warning" className="ml-1">
                unsaved
              </Badge>
            )}
          </span>
        }
        description={
          <span className="flex items-center gap-2 text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <StatusDot intent={statusIntent(draftMeta.status)} />
              <span className="capitalize">{draftMeta.status}</span>
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              {triggerKindIcon(triggerKind)}
              <span>{triggerLabel(draft.trigger)}</span>
            </span>
            <span>·</span>
            <span>v{wf.version}</span>
          </span>
        }
        breadcrumbs={
          <button
            type="button"
            onClick={() => navigateTo("/settings/workflows")}
            className="self-start inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            All workflows
          </button>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Play className="h-3.5 w-3.5" />}
              onClick={() => setRunDialogOpen(true)}
              loading={running}
            >
              Run now
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Save className="h-3.5 w-3.5" />}
              onClick={() => void save()}
              disabled={!dirty}
              loading={saving}
            >
              Save
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as DetailHashState["tab"])}>
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <BuilderTab
            definition={draft}
            onAddNode={addNode}
            onUpdateNodeParams={updateNodeParams}
            onRemoveNode={removeNode}
          />
        </TabsContent>

        <TabsContent value="runs">
          <RunsTab workflowId={wf.id} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab
            wf={wf}
            meta={draftMeta}
            trigger={draft.trigger}
            onMetaChange={updateMeta}
            onTriggerChange={updateTrigger}
          />
        </TabsContent>
      </Tabs>

      <RunNowDialog
        open={runDialogOpen}
        onOpenChange={setRunDialogOpen}
        workflowId={wf.id}
        onRunStart={() => setRunning(true)}
        onRunDone={() => setRunning(false)}
      />
    </div>
  );
}

/* ───────────── Builder tab ────────────── */

function BuilderTab({
  definition,
  onAddNode,
  onUpdateNodeParams,
  onRemoveNode,
}: {
  definition: WorkflowDefinition;
  onAddNode: (entry: ActionCatalogEntry) => void;
  onUpdateNodeParams: (id: string, patch: Partial<WorkflowGraphNode>) => void;
  onRemoveNode: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Recompute canvas state whenever the persisted definition changes.
  const { nodes: canvasNodes, edges: canvasEdges } = React.useMemo(
    () => definitionToCanvas(definition),
    [definition],
  );

  const selected =
    selectedId && selectedId !== "start"
      ? definition.nodes.find((n) => n.id === selectedId) ?? null
      : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      <div className="relative">
        <Card>
          <CardContent className="p-0">
            <WorkflowCanvas
              nodes={canvasNodes}
              edges={canvasEdges}
              onNodeOpen={(n) => setSelectedId(String(n.id))}
              height={560}
            />
          </CardContent>
        </Card>

        {/* Floating "Add step" menu — bottom-right of the canvas. */}
        <div className="absolute bottom-4 right-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Plus className="h-3.5 w-3.5" />}
              >
                Add step
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Insert action</DropdownMenuLabel>
              {ACTION_CATALOG.map((entry) => {
                const Icon = entry.icon;
                return (
                  <DropdownMenuItem
                    key={entry.type}
                    onClick={() => onAddNode(entry)}
                  >
                    <Icon className="h-3.5 w-3.5 text-text-muted" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-text-primary">
                        {entry.label}
                      </span>
                      <span className="text-xs text-text-muted truncate">
                        {entry.description}
                      </span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>
              {selected ? selected.label || actionEntry(selected.type)?.label : "Step inspector"}
            </CardTitle>
            {selected && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  onRemoveNode(selected.id);
                  setSelectedId(null);
                }}
                aria-label="Remove step"
              >
                <Trash2 className="h-4 w-4 text-intent-danger" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="py-6 text-center">
                <Sparkles className="h-5 w-5 text-text-muted mx-auto" />
                <p className="text-xs text-text-muted mt-2">
                  Click a node on the canvas to inspect it. Add new steps from
                  the floating button on the bottom right.
                </p>
              </div>
            ) : (
              <NodeConfigEditor
                node={selected}
                onChange={(patch) => onUpdateNodeParams(selected.id, patch)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ───────────── per-node config editor ────────────── */

function NodeConfigEditor({
  node,
  onChange,
}: {
  node: WorkflowGraphNode;
  onChange: (patch: Partial<WorkflowGraphNode>) => void;
}) {
  const setParam = (key: string, value: unknown) => {
    onChange({ params: { ...node.params, [key]: value } });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="node-label">Label</Label>
        <Input
          id="node-label"
          value={String(node.label ?? "")}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Type</Label>
        <div className="text-xs font-mono text-text-secondary">{node.type}</div>
      </div>

      {/* Per-action-type form. We keep the editor simple: text fields for
       *  primitives, a JSON textarea for structured payloads. The engine
       *  validates server-side at run time. */}
      {node.type === "record.create" && (
        <>
          <ParamText label="Resource" value={pStr(node.params.resource)} onChange={(v) => setParam("resource", v)} placeholder="crm.contact" />
          <ParamJson label="Data (JSON)" value={node.params.data} onChange={(v) => setParam("data", v)} />
        </>
      )}
      {(node.type === "record.update" || node.type === "record.find") && (
        <>
          <ParamText label="Resource" value={pStr(node.params.resource)} onChange={(v) => setParam("resource", v)} placeholder="crm.contact" />
          <ParamText label="Record id" value={pStr(node.params.id)} onChange={(v) => setParam("id", v)} placeholder="{{ trigger.record.id }}" />
          {node.type === "record.update" && (
            <ParamJson label="Patch (JSON)" value={node.params.patch} onChange={(v) => setParam("patch", v)} />
          )}
        </>
      )}
      {node.type === "record.delete" && (
        <>
          <ParamText label="Resource" value={pStr(node.params.resource)} onChange={(v) => setParam("resource", v)} placeholder="crm.contact" />
          <ParamText label="Record id" value={pStr(node.params.id)} onChange={(v) => setParam("id", v)} />
        </>
      )}
      {node.type === "http.request" && (
        <>
          <ParamText label="URL" value={pStr(node.params.url)} onChange={(v) => setParam("url", v)} />
          <div className="flex flex-col gap-1">
            <Label>Method</Label>
            <Select
              value={pStr(node.params.method) || "GET"}
              onValueChange={(v) => setParam("method", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["GET", "POST", "PUT", "PATCH", "DELETE"] as const).map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ParamJson label="Headers (JSON)" value={node.params.headers} onChange={(v) => setParam("headers", v)} />
          <ParamJson label="Body" value={node.params.body} onChange={(v) => setParam("body", v)} />
        </>
      )}
      {node.type === "mail.send" && (
        <>
          <ParamText label="To" value={pStr(node.params.to)} onChange={(v) => setParam("to", v)} />
          <ParamText label="Subject" value={pStr(node.params.subject)} onChange={(v) => setParam("subject", v)} />
          <div className="flex flex-col gap-1">
            <Label>Body</Label>
            <Textarea
              rows={5}
              value={pStr(node.params.body)}
              onChange={(e) => setParam("body", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Format</Label>
            <Select
              value={pStr(node.params.format) || "text"}
              onValueChange={(v) => setParam("format", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Plain text</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      {node.type === "webhook.outbound" && (
        <>
          <ParamText label="Webhook id (optional)" value={pStr(node.params.webhookId)} onChange={(v) => setParam("webhookId", v)} />
          <ParamText label="URL (or use webhook id)" value={pStr(node.params.url)} onChange={(v) => setParam("url", v)} />
          <ParamText label="Event type" value={pStr(node.params.eventType)} onChange={(v) => setParam("eventType", v)} placeholder="opportunity.created" />
          <ParamJson label="Payload" value={node.params.payload} onChange={(v) => setParam("payload", v)} />
        </>
      )}
      {node.type === "delay" && (
        <ParamNumber label="Milliseconds" value={pNum(node.params.ms)} onChange={(v) => setParam("ms", v)} />
      )}
      {node.type === "if-else" && (
        <>
          <ParamText label="Path" value={pStr(node.params.path)} onChange={(v) => setParam("path", v)} placeholder="trigger.record.status" />
          <div className="flex flex-col gap-1">
            <Label>Operator</Label>
            <Select
              value={pStr(node.params.op) || "eq"}
              onValueChange={(v) => setParam("op", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["eq", "neq", "gt", "lt", "gte", "lte", "contains", "exists"] as const).map(
                  (o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <ParamText label="Value" value={pStr(node.params.value)} onChange={(v) => setParam("value", v)} />
        </>
      )}
      {node.type === "iterator" && (
        <>
          <ParamText label="Array path" value={pStr(node.params.path)} onChange={(v) => setParam("path", v)} placeholder="trigger.records" />
          <ParamText label="Item variable" value={pStr(node.params.itemVar) || "item"} onChange={(v) => setParam("itemVar", v)} />
          <ParamNumber label="Max iterations" value={pNum(node.params.maxIterations) ?? 100} onChange={(v) => setParam("maxIterations", v)} />
        </>
      )}
      {node.type === "code" && (
        <>
          <div className="flex flex-col gap-1">
            <Label>Source</Label>
            <Textarea
              rows={8}
              className="font-mono text-xs"
              value={pStr(node.params.source)}
              onChange={(e) => setParam("source", e.target.value)}
            />
          </div>
          <ParamNumber label="Timeout (ms)" value={pNum(node.params.timeoutMs) ?? 5000} onChange={(v) => setParam("timeoutMs", v)} />
        </>
      )}
      {node.type === "log" && (
        <>
          <ParamText label="Message" value={pStr(node.params.message)} onChange={(v) => setParam("message", v)} />
          <div className="flex flex-col gap-1">
            <Label>Level</Label>
            <Select
              value={pStr(node.params.level) || "info"}
              onValueChange={(v) => setParam("level", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}

function ParamText({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ParamNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

function ParamJson({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const [text, setText] = React.useState<string>(() => safeStringify(value));
  const [err, setErr] = React.useState<string | null>(null);
  // Keep local text in sync when the upstream value changes — only
  // when it really differs to avoid clobbering active edits.
  React.useEffect(() => {
    setText((prev) => {
      const formatted = safeStringify(value);
      try {
        if (JSON.stringify(JSON.parse(prev)) === JSON.stringify(value)) return prev;
      } catch {
        /* fall through — adopt formatted */
      }
      return formatted;
    });
  }, [value]);

  const commit = (next: string) => {
    setText(next);
    try {
      const parsed = next.trim() === "" ? {} : JSON.parse(next);
      onChange(parsed);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Textarea
        rows={4}
        className="font-mono text-xs"
        value={text}
        onChange={(e) => commit(e.target.value)}
        invalid={!!err}
      />
      {err && <span className="text-xs text-intent-danger">{err}</span>}
    </div>
  );
}

function safeStringify(v: unknown): string {
  if (v === undefined || v === null) return "{}";
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return "{}";
  }
}

function pStr(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(", ");
  return typeof v === "string" ? v : String(v);
}

function pNum(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

/* ───────────── Runs tab ────────────── */

function RunsTab({ workflowId }: { workflowId: string }) {
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(25);
  const [data, setData] = React.useState<{ rows: RunListRow[]; total: number } | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [openRunId, setOpenRunId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const out = await apiFetch<{ rows: RunListRow[]; total: number }>(
        `/workflows/${workflowId}/runs?page=${page}&pageSize=${pageSize}`,
      );
      setData(out);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [workflowId, page, pageSize]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error) {
    return (
      <ErrorRecoveryFramework message={error.message} onRetry={() => void refresh()} />
    );
  }
  if (!data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-xs text-text-muted">
          Loading runs…
        </CardContent>
      </Card>
    );
  }
  if (data.rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <EmptyStateFramework
            kind="cleared"
            title="No runs yet"
            description="Use the Run now button to fire this workflow on demand, or wait for the trigger."
          />
        </CardContent>
      </Card>
    );
  }

  const pages = Math.max(1, Math.ceil(data.total / pageSize));

  return (
    <>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-text-muted">
                <th className="text-left p-3">Started</th>
                <th className="text-left p-3">Duration</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Error</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border-subtle last:border-b-0 hover:bg-surface-1 cursor-pointer"
                  onClick={() => setOpenRunId(r.id)}
                >
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="text-text-primary">
                        {new Date(r.startedAt).toLocaleString()}
                      </span>
                      <span className="text-xs text-text-muted">
                        {formatRelative(r.startedAt)}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-text-secondary font-mono">
                    {r.durationMs == null ? "—" : `${r.durationMs}ms`}
                  </td>
                  <td className="p-3">
                    <Badge intent={runStatusIntent(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="p-3 text-xs text-intent-danger truncate max-w-md">
                    {r.error ?? ""}
                  </td>
                  <td className="p-3 text-right">
                    <ChevronRight className="h-4 w-4 text-text-muted inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            {data.total} runs · page {page} of {pages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <RunDetailDrawer
        workflowId={workflowId}
        runId={openRunId}
        onClose={() => setOpenRunId(null)}
      />
    </>
  );
}

function RunDetailDrawer({
  workflowId,
  runId,
  onClose,
}: {
  workflowId: string;
  runId: string | null;
  onClose: () => void;
}) {
  const [run, setRun] = React.useState<RunDetailApi | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!runId) {
      setRun(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const out = await apiFetch<RunDetailApi>(
          `/workflows/${workflowId}/runs/${runId}`,
        );
        if (!cancelled) {
          setRun(out);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workflowId, runId]);

  return (
    <Dialog open={!!runId} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent size="lg" className="max-h-[80vh] overflow-hidden flex flex-col p-0">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-text-primary">Run detail</div>
            {run && (
              <div className="text-xs text-text-muted mt-0.5 font-mono">
                {run.id}
              </div>
            )}
          </div>
          {run && (
            <div className="flex items-center gap-2">
              <Badge intent={runStatusIntent(run.status)}>{run.status}</Badge>
              <span className="text-xs text-text-muted">
                {run.durationMs == null ? "—" : `${run.durationMs}ms`}
              </span>
            </div>
          )}
        </div>
        <div className="overflow-y-auto p-5 flex flex-col gap-4">
          {error ? (
            <ErrorRecoveryFramework message={error.message} />
          ) : !run ? (
            <div className="text-xs text-text-muted">Loading…</div>
          ) : (
            <>
              {run.error && (
                <div className="rounded-md border border-intent-danger/30 bg-intent-danger-bg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-intent-danger mt-0.5" />
                  <div className="flex flex-col">
                    <div className="text-xs font-semibold text-intent-danger">Error</div>
                    <div className="text-xs text-text-primary mt-1 font-mono whitespace-pre-wrap">
                      {run.error}
                    </div>
                  </div>
                </div>
              )}

              <Section title="Trigger payload">
                <JsonView value={run.triggerPayload} />
              </Section>

              <Section title="Per-node output">
                {run.output && Object.keys(run.output).length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {Object.entries(run.output).map(([nodeId, value]) => (
                      <div
                        key={nodeId}
                        className="rounded-md border border-border bg-surface-0 p-2"
                      >
                        <div className="text-xs font-mono text-text-secondary mb-1 flex items-center gap-1.5">
                          {((value as { ok?: boolean })?.ok ?? true) ? (
                            <CheckCircle2 className="h-3 w-3 text-intent-success" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-intent-danger" />
                          )}
                          {nodeId}
                        </div>
                        <JsonView value={value} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-text-muted">No output recorded.</div>
                )}
              </Section>

              <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border">
                <span>Started {new Date(run.startedAt).toLocaleString()}</span>
                <span>
                  {run.finishedAt
                    ? `Finished ${new Date(run.finishedAt).toLocaleString()}`
                    : "In progress"}
                </span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        {title}
      </div>
      {children}
    </div>
  );
}

function JsonView({ value }: { value: unknown }) {
  const text = React.useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);
  return (
    <pre className="rounded-md bg-surface-1 border border-border-subtle p-2 text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre-wrap">
      {text || "—"}
    </pre>
  );
}

/* ───────────── Settings tab ────────────── */

function SettingsTab({
  wf,
  meta,
  trigger,
  onMetaChange,
  onTriggerChange,
}: {
  wf: WorkflowRowApi;
  meta: { name: string; description: string; status: WorkflowStatus };
  trigger: WorkflowTrigger;
  onMetaChange: (
    patch: Partial<{ name: string; description: string; status: WorkflowStatus }>,
  ) => void;
  onTriggerChange: (next: WorkflowTrigger) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="meta-name">Name</Label>
            <Input
              id="meta-name"
              value={meta.name}
              onChange={(e) => onMetaChange({ name: e.target.value.slice(0, 200) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="meta-desc">Description</Label>
            <Textarea
              id="meta-desc"
              rows={3}
              value={meta.description}
              onChange={(e) =>
                onMetaChange({ description: e.target.value.slice(0, 4000) })
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="meta-status">Status</Label>
            <Select
              value={meta.status}
              onValueChange={(v) => onMetaChange({ status: v as WorkflowStatus })}
            >
              <SelectTrigger id="meta-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-text-muted">
              Only <strong>active</strong> workflows fire on triggers. Pause to
              stop without losing the definition or run history.
            </span>
          </div>
          <div className="pt-2 border-t border-border-subtle text-xs text-text-muted">
            <div>Created {new Date(wf.createdAt).toLocaleString()}</div>
            <div>Updated {new Date(wf.updatedAt).toLocaleString()}</div>
            <div>By {wf.createdBy}</div>
            <div>Version {wf.version}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trigger</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="trig-kind">Trigger kind</Label>
            <Select
              value={trigger.kind}
              onValueChange={(v) =>
                onTriggerChange(emptyTrigger(v as WorkflowTrigger["kind"]))
              }
            >
              <SelectTrigger id="trig-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="database-event">Database event</SelectItem>
                <SelectItem value="cron">Schedule (cron)</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {trigger.kind === "manual" && (
            <ManualTriggerEditor trigger={trigger} onChange={onTriggerChange} />
          )}
          {trigger.kind === "database-event" && (
            <DatabaseEventTriggerEditor trigger={trigger} onChange={onTriggerChange} />
          )}
          {trigger.kind === "cron" && (
            <CronTriggerEditor trigger={trigger} onChange={onTriggerChange} />
          )}
          {trigger.kind === "webhook" && (
            <WebhookTriggerEditor wf={wf} trigger={trigger} onChange={onTriggerChange} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function emptyTrigger(kind: WorkflowTrigger["kind"]): WorkflowTrigger {
  switch (kind) {
    case "manual":
      return { kind: "manual", availability: "global" };
    case "database-event":
      return { kind: "database-event", resource: "*", on: ["created"] };
    case "cron":
      return { kind: "cron", cron: "0 9 * * *" };
    case "webhook":
      return { kind: "webhook" };
  }
}

function ManualTriggerEditor({
  trigger,
  onChange,
}: {
  trigger: ManualTrigger;
  onChange: (t: WorkflowTrigger) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label>Availability</Label>
        <Select
          value={trigger.availability ?? "global"}
          onValueChange={(v) =>
            onChange({ ...trigger, availability: v as ManualTrigger["availability"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global (any user)</SelectItem>
            <SelectItem value="record-detail">Record detail page</SelectItem>
            <SelectItem value="api-only">API only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {trigger.availability === "record-detail" && (
        <ParamText
          label="Resource"
          value={trigger.resource ?? ""}
          onChange={(v) => onChange({ ...trigger, resource: v })}
          placeholder="crm.contact"
        />
      )}
      <div className="text-xs text-text-muted">
        Use the <strong>Run now</strong> button at the top of the page to fire this
        manually.
      </div>
    </>
  );
}

const DB_OPS = ["created", "updated", "deleted", "restored", "destroyed"] as const;

function DatabaseEventTriggerEditor({
  trigger,
  onChange,
}: {
  trigger: DatabaseEventTrigger;
  onChange: (t: WorkflowTrigger) => void;
}) {
  const toggleOp = (op: (typeof DB_OPS)[number]) => {
    const set = new Set(trigger.on);
    if (set.has(op)) {
      set.delete(op);
    } else {
      set.add(op);
    }
    onChange({ ...trigger, on: Array.from(set) as DatabaseEventTrigger["on"] });
  };
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label>Resource</Label>
        <Input
          value={trigger.resource}
          onChange={(e) => onChange({ ...trigger, resource: e.target.value })}
          placeholder="crm.contact (or *.contact, crm.*)"
        />
        <span className="text-xs text-text-muted">
          Glob wildcards supported. Use <code className="font-mono">*</code> to fire
          on every resource.
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Operations</Label>
        <div className="grid grid-cols-2 gap-2">
          {DB_OPS.map((op) => (
            <label
              key={op}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Checkbox
                checked={trigger.on.includes(op)}
                onCheckedChange={() => toggleOp(op)}
              />
              <span className="text-text-secondary">{op}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Field filter (updated only)</Label>
        <Input
          value={(trigger.fields ?? []).join(", ")}
          onChange={(e) =>
            onChange({
              ...trigger,
              fields: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="status, owner"
        />
        <span className="text-xs text-text-muted">
          Comma-separated. Optional. Restricts <code>updated</code> matches to runs
          where one of these fields changed.
        </span>
      </div>
    </>
  );
}

const CRON_PRESETS: ReadonlyArray<{ label: string; value: string; intervalMs?: number }> = [
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every 30 minutes", value: "*/30 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Daily at 9am", value: "0 9 * * *" },
  { label: "Weekly Mon 9am", value: "0 9 * * 1" },
];

function CronTriggerEditor({
  trigger,
  onChange,
}: {
  trigger: CronTrigger;
  onChange: (t: WorkflowTrigger) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label>Cron expression</Label>
        <Input
          className="font-mono"
          value={trigger.cron ?? ""}
          onChange={(e) =>
            onChange({ kind: "cron", cron: e.target.value, intervalMs: undefined })
          }
          placeholder="*/5 * * * *"
        />
        <span className="text-xs text-text-muted">
          Five fields: minute, hour, day, month, day-of-week. The engine supports
          <code className="font-mono mx-1">*/N</code> and explicit numbers.
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Presets</Label>
        <div className="flex flex-wrap gap-1.5">
          {CRON_PRESETS.map((p) => (
            <Button
              key={p.value}
              variant="ghost"
              size="xs"
              onClick={() => onChange({ kind: "cron", cron: p.value })}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Or run every N minutes</Label>
        <Input
          type="number"
          value={
            trigger.intervalMs ? Math.round(trigger.intervalMs / 60_000) : ""
          }
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange({
              kind: "cron",
              intervalMs: n > 0 ? n * 60_000 : undefined,
              cron: n > 0 ? undefined : trigger.cron,
            });
          }}
          placeholder="(disabled)"
        />
        <span className="text-xs text-text-muted">
          Useful for sub-minute polls; clears the cron expression when set.
        </span>
      </div>
    </>
  );
}

function WebhookTriggerEditor({
  wf,
  trigger,
  onChange,
}: {
  wf: WorkflowRowApi;
  trigger: WebhookTrigger;
  onChange: (t: WorkflowTrigger) => void;
}) {
  const runtime = useRuntime();
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/api/workflows/triggers/webhook/${wf.id}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      runtime.actions.toast({ title: "Copied URL", intent: "success" });
    } catch {
      runtime.actions.toast({ title: "Copy failed", intent: "danger" });
    }
  };
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label>Public ingest URL</Label>
        <div className="flex items-stretch gap-2">
          <Input className="font-mono text-xs flex-1" readOnly value={url} />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void copy()}
            iconLeft={<ClipboardCopy className="h-3.5 w-3.5" />}
          >
            Copy
          </Button>
        </div>
        <span className="text-xs text-text-muted">
          POST any JSON body. The full body becomes the trigger payload. Workflow
          must be <strong>active</strong> to fire.
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <Label>API key (optional)</Label>
        <Input
          value={trigger.apiKey ?? ""}
          onChange={(e) =>
            onChange({
              kind: "webhook",
              apiKey: e.target.value.trim() || undefined,
            })
          }
          placeholder="(no auth)"
        />
        <span className="text-xs text-text-muted">
          When set, callers must send <code className="font-mono">x-workflow-key</code>{" "}
          header matching this value or the request is rejected with 401.
        </span>
      </div>
    </>
  );
}

/* ───────────── Run-now modal ────────────── */

function RunNowDialog({
  open,
  onOpenChange,
  workflowId,
  onRunStart,
  onRunDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workflowId: string;
  onRunStart: () => void;
  onRunDone: () => void;
}) {
  const runtime = useRuntime();
  const [payload, setPayload] = React.useState<string>("{}");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<RunDetailApi | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [runError, setRunError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setResult(null);
      setRunError(null);
      setParseError(null);
    }
  }, [open]);

  const submit = async () => {
    let parsed: unknown;
    try {
      parsed = payload.trim() === "" ? {} : JSON.parse(payload);
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Invalid JSON");
      return;
    }
    setBusy(true);
    onRunStart();
    setRunError(null);
    setResult(null);
    try {
      const out = await apiFetch<RunDetailApi>(`/workflows/${workflowId}/run`, {
        method: "POST",
        body: JSON.stringify(parsed),
      });
      setResult(out);
      runtime.actions.toast({
        title: out.status === "success" ? "Run finished" : `Run ${out.status}`,
        intent: out.status === "success" ? "success" : "warning",
      });
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Run failed");
      runtime.actions.toast({ title: "Run failed", intent: "danger" });
    } finally {
      setBusy(false);
      onRunDone();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[80vh] overflow-hidden flex flex-col p-0">
        <div className="px-5 py-4 border-b border-border">
          <div className="text-sm font-semibold text-text-primary">Run workflow now</div>
          <div className="text-xs text-text-muted mt-0.5">
            Manually fire this workflow with an arbitrary trigger payload. The
            payload is delivered as <code className="font-mono">trigger</code> on
            the variables bag.
          </div>
        </div>
        <div className="overflow-y-auto p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="run-payload">Trigger payload (JSON)</Label>
            <Textarea
              id="run-payload"
              rows={8}
              className="font-mono text-xs"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              invalid={!!parseError}
            />
            {parseError && (
              <span className="text-xs text-intent-danger">{parseError}</span>
            )}
          </div>

          {runError && (
            <div className="rounded-md border border-intent-danger/30 bg-intent-danger-bg p-3 text-xs text-intent-danger">
              {runError}
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Badge intent={runStatusIntent(result.status)}>{result.status}</Badge>
                <span className="text-xs text-text-muted font-mono">
                  {result.durationMs == null ? "—" : `${result.durationMs}ms`}
                </span>
                <span className="text-xs text-text-muted font-mono">{result.id}</span>
              </div>
              {result.error && (
                <div className="rounded-md border border-intent-danger/30 bg-intent-danger-bg p-3 text-xs text-intent-danger font-mono whitespace-pre-wrap">
                  {result.error}
                </div>
              )}
              <Section title="Per-node output">
                <JsonView value={result.output} />
              </Section>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Play className="h-3.5 w-3.5" />}
            loading={busy}
            onClick={() => void submit()}
          >
            Run
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
