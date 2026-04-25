/** Workflows list view.
 *
 *  Renders the LIST surface for /api/workflows — table with name, status,
 *  trigger summary, last run, created. Row actions: open, duplicate,
 *  activate/pause toggle, delete. "New workflow" button opens a modal
 *  that lets the user name the workflow and pick a trigger kind, then
 *  POSTs and redirects to the detail page on success.
 *
 *  Empty state: "Build your first workflow" hero with three suggested
 *  templates that pre-fill the new-workflow modal so a developer-friendly
 *  starting point is always one click away. */

import * as React from "react";
import {
  Plus,
  Pause,
  Play,
  Copy,
  Trash2,
  MoreHorizontal,
  Workflow as WorkflowIcon,
  GitBranch,
  Clock,
  Webhook,
  Sparkles,
  MessageSquare,
  Mail,
  CalendarClock,
} from "lucide-react";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Card, CardContent } from "@/admin-primitives/Card";
import { StatusDot } from "@/admin-primitives/StatusDot";
import { FreshnessIndicator } from "@/admin-primitives/FreshnessIndicator";
import { EmptyStateFramework } from "@/admin-primitives/EmptyStateFramework";
import { ErrorRecoveryFramework } from "@/admin-primitives/ErrorRecoveryFramework";
import { Button } from "@/primitives/Button";
import { Badge } from "@/primitives/Badge";
import { Input } from "@/primitives/Input";
import { Label } from "@/primitives/Label";
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
  DropdownMenuSeparator,
} from "@/primitives/DropdownMenu";
import { apiFetch } from "@/runtime/auth";
import { useRuntime } from "@/runtime/context";
import { navigateTo } from "@/views/useRoute";
import { formatRelative } from "@/lib/format";
import type {
  WorkflowDefinition,
  WorkflowStatus,
  WorkflowTrigger,
  WorkflowRunStatus,
} from "./types";

/* ───────────── types coming back from the REST API ────────────── */

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

interface RunRowApi {
  id: string;
  workflowId: string;
  status: WorkflowRunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  error: string | null;
}

