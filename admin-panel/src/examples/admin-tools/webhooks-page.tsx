import * as React from "react";
import {
  Plus,
  RefreshCw,
  Search,
  Send,
  KeyRound,
  Eye,
  Pencil,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Webhook as WebhookIcon,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Card, CardContent } from "@/admin-primitives/Card";
import { EmptyState } from "@/admin-primitives/EmptyState";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Textarea } from "@/primitives/Textarea";
import { Switch } from "@/primitives/Switch";
import { Label } from "@/primitives/Label";
import { Badge } from "@/primitives/Badge";
import { Spinner } from "@/primitives/Spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/primitives/Dialog";
import { authStore } from "@/runtime/auth";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/cn";

/* ----------------------------- types ------------------------------------- */

interface Webhook {
  id: string;
  tenantId: string;
  targetUrl: string;
  eventsPattern: string;
  enabled: boolean;
  secretPrefix: string;
  headers: Record<string, string> | null;
  retryPolicy: { maxAttempts?: number; backoffMs?: number } | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastDeliveryAt: string | null;
  lastStatus: number | null;
}

interface CreatedWebhook extends Webhook {
  /** Returned only on POST. */
  secret: string;
}

interface DeliveryRow {
  id: string;
  webhook_id: string;
  event_type: string;
  status_code: number | null;
  error: string | null;
  attempt: number;
  delivered_at: string;
  payload_preview: string;
  response_preview: string;
}

interface TestResult {
  ok: boolean;
  statusCode: number;
  error: string | null;
  responseBody: string;
}

/* ----------------------------- HTTP -------------------------------------- */

function apiBase(): string {
  const base =
    (typeof import.meta !== "undefined"
      ? (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE
      : undefined) ?? "/api";
  return base.toString().replace(/\/+$/, "");
}

function authHeaders(json = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  if (authStore.token) headers.Authorization = `Bearer ${authStore.token}`;
  if (authStore.activeTenant?.id) headers["x-tenant"] = authStore.activeTenant.id;
  return headers;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body?.error) return body.error;
  } catch {
    /* tolerate */
  }
  return `HTTP ${res.status}`;
}