interface TriggerKindOption {
  id: WorkflowTrigger["kind"];
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TRIGGER_KINDS: readonly TriggerKindOption[] = [
  {
    id: "manual",
    label: "Manual",
    description: "Fire from a button click or admin API.",
    icon: Play,
  },
  {
    id: "database-event",
    label: "Database event",
    description: "Run when a record is created, updated, or deleted.",
    icon: GitBranch,
  },
  {
    id: "cron",
    label: "Schedule (cron)",
    description: "Run on a recurring schedule.",
    icon: Clock,
  },
  {
    id: "webhook",
    label: "Webhook",
    description: "Run when an external service POSTs to a URL.",
    icon: Webhook,
  },
];

/* ───────────── developer-friendly templates for empty-state ────── */

interface WorkflowTemplate {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  build: () => { name: string; description: string; definition: WorkflowDefinition };
}

const TEMPLATES: readonly WorkflowTemplate[] = [
  {
    id: "slack-on-opportunity",
    label: "Notify Slack on new opportunity",
    description: "Fire when an opportunity is created and POST to Slack.",
    icon: MessageSquare,
    build: () => ({
      name: "Notify Slack on new opportunity",
      description: "Posts a Slack message when a sales opportunity is created.",
      definition: {
        trigger: {
          kind: "database-event",
          resource: "sales.opportunity",
          on: ["created"],
        },
        nodes: [
          {
            id: "n_slack",
            type: "webhook.outbound",
            label: "POST to Slack",
            params: {
              url: "https://hooks.slack.com/services/REPLACE_ME",
              payload: {
                text:
                  "New opportunity {{ trigger.record.name }} ({{ trigger.record.amount }})",
              },
              eventType: "opportunity.created",
            },
          },
        ],
        edges: [{ from: "start", to: "n_slack" }],
        variables: { initial: {} },
      },
    }),
  },
  {
    id: "welcome-email-on-contact",
    label: "Send welcome email on new contact",
    description: "Greet new contacts the moment they're created.",
    icon: Mail,
    build: () => ({
      name: "Welcome email on new contact",
      description: "Sends a welcome email when a contact is created.",
      definition: {
        trigger: {
          kind: "database-event",
          resource: "crm.contact",
          on: ["created"],
        },
        nodes: [
          {
            id: "n_mail",
            type: "mail.send",
            label: "Send welcome email",
            params: {
              to: "{{ trigger.record.email }}",
              subject: "Welcome to Gutu",
              body:
                "<p>Hi {{ trigger.record.name }},</p>\n<p>Glad to have you onboard.</p>",
              format: "html",
            },
          },
        ],
        edges: [{ from: "start", to: "n_mail" }],
        variables: { initial: {} },
      },
    }),
  },
  {
    id: "daily-report-9am",
    label: "Daily report at 9am",
    description: "Email an admin a daily summary report.",
    icon: CalendarClock,
    build: () => ({
      name: "Daily report at 9am",
      description: "Logs and emails a daily summary at 9am UTC.",
      definition: {
        trigger: { kind: "cron", cron: "0 9 * * *" },
        nodes: [
          {
            id: "n_log",
            type: "log",
            label: "Log start",
            params: { message: "Starting daily report", level: "info" },
          },
          {
            id: "n_mail",
            type: "mail.send",
            label: "Email admin",
            params: {
              to: "admin@example.com",
              subject: "Daily report",
              body: "Daily report — see dashboard.",
              format: "text",
            },
          },
        ],
        edges: [
          { from: "start", to: "n_log" },
          { from: "n_log", to: "n_mail" },
        ],
        variables: { initial: {} },
      },
    }),
  },
];

/* ───────────── helpers ────────────── */

function statusIntent(status: WorkflowStatus): "success" | "warning" | "neutral" | "info" {
  switch (status) {
    case "active":
      return "success";
    case "paused":
      return "warning";
    case "archived":
      return "neutral";
    case "draft":
    default:
      return "info";
  }
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

function summarizeTrigger(t: WorkflowTrigger | undefined): string {
  if (!t) return "—";
  switch (t.kind) {
    case "manual":
      return `Manual${t.availability && t.availability !== "global" ? ` (${t.availability})` : ""}`;
    case "database-event":
      return `${t.resource} · ${t.on.join(", ")}`;
    case "cron":
      if (t.cron) return `Cron · ${t.cron}`;
      if (t.intervalMs) return `Every ${Math.round(t.intervalMs / 60_000)}m`;
      return "Cron";
    case "webhook":
      return t.apiKey ? "Webhook (key)" : "Webhook";
    default:
      return "—";
  }
}

/* ───────────── component ────────────── */

export function WorkflowsPage() {
  const runtime = useRuntime();
  const [rows, setRows] = React.useState<WorkflowRowApi[] | null>(null);
  const [latestRuns, setLatestRuns] = React.useState<Record<string, RunRowApi | null>>({});
  const [error, setError] = React.useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());
  const [creating, setCreating] = React.useState<{
    open: boolean;
    seed?: ReturnType<WorkflowTemplate["build"]>;
  }>({ open: false });
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const r = await apiFetch<{ rows: WorkflowRowApi[] }>("/workflows");
      setRows(r.rows);
      setError(null);
      setLastUpdated(new Date());

      // Best-effort latest-run fetch per workflow. We hit the runs
      // endpoint with pageSize=1; this is N requests but lists are
      // small in practice and we get accurate per-row last-run pills
      // without backend changes.
      const entries: Array<[string, RunRowApi | null]> = await Promise.all(
        r.rows.map(async (wf) => {
          try {
            const out = await apiFetch<{ rows: RunRowApi[] }>(
              `/workflows/${wf.id}/runs?page=1&pageSize=1`,
            );
            return [wf.id, out.rows[0] ?? null];
          } catch {
            return [wf.id, null];
          }
        }),
      );
      setLatestRuns(Object.fromEntries(entries));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const open = (wf: WorkflowRowApi) =>
    navigateTo(`/settings/workflows/${wf.id}`);

  const duplicate = async (wf: WorkflowRowApi) => {
    setBusyId(wf.id);
    try {
      const out = await apiFetch<WorkflowRowApi>(`/workflows/${wf.id}/duplicate`, {
        method: "POST",
      });
      runtime.actions.toast({
        title: `Duplicated ${wf.name}`,
        intent: "success",
      });
      navigateTo(`/settings/workflows/${out.id}`);
    } catch (err) {
      runtime.actions.toast({
        title: "Duplicate failed",
        description: err instanceof Error ? err.message : undefined,
        intent: "danger",
      });
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = async (wf: WorkflowRowApi, status: WorkflowStatus) => {
    setBusyId(wf.id);
    try {
      await apiFetch(`/workflows/${wf.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      runtime.actions.toast({
        title: status === "active" ? `Activated ${wf.name}` : `Paused ${wf.name}`,
        intent: status === "active" ? "success" : "warning",
      });
      await refresh();
    } catch (err) {
      runtime.actions.toast({
        title: "Status change failed",
        description: err instanceof Error ? err.message : undefined,
        intent: "danger",
      });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (wf: WorkflowRowApi) => {
    const confirmed = await runtime.actions.confirm({
      title: `Delete "${wf.name}"?`,
      description:
        "This soft-deletes the workflow (status becomes archived) and stops it from firing. Run history is retained.",
      destructive: true,
    });
    if (!confirmed) return;
    setBusyId(wf.id);
    try {
      await apiFetch(`/workflows/${wf.id}`, { method: "DELETE" });
      runtime.actions.toast({ title: `Deleted ${wf.name}`, intent: "danger" });
      await refresh();
    } catch (err) {
      runtime.actions.toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : undefined,
        intent: "danger",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Workflows"
        description="Visual automations — triggered by database events, schedules, webhooks, or run on demand. Every run is recorded."
        actions={
          <div className="flex items-center gap-2">
            <FreshnessIndicator lastUpdatedAt={lastUpdated} />
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setCreating({ open: true })}
            >
              New workflow
            </Button>
          </div>
        }
      />

      {error ? (
        <ErrorRecoveryFramework
          message={error.message ?? "Failed to load workflows."}
          onRetry={() => void refresh()}
        />
      ) : rows === null ? (
        <Card>
          <CardContent className="py-10 text-center text-xs text-text-muted">
            Loading workflows…
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyHero onPick={(seed) => setCreating({ open: true, seed })} />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-text-muted">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Trigger</th>
                  <th className="text-left p-3">Last run</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((wf) => {
                  const lastRun = latestRuns[wf.id];
                  return (
                    <tr
                      key={wf.id}
                      className="border-b border-border-subtle last:border-b-0 hover:bg-surface-1 cursor-pointer"
                      onClick={() => open(wf)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <WorkflowIcon className="h-3.5 w-3.5 text-text-muted shrink-0" />
                          <div className="min-w-0">
                            <div className="text-text-primary font-medium truncate">
                              {wf.name}
                            </div>
                            {wf.description && (
                              <div className="text-xs text-text-muted truncate">
                                {wf.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="inline-flex items-center gap-1.5">
                          <StatusDot intent={statusIntent(wf.status)} />
                          <span className="text-xs text-text-secondary capitalize">
                            {wf.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-text-secondary font-mono">
                        {summarizeTrigger(wf.definition.trigger)}
                      </td>
                      <td className="p-3 text-xs">
                        {lastRun ? (
                          <div className="flex items-center gap-2">
                            <Badge intent={runStatusIntent(lastRun.status)}>
                              {lastRun.status}
                            </Badge>
                            <span className="text-text-muted">
                              {formatRelative(lastRun.startedAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-text-muted">Never</span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-text-muted">
                        {new Date(wf.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <div
                          className="inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {wf.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={busyId === wf.id}
                              iconLeft={<Pause className="h-3 w-3" />}
                              onClick={() => void setStatus(wf, "paused")}
                            >
                              Pause
                            </Button>
                          ) : wf.status !== "archived" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={busyId === wf.id}
                              iconLeft={<Play className="h-3 w-3" />}
                              onClick={() => void setStatus(wf, "active")}
                            >
                              Activate
                            </Button>
                          ) : null}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="More actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => open(wf)}>
                                Open
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => void duplicate(wf)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                intent="danger"
                                onClick={() => void remove(wf)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <NewWorkflowDialog
        open={creating.open}
        seed={creating.seed}
        onOpenChange={(v) => setCreating(v ? { open: true } : { open: false })}
        onCreated={(id) => {
          setCreating({ open: false });
          navigateTo(`/settings/workflows/${id}`);
        }}
      />
    </div>
  );
}

/* ───────────── empty-state hero ────────────── */

function EmptyHero({
  onPick,
}: {
  onPick: (seed: ReturnType<WorkflowTemplate["build"]>) => void;
}) {
  return (
    <Card>
      <CardContent className="py-10">
        <EmptyStateFramework
          kind="first-time"
          illustration={<Sparkles className="h-6 w-6" />}
          title="Build your first workflow"
          description="Connect database events, schedules, and webhooks to actions. Pick a template below to get started — you can edit anything before saving."
        />
        <div className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl mx-auto">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                className="text-left rounded-md border border-border bg-surface-0 p-4 hover:border-accent/60 transition-colors"
                onClick={() => onPick(t.build())}
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-md bg-accent-subtle flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text-primary">
                      {t.label}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5 line-clamp-2">
                      {t.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────── new-workflow modal ────────────── */

function NewWorkflowDialog({
  open,
  seed,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  seed?: ReturnType<WorkflowTemplate["build"]>;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const runtime = useRuntime();
  const [name, setName] = React.useState("");
  const [triggerKind, setTriggerKind] = React.useState<WorkflowTrigger["kind"]>("manual");
  const [busy, setBusy] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // When the dialog opens with a seed, pre-fill from the template.
  React.useEffect(() => {
    if (!open) {
      setName("");
      setTriggerKind("manual");
      setErrorMsg(null);
      return;
    }
    if (seed) {
      setName(seed.name);
      setTriggerKind(seed.definition.trigger.kind);
    }
  }, [open, seed]);

  const submit = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      // If a seed is supplied (template), POST its full definition. Otherwise
      // build a tiny stub: just the trigger, no nodes/edges. The user lands
      // on the detail page and adds nodes there.
      const definition: WorkflowDefinition = seed
        ? seed.definition
        : {
            trigger: defaultTriggerForKind(triggerKind),
            nodes: [],
            edges: [],
            variables: { initial: {} },
          };
      const out = await apiFetch<{ id: string }>("/workflows", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: seed?.description ?? null,
          status: "draft",
          definition,
        }),
      });
      runtime.actions.toast({
        title: `Created ${name.trim()}`,
        intent: "success",
      });
      onCreated(out.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="px-5 py-4 border-b border-border">
          <div className="text-sm font-semibold text-text-primary">
            New workflow
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            {seed
              ? "Pre-filled from template — edit anything before saving."
              : "Name it and pick how it should fire. You can build the graph next."}
          </div>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="wf-name">Name</Label>
            <Input
              id="wf-name"
              autoFocus
              placeholder="e.g. Notify Slack on new opportunity"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 200))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="wf-trigger">Trigger</Label>
            <Select
              value={triggerKind}
              onValueChange={(v) =>
                setTriggerKind(v as WorkflowTrigger["kind"])
              }
              disabled={!!seed}
            >
              <SelectTrigger id="wf-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_KINDS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-text-muted">
              {TRIGGER_KINDS.find((t) => t.id === triggerKind)?.description}
            </span>
          </div>
          {errorMsg && (
            <div className="text-xs text-intent-danger">{errorMsg}</div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={busy}
            disabled={name.trim().length < 1}
            onClick={() => void submit()}
            iconLeft={<Plus className="h-3.5 w-3.5" />}
          >
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Sensible empty trigger configs so a fresh workflow validates server-side. */
function defaultTriggerForKind(kind: WorkflowTrigger["kind"]): WorkflowTrigger {
  switch (kind) {
    case "manual":
      return { kind: "manual", availability: "global" };
    case "database-event":
      return { kind: "database-event", resource: "*", on: ["created"] };
    case "cron":
      return { kind: "cron", cron: "0 * * * *" };
    case "webhook":
      return { kind: "webhook" };
  }
}