async function listWebhooks(): Promise<Webhook[]> {
  const res = await fetch(`${apiBase()}/webhooks`, {
    headers: authHeaders(false),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { rows: Webhook[] };
  return body.rows;
}

async function createWebhook(input: {
  targetUrl: string;
  eventsPattern: string;
  enabled: boolean;
  headers: Record<string, string> | null;
}): Promise<CreatedWebhook> {
  const res = await fetch(`${apiBase()}/webhooks`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as CreatedWebhook;
}

async function updateWebhook(
  id: string,
  patch: Partial<{
    targetUrl: string;
    eventsPattern: string;
    enabled: boolean;
    headers: Record<string, string> | null;
  }>,
): Promise<Webhook> {
  const res = await fetch(`${apiBase()}/webhooks/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as Webhook;
}

async function deleteWebhook(id: string): Promise<void> {
  const res = await fetch(`${apiBase()}/webhooks/${id}`, {
    method: "DELETE",
    headers: authHeaders(false),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readError(res));
}

async function testWebhook(id: string): Promise<TestResult> {
  const res = await fetch(`${apiBase()}/webhooks/${id}/test`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as TestResult;
}

async function rotateSecret(id: string): Promise<{ secret: string }> {
  const res = await fetch(`${apiBase()}/webhooks/${id}/rotate-secret`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { secret: string };
}

async function listDeliveries(id: string): Promise<DeliveryRow[]> {
  const res = await fetch(
    `${apiBase()}/webhooks/${encodeURIComponent(id)}/deliveries?limit=100`,
    { headers: authHeaders(false), credentials: "include" },
  );
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { rows: DeliveryRow[] };
  return body.rows;
}

/* ----------------------------- helpers ----------------------------------- */

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function statusIntent(code: number | null): "neutral" | "success" | "warning" | "danger" {
  if (code == null) return "neutral";
  if (code >= 200 && code < 300) return "success";
  if (code >= 400 && code < 500) return "warning";
  if (code >= 500) return "danger";
  return "neutral";
}

function CopyableSecret({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — user will copy manually */
    }
  };
  return (
    <div className="rounded-md border border-intent-warning/40 bg-intent-warning-bg/30 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-medium text-intent-warning">
        <AlertTriangle className="h-3.5 w-3.5" />
        {label ?? "Save this now — it will not be shown again"}
      </div>
      <div className="flex items-stretch gap-2">
        <code className="flex-1 min-w-0 rounded bg-surface-0 border border-border px-2 py-1.5 text-xs font-mono break-all text-text-primary">
          {value}
        </code>
        <Button
          size="sm"
          variant="secondary"
          onClick={onCopy}
          iconLeft={copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------- create / edit dialog ---------------------- */

interface FormState {
  targetUrl: string;
  eventsPattern: string;
  headersJson: string;
  enabled: boolean;
}

const EMPTY_FORM: FormState = {
  targetUrl: "",
  eventsPattern: "*",
  headersJson: "",
  enabled: true,
};

function WebhookDialog({
  mode,
  initial,
  open,
  onOpenChange,
  onSaved,
  onCreated,
}: {
  mode: "create" | "edit";
  initial: Webhook | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (w: Webhook) => void;
  onCreated?: (w: CreatedWebhook) => void;
}) {
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState<{ url?: boolean; headers?: boolean }>({});

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setForm({
        targetUrl: initial.targetUrl,
        eventsPattern: initial.eventsPattern,
        headersJson: initial.headers ? JSON.stringify(initial.headers, null, 2) : "",
        enabled: initial.enabled,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setApiError(null);
    setTouched({});
  }, [open, mode, initial]);

  const urlInvalid = !!form.targetUrl && !isValidHttpUrl(form.targetUrl);
  const urlEmpty = !form.targetUrl;
  const headersInvalid = (() => {
    if (!form.headersJson.trim()) return false;
    try {
      const v = JSON.parse(form.headersJson);
      if (!v || typeof v !== "object" || Array.isArray(v)) return true;
      for (const [, val] of Object.entries(v)) {
        if (typeof val !== "string") return true;
      }
      return false;
    } catch {
      return true;
    }
  })();

  const canSubmit = !submitting && !urlEmpty && !urlInvalid && !headersInvalid;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const headers = form.headersJson.trim()
        ? (JSON.parse(form.headersJson) as Record<string, string>)
        : null;
      if (mode === "create") {
        const created = await createWebhook({
          targetUrl: form.targetUrl.trim(),
          eventsPattern: form.eventsPattern.trim() || "*",
          enabled: form.enabled,
          headers,
        });
        onCreated?.(created);
      } else if (initial) {
        const updated = await updateWebhook(initial.id, {
          targetUrl: form.targetUrl.trim(),
          eventsPattern: form.eventsPattern.trim() || "*",
          enabled: form.enabled,
          headers,
        });
        onSaved?.(updated);
        onOpenChange(false);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create webhook" : "Edit webhook"}
          </DialogTitle>
          <DialogDescription>
            We will POST a signed JSON payload to your endpoint whenever an event
            matches the pattern. Verify the signature using the per-webhook
            secret.
          </DialogDescription>
        </DialogHeader>

        {apiError ? (
          <div className="rounded-md border border-intent-danger/40 bg-intent-danger-bg/30 px-3 py-2 text-sm text-intent-danger">
            {apiError}
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wh-url" required>
              Target URL
            </Label>
            <Input
              id="wh-url"
              placeholder="https://api.example.com/hooks/incoming"
              value={form.targetUrl}
              invalid={touched.url && (urlEmpty || urlInvalid)}
              onChange={(e) =>
                setForm((s) => ({ ...s, targetUrl: e.target.value }))
              }
              onBlur={() => setTouched((t) => ({ ...t, url: true }))}
            />
            {touched.url && urlEmpty ? (
              <span className="text-xs text-intent-danger">URL is required.</span>
            ) : touched.url && urlInvalid ? (
              <span className="text-xs text-intent-danger">
                Must be a valid http(s) URL.
              </span>
            ) : (
              <span className="text-xs text-text-muted">
                Must start with http:// or https://
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wh-pattern">Events pattern</Label>
            <Input
              id="wh-pattern"
              placeholder="*"
              value={form.eventsPattern}
              onChange={(e) =>
                setForm((s) => ({ ...s, eventsPattern: e.target.value }))
              }
            />
            <span className="text-xs text-text-muted">
              Examples: <code className="font-mono">*</code> (all),{" "}
              <code className="font-mono">crm.contact.*</code>,{" "}
              <code className="font-mono">*.created</code>
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wh-headers">Custom headers (optional)</Label>
            <Textarea
              id="wh-headers"
              rows={4}
              placeholder='{"X-My-Auth": "secret-token"}'
              value={form.headersJson}
              invalid={touched.headers && headersInvalid}
              onChange={(e) =>
                setForm((s) => ({ ...s, headersJson: e.target.value }))
              }
              onBlur={() => setTouched((t) => ({ ...t, headers: true }))}
              className="font-mono text-xs"
            />
            {touched.headers && headersInvalid ? (
              <span className="text-xs text-intent-danger">
                Must be a JSON object of string values.
              </span>
            ) : (
              <span className="text-xs text-text-muted">
                JSON object — keys and values must be strings.
              </span>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-1 px-3 py-2">
            <div className="flex flex-col">
              <Label htmlFor="wh-enabled" className="cursor-pointer">
                Enabled
              </Label>
              <span className="text-xs text-text-muted">
                Disabled webhooks won't fire but stay in the list.
              </span>
            </div>
            <Switch
              id="wh-enabled"
              checked={form.enabled}
              onCheckedChange={(v) => setForm((s) => ({ ...s, enabled: !!v }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={!canSubmit}
            loading={submitting}
          >
            {mode === "create" ? "Create webhook" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- secret-shown-once dialog ------------------ */

function SecretRevealDialog({
  open,
  title,
  description,
  secret,
  onClose,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  secret: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {secret ? <CopyableSecret value={secret} /> : null}
        <DialogFooter>
          <Button variant="primary" onClick={onClose}>
            I have copied it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- deliveries drawer ------------------------- */

function DeliveriesDrawer({
  webhook,
  open,
  onClose,
}: {
  webhook: Webhook | null;
  open: boolean;
  onClose: () => void;
}) {
  const [rows, setRows] = React.useState<DeliveryRow[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!webhook) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listDeliveries(webhook.id);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [webhook]);

  React.useEffect(() => {
    if (open && webhook) {
      setExpanded(null);
      void load();
    }
  }, [open, webhook, load]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="xl" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delivery log</DialogTitle>
          <DialogDescription>
            {webhook ? (
              <>
                Last 100 attempts to{" "}
                <code className="font-mono text-xs">{webhook.targetUrl}</code>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">
            {rows ? `${rows.length} deliveries` : ""}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={load}
            disabled={loading}
            iconLeft={
              loading ? <Spinner size={12} /> : <RefreshCw className="h-3.5 w-3.5" />
            }
          >
            Refresh
          </Button>
        </div>

        {error ? (
          <EmptyState title="Couldn't load deliveries" description={error} />
        ) : !rows ? (
          <div className="py-8 flex justify-center text-sm text-text-muted">
            <Spinner size={14} />
            <span className="ml-2">Loading…</span>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No deliveries yet"
            description="Click Test to fire a synthetic event, or wait for a real event to match the pattern."
          />
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-1 border-b border-border text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-8"></th>
                  <th className="text-left py-2 font-medium w-36">When</th>
                  <th className="text-left py-2 font-medium w-24">Status</th>
                  <th className="text-left py-2 font-medium w-14">#</th>
                  <th className="text-left py-2 font-medium">Event</th>
                  <th className="text-left py-2 font-medium pr-3">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isOpen = expanded === row.id;
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        className={cn(
                          "border-b border-border-subtle last:border-b-0 cursor-pointer hover:bg-surface-1 transition-colors",
                          isOpen && "bg-surface-1",
                        )}
                        onClick={() => setExpanded(isOpen ? null : row.id)}
                      >
                        <td className="px-3 py-2">
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5 text-text-muted transition-transform",
                              isOpen && "rotate-90",
                            )}
                          />
                        </td>
                        <td className="py-2 text-text-secondary whitespace-nowrap">
                          {formatRelative(row.delivered_at)}
                        </td>
                        <td className="py-2">
                          {row.status_code != null ? (
                            <Badge intent={statusIntent(row.status_code)}>
                              {row.status_code}
                            </Badge>
                          ) : (
                            <Badge intent="danger">err</Badge>
                          )}
                        </td>
                        <td className="py-2 text-text-secondary tabular-nums">
                          {row.attempt}
                        </td>
                        <td className="py-2">
                          <code className="text-xs font-mono">
                            {row.event_type}
                          </code>
                        </td>
                        <td className="py-2 pr-3 text-text-secondary truncate max-w-[16rem]">
                          {row.error ? (
                            <span className="text-intent-danger">
                              {row.error}
                            </span>
                          ) : (
                            <span className="text-text-muted">
                              {row.response_preview?.slice(0, 80) ?? ""}
                            </span>
                          )}
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="bg-surface-1 border-b border-border">
                          <td></td>
                          <td colSpan={5} className="py-3 pr-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs font-medium text-text-muted mb-1">
                                  Payload
                                </div>
                                <pre className="text-xs font-mono bg-surface-0 border border-border rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                                  {row.payload_preview || "—"}
                                </pre>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-text-muted mb-1">
                                  Response
                                </div>
                                <pre className="text-xs font-mono bg-surface-0 border border-border rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                                  {row.error
                                    ? `Error: ${row.error}`
                                    : row.response_preview || "—"}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- main page --------------------------------- */

export function WebhooksPage() {
  const [rows, setRows] = React.useState<Webhook[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  // dialogs / drawers
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = React.useState<Webhook | null>(null);
  const [deliveriesFor, setDeliveriesFor] = React.useState<Webhook | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Webhook | null>(null);
  const [confirmRotate, setConfirmRotate] = React.useState<Webhook | null>(null);
  const [secretReveal, setSecretReveal] = React.useState<{
    title: string;
    description: React.ReactNode;
    secret: string;
  } | null>(null);
  const [testInline, setTestInline] = React.useState<
    Record<string, { loading: boolean; result?: TestResult; error?: string }>
  >({});
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listWebhooks();
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    if (!rows) return null;
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.targetUrl.toLowerCase().includes(q) ||
        r.eventsPattern.toLowerCase().includes(q) ||
        r.createdBy.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const onCreated = (w: CreatedWebhook) => {
    // Append to list, then reveal the secret.
    setRows((cur) => (cur ? [w, ...cur] : [w]));
    setDialogMode(null);
    setSecretReveal({
      title: "Webhook created",
      description: (
        <>
          Copy the signing secret now — it will not be shown again. Use it to
          verify the <code className="font-mono">X-Gutu-Signature</code> header
          on every delivery.
        </>
      ),
      secret: w.secret,
    });
  };

  const onSaved = (w: Webhook) => {
    setRows((cur) => (cur ? cur.map((r) => (r.id === w.id ? w : r)) : cur));
  };

  const runTest = async (w: Webhook) => {
    setTestInline((s) => ({ ...s, [w.id]: { loading: true } }));
    try {
      const result = await testWebhook(w.id);
      setTestInline((s) => ({ ...s, [w.id]: { loading: false, result } }));
      // Refresh the row's lastStatus / lastDeliveryAt from server.
      void load();
    } catch (err) {
      setTestInline((s) => ({
        ...s,
        [w.id]: {
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        },
      }));
    }
  };

  const runDelete = async (w: Webhook) => {
    setBusyId(w.id);
    try {
      await deleteWebhook(w.id);
      setRows((cur) => (cur ? cur.filter((r) => r.id !== w.id) : cur));
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const runRotate = async (w: Webhook) => {
    setBusyId(w.id);
    try {
      const { secret } = await rotateSecret(w.id);
      setConfirmRotate(null);
      setSecretReveal({
        title: "New webhook secret",
        description: (
          <>
            The old secret is now invalid. Update your verification code with
            this new value — it will not be shown again.
          </>
        ),
        secret,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Webhooks"
        description={
          rows
            ? `${rows.length} ${rows.length === 1 ? "endpoint" : "endpoints"}`
            : "Send signed event notifications to your own endpoints."
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={load}
              iconLeft={
                loading ? <Spinner size={12} /> : <RefreshCw className="h-3.5 w-3.5" />
              }
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogMode("create");
              }}
              iconLeft={<Plus className="h-3.5 w-3.5" />}
            >
              Create webhook
            </Button>
          </>
        }
      />

      {error ? (
        <div className="rounded-md border border-intent-danger/40 bg-intent-danger-bg/30 px-3 py-2 text-sm text-intent-danger flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            className="text-xs underline opacity-80 hover:opacity-100"
            onClick={() => setError(null)}
          >
            dismiss
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="min-w-[220px] flex-1 max-w-md">
          <Input
            prefix={<Search className="h-3.5 w-3.5" />}
            placeholder="Search target URL, pattern, creator…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!filtered ? (
        <div className="py-16 flex items-center justify-center text-sm text-text-muted">
          <Spinner size={14} />
          <span className="ml-2">Loading webhooks…</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<WebhookIcon className="h-5 w-5" />}
          title={rows && rows.length === 0 ? "No webhooks yet" : "No matches"}
          description={
            rows && rows.length === 0
              ? "Create one to start receiving event notifications at your own endpoint."
              : "No webhooks match your search."
          }
          action={
            rows && rows.length === 0 ? (
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditing(null);
                  setDialogMode("create");
                }}
              >
                Create webhook
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-surface-1 border-b border-border text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Target URL</th>
                  <th className="text-left py-2 font-medium w-40">Pattern</th>
                  <th className="text-left py-2 font-medium w-28">Status</th>
                  <th className="text-left py-2 font-medium w-36">Last delivery</th>
                  <th className="text-left py-2 font-medium w-32">Created</th>
                  <th className="text-right py-2 font-medium w-72 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => {
                  const test = testInline[w.id];
                  return (
                    <React.Fragment key={w.id}>
                      <tr className="border-b border-border-subtle last:border-b-0 hover:bg-surface-1 transition-colors">
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-text-primary truncate font-medium">
                              {w.targetUrl}
                            </span>
                            <span className="text-xs text-text-muted truncate">
                              secret <code className="font-mono">{w.secretPrefix}</code>{" "}
                              · created by {w.createdBy}
                              {!w.enabled ? (
                                <>
                                  {" "}·{" "}
                                  <span className="text-intent-warning">disabled</span>
                                </>
                              ) : null}
                            </span>
                          </div>
                        </td>
                        <td className="py-2">
                          <code className="text-xs font-mono text-text-secondary">
                            {w.eventsPattern}
                          </code>
                        </td>
                        <td className="py-2">
                          {w.lastStatus != null ? (
                            <Badge intent={statusIntent(w.lastStatus)}>
                              {w.lastStatus}
                            </Badge>
                          ) : (
                            <span className="text-xs text-text-muted">—</span>
                          )}
                        </td>
                        <td className="py-2 text-text-secondary">
                          {w.lastDeliveryAt ? formatRelative(w.lastDeliveryAt) : "—"}
                        </td>
                        <td className="py-2 text-text-secondary">
                          {formatRelative(w.createdAt)}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-1 justify-end flex-wrap">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => runTest(w)}
                              loading={test?.loading}
                              iconLeft={<Send className="h-3 w-3" />}
                              title="Send a synthetic test event"
                            >
                              Test
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => setDeliveriesFor(w)}
                              iconLeft={<Eye className="h-3 w-3" />}
                              title="View delivery log"
                            >
                              Log
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                setEditing(w);
                                setDialogMode("edit");
                              }}
                              iconLeft={<Pencil className="h-3 w-3" />}
                              title="Edit"
                            >
                              Edit
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => setConfirmRotate(w)}
                              iconLeft={<KeyRound className="h-3 w-3" />}
                              title="Rotate signing secret"
                            >
                              Rotate
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => setConfirmDelete(w)}
                              iconLeft={<Trash2 className="h-3 w-3" />}
                              title="Delete"
                              className="text-intent-danger hover:bg-intent-danger-bg/30"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {test && (test.result || test.error) ? (
                        <tr className="bg-surface-1 border-b border-border-subtle">
                          <td colSpan={6} className="px-3 py-2">
                            {test.error ? (
                              <div className="flex items-center gap-2 text-xs text-intent-danger">
                                <XCircle className="h-3.5 w-3.5" />
                                Test failed: {test.error}
                                <button
                                  className="ml-auto opacity-70 hover:opacity-100"
                                  onClick={() =>
                                    setTestInline((s) => {
                                      const n = { ...s };
                                      delete n[w.id];
                                      return n;
                                    })
                                  }
                                >
                                  dismiss
                                </button>
                              </div>
                            ) : test.result ? (
                              <div className="flex items-start gap-2 text-xs">
                                {test.result.ok ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-intent-success shrink-0" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 mt-0.5 text-intent-danger shrink-0" />
                                )}
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                  <span
                                    className={cn(
                                      test.result.ok
                                        ? "text-intent-success"
                                        : "text-intent-danger",
                                    )}
                                  >
                                    {test.result.ok ? "Test succeeded" : "Test failed"}
                                    {test.result.statusCode > 0
                                      ? ` · HTTP ${test.result.statusCode}`
                                      : ""}
                                    {test.result.error ? ` · ${test.result.error}` : ""}
                                  </span>
                                  {test.result.responseBody ? (
                                    <code className="font-mono text-xs text-text-muted truncate max-w-full block">
                                      {test.result.responseBody.slice(0, 200)}
                                    </code>
                                  ) : null}
                                </div>
                                <button
                                  className="opacity-70 hover:opacity-100 shrink-0"
                                  onClick={() =>
                                    setTestInline((s) => {
                                      const n = { ...s };
                                      delete n[w.id];
                                      return n;
                                    })
                                  }
                                >
                                  dismiss
                                </button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <WebhookDialog
        mode={dialogMode === "edit" ? "edit" : "create"}
        initial={editing}
        open={dialogMode != null}
        onOpenChange={(o) => !o && setDialogMode(null)}
        onCreated={onCreated}
        onSaved={onSaved}
      />

      <DeliveriesDrawer
        webhook={deliveriesFor}
        open={!!deliveriesFor}
        onClose={() => setDeliveriesFor(null)}
      />

      <SecretRevealDialog
        open={!!secretReveal}
        title={secretReveal?.title ?? ""}
        description={secretReveal?.description ?? null}
        secret={secretReveal?.secret ?? null}
        onClose={() => setSecretReveal(null)}
      />

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete webhook?</DialogTitle>
            <DialogDescription>
              This webhook will stop receiving events immediately. The delivery
              log will be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {confirmDelete ? (
            <div className="rounded-md border border-border bg-surface-1 px-3 py-2 text-sm">
              <code className="font-mono break-all">{confirmDelete.targetUrl}</code>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
              disabled={busyId === confirmDelete?.id}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => confirmDelete && runDelete(confirmDelete)}
              loading={busyId === confirmDelete?.id}
            >
              Delete webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmRotate}
        onOpenChange={(o) => !o && setConfirmRotate(null)}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Rotate signing secret?</DialogTitle>
            <DialogDescription>
              The current secret stops working immediately. You'll need to copy
              the new secret to your verification code. Plan for a brief window
              where signatures may fail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmRotate(null)}
              disabled={busyId === confirmRotate?.id}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => confirmRotate && runRotate(confirmRotate)}
              loading={busyId === confirmRotate?.id}
            >
              Rotate secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
