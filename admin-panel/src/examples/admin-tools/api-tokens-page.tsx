import * as React from "react";
import {
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Key,
  Copy,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Card, CardContent } from "@/admin-primitives/Card";
import { EmptyState } from "@/admin-primitives/EmptyState";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Label } from "@/primitives/Label";
import { Badge } from "@/primitives/Badge";
import { Spinner } from "@/primitives/Spinner";
import { Checkbox } from "@/primitives/Checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/primitives/Select";
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

/* ----------------------------- types ------------------------------------- */

interface ApiTokenScope {
  resource: string;
  verbs: string[];
}

type TokenStatus = "active" | "expired" | "revoked";

interface ApiToken {
  id: string;
  tenantId: string;
  name: string;
  prefix: string;
  scopes: ApiTokenScope[];
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  status: TokenStatus;
}

interface CreatedApiToken extends ApiToken {
  /** Returned only on POST. */
  token: string;
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

async function listTokens(): Promise<ApiToken[]> {
  const res = await fetch(`${apiBase()}/api-tokens`, {
    headers: authHeaders(false),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { rows: ApiToken[] };
  return body.rows;
}

async function createToken(input: {
  name: string;
  scopes: ApiTokenScope[];
  expiresAt: string | null;
}): Promise<CreatedApiToken> {
  const res = await fetch(`${apiBase()}/api-tokens`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as CreatedApiToken;
}

async function revokeToken(id: string): Promise<void> {
  const res = await fetch(`${apiBase()}/api-tokens/${id}`, {
    method: "DELETE",
    headers: authHeaders(false),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readError(res));
}

/* ----------------------------- helpers ----------------------------------- */

/** Resource catalog — common resources users will scope tokens to. The user
 *  can also type a custom resource id (free-text). */
const RESOURCE_CATALOG: { value: string; label: string }[] = [
  { value: "*", label: "All resources (*)" },
  { value: "crm.contact", label: "CRM contacts" },
  { value: "crm.account", label: "CRM accounts" },
  { value: "crm.deal", label: "CRM deals" },
  { value: "crm.activity", label: "CRM activities" },
  { value: "sales.order", label: "Sales orders" },
  { value: "sales.quote", label: "Sales quotes" },
  { value: "support.ticket", label: "Support tickets" },
  { value: "inventory.item", label: "Inventory items" },
  { value: "billing.invoice", label: "Billing invoices" },
  { value: "files.file", label: "Files" },
  { value: "audit.event", label: "Audit events" },
  { value: "platform.tenant", label: "Tenants" },
];

const VERBS: { value: string; label: string }[] = [
  { value: "read", label: "Read" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "*", label: "All (*)" },
];

interface ScopeTemplate {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  scopes: ApiTokenScope[];
}

const SCOPE_TEMPLATES: ScopeTemplate[] = [
  {
    id: "read-all",
    label: "Read all",
    description: "Read-only access to every resource",
    icon: <Sparkles className="h-3 w-3" />,
    scopes: [{ resource: "*", verbs: ["read"] }],
  },
  {
    id: "read-crm",
    label: "Read CRM only",
    description: "Read CRM contacts, accounts, deals, activities",
    icon: <Sparkles className="h-3 w-3" />,
    scopes: [
      { resource: "crm.contact", verbs: ["read"] },
      { resource: "crm.account", verbs: ["read"] },
      { resource: "crm.deal", verbs: ["read"] },
      { resource: "crm.activity", verbs: ["read"] },
    ],
  },
  {
    id: "full-access",
    label: "Full access",
    description: "All resources, all verbs — equivalent to admin",
    icon: <Sparkles className="h-3 w-3" />,
    scopes: [{ resource: "*", verbs: ["*"] }],
  },
];

function statusIntent(status: TokenStatus): "success" | "warning" | "danger" {
  if (status === "active") return "success";
  if (status === "expired") return "warning";
  return "danger";
}

function CopyableSecret({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="rounded-md border border-intent-warning/40 bg-intent-warning-bg/30 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-medium text-intent-warning">
        <AlertTriangle className="h-3.5 w-3.5" />
        {label ?? "Save this token now — it cannot be retrieved later"}
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

/** Render a compact chip for a single scope, e.g. "crm.contact: read,create". */
function ScopeChip({ scope }: { scope: ApiTokenScope }) {
  const verbs = scope.verbs.length > 0 ? scope.verbs.join(",") : "—";
  return (
    <Badge intent="accent" className="font-mono whitespace-nowrap">
      <span className="truncate">{scope.resource}</span>
      <span className="opacity-70">:</span>
      <span>{verbs}</span>
    </Badge>
  );
}

/* ----------------------------- create dialog ----------------------------- */

interface DraftScope {
  /** Stable client-side id. */
  key: string;
  resource: string;
  verbs: string[];
}

function newScopeKey(): string {
  return Math.random().toString(36).slice(2, 9);
}

function CreateTokenDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (t: CreatedApiToken) => void;
}) {
  const [name, setName] = React.useState("");
  const [scopes, setScopes] = React.useState<DraftScope[]>([
    { key: newScopeKey(), resource: "crm.contact", verbs: ["read"] },
  ]);
  const [expiresAt, setExpiresAt] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState<{ name?: boolean }>({});

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setScopes([{ key: newScopeKey(), resource: "crm.contact", verbs: ["read"] }]);
    setExpiresAt("");
    setApiError(null);
    setTouched({});
  }, [open]);

  const nameInvalid = !name.trim();
  const scopesInvalid =
    scopes.length === 0 ||
    scopes.some((s) => !s.resource.trim() || s.verbs.length === 0);
  const expiresInvalid = (() => {
    if (!expiresAt) return false;
    const d = new Date(expiresAt);
    return Number.isNaN(d.getTime()) || d.getTime() <= Date.now();
  })();

  const canSubmit = !submitting && !nameInvalid && !scopesInvalid && !expiresInvalid;

  const applyTemplate = (tpl: ScopeTemplate) => {
    setScopes(
      tpl.scopes.map((s) => ({
        key: newScopeKey(),
        resource: s.resource,
        verbs: [...s.verbs],
      })),
    );
  };

  const addScope = () => {
    setScopes((s) => [
      ...s,
      { key: newScopeKey(), resource: "*", verbs: ["read"] },
    ]);
  };

  const removeScope = (key: string) => {
    setScopes((s) => s.filter((x) => x.key !== key));
  };

  const updateScope = (key: string, patch: Partial<Omit<DraftScope, "key">>) => {
    setScopes((s) =>
      s.map((x) => (x.key === key ? { ...x, ...patch } : x)),
    );
  };

  const toggleVerb = (key: string, verb: string) => {
    setScopes((s) =>
      s.map((x) => {
        if (x.key !== key) return x;
        // "*" toggles solo — selecting it clears others; selecting a specific
        // verb removes "*".
        if (verb === "*") {
          return x.verbs.includes("*") ? { ...x, verbs: [] } : { ...x, verbs: ["*"] };
        }
        const without = x.verbs.filter((v) => v !== "*");
        return without.includes(verb)
          ? { ...x, verbs: without.filter((v) => v !== verb) }
          : { ...x, verbs: [...without, verb] };
      }),
    );
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const body = {
        name: name.trim(),
        scopes: scopes.map((s) => ({
          resource: s.resource.trim(),
          verbs: s.verbs,
        })),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      };
      const created = await createToken(body);
      onCreated(created);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create API token</DialogTitle>
          <DialogDescription>
            API tokens are long-lived bearer tokens for external integrations.
            Carry only the scopes the integration actually needs.
          </DialogDescription>
        </DialogHeader>

        {apiError ? (
          <div className="rounded-md border border-intent-danger/40 bg-intent-danger-bg/30 px-3 py-2 text-sm text-intent-danger">
            {apiError}
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tk-name" required>
              Name
            </Label>
            <Input
              id="tk-name"
              placeholder="e.g. Zapier integration"
              value={name}
              invalid={touched.name && nameInvalid}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            />
            {touched.name && nameInvalid ? (
              <span className="text-xs text-intent-danger">Name is required.</span>
            ) : (
              <span className="text-xs text-text-muted">
                Shown in the token list — pick something you'll recognise later.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Quick templates</Label>
            <div className="flex flex-wrap gap-2">
              {SCOPE_TEMPLATES.map((tpl) => (
                <Button
                  key={tpl.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => applyTemplate(tpl)}
                  iconLeft={tpl.icon}
                  title={tpl.description}
                >
                  {tpl.label}
                </Button>
              ))}
            </div>
            <span className="text-xs text-text-muted">
              Templates replace the current scope list.
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label required>Scopes</Label>
              <span className="text-xs text-text-muted">
                {scopes.length} {scopes.length === 1 ? "scope" : "scopes"}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {scopes.map((s) => {
                const isCustom = !RESOURCE_CATALOG.some(
                  (r) => r.value === s.resource,
                );
                return (
                  <div
                    key={s.key}
                    className="rounded-md border border-border bg-surface-1 p-2.5 flex flex-col gap-2"
                  >
                    <div className="flex items-start gap-2 flex-wrap">
                      <div className="flex-1 min-w-[220px] flex flex-col gap-1">
                        <span className="text-xs text-text-muted">Resource</span>
                        <Select
                          value={isCustom ? "__custom" : s.resource}
                          onValueChange={(v) => {
                            if (v === "__custom") {
                              updateScope(s.key, { resource: "" });
                            } else {
                              updateScope(s.key, { resource: v });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pick a resource" />
                          </SelectTrigger>
                          <SelectContent>
                            {RESOURCE_CATALOG.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                            <SelectItem value="__custom">Custom…</SelectItem>
                          </SelectContent>
                        </Select>
                        {isCustom ? (
                          <Input
                            placeholder="e.g. com.acme.widget"
                            value={s.resource}
                            invalid={!s.resource.trim()}
                            onChange={(e) =>
                              updateScope(s.key, { resource: e.target.value })
                            }
                            className="mt-1"
                          />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-[260px] flex flex-col gap-1">
                        <span className="text-xs text-text-muted">Verbs</span>
                        <div className="flex flex-wrap gap-2 items-center min-h-[2.25rem]">
                          {VERBS.map((v) => {
                            const checked = s.verbs.includes(v.value);
                            return (
                              <label
                                key={v.value}
                                className="inline-flex items-center gap-1.5 text-xs cursor-pointer"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() =>
                                    toggleVerb(s.key, v.value)
                                  }
                                />
                                <span className="text-text-secondary">
                                  {v.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {s.verbs.length === 0 ? (
                          <span className="text-xs text-intent-danger">
                            Pick at least one verb.
                          </span>
                        ) : null}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeScope(s.key)}
                        disabled={scopes.length <= 1}
                        title="Remove scope"
                        className="self-end"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={addScope}
              iconLeft={<Plus className="h-3.5 w-3.5" />}
              className="self-start"
            >
              Add scope
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tk-exp">Expiry (optional)</Label>
            <Input
              id="tk-exp"
              type="date"
              value={expiresAt}
              invalid={expiresInvalid}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            {expiresInvalid ? (
              <span className="text-xs text-intent-danger">
                Expiry must be in the future.
              </span>
            ) : (
              <span className="text-xs text-text-muted">
                Leave blank for an open-ended token.
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={!canSubmit}
            loading={submitting}
          >
            Create token
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- main page --------------------------------- */

export function ApiTokensPage() {
  const [rows, setRows] = React.useState<ApiToken[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [confirmRevoke, setConfirmRevoke] = React.useState<ApiToken | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [tokenReveal, setTokenReveal] = React.useState<{
    name: string;
    token: string;
  } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTokens();
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
        r.name.toLowerCase().includes(q) ||
        r.prefix.toLowerCase().includes(q) ||
        r.createdBy.toLowerCase().includes(q) ||
        r.scopes.some((s) => s.resource.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const onCreated = (t: CreatedApiToken) => {
    // Strip the secret before adding to the list — list rows never carry it.
    const { token, ...rest } = t;
    setRows((cur) => (cur ? [rest, ...cur] : [rest]));
    setCreateOpen(false);
    setTokenReveal({ name: t.name, token });
  };

  const runRevoke = async (t: ApiToken) => {
    setBusyId(t.id);
    try {
      await revokeToken(t.id);
      const now = new Date().toISOString();
      setRows((cur) =>
        cur
          ? cur.map((r) =>
              r.id === t.id
                ? { ...r, revokedAt: now, status: "revoked" as TokenStatus }
                : r,
            )
          : cur,
      );
      setConfirmRevoke(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="API tokens"
        description={
          rows
            ? `${rows.length} ${rows.length === 1 ? "token" : "tokens"} · ${rows.filter((r) => r.status === "active").length} active`
            : "Long-lived bearer tokens for external integrations."
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
              onClick={() => setCreateOpen(true)}
              iconLeft={<Plus className="h-3.5 w-3.5" />}
            >
              Create token
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
            placeholder="Search name, prefix, scope, creator…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!filtered ? (
        <div className="py-16 flex items-center justify-center text-sm text-text-muted">
          <Spinner size={14} />
          <span className="ml-2">Loading API tokens…</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Key className="h-5 w-5" />}
          title={rows && rows.length === 0 ? "No API tokens yet" : "No matches"}
          description={
            rows && rows.length === 0
              ? "Create one to let an external integration call the API on your behalf."
              : "No tokens match your search."
          }
          action={
            rows && rows.length === 0 ? (
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setCreateOpen(true)}
              >
                Create token
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
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left py-2 font-medium w-36">Prefix</th>
                  <th className="text-left py-2 font-medium">Scopes</th>
                  <th className="text-left py-2 font-medium w-32">Created</th>
                  <th className="text-left py-2 font-medium w-32">Last used</th>
                  <th className="text-left py-2 font-medium w-24">Status</th>
                  <th className="text-right py-2 font-medium w-32 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border-subtle last:border-b-0 hover:bg-surface-1 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-text-primary font-medium truncate">
                          {t.name}
                        </span>
                        <span className="text-xs text-text-muted truncate">
                          by {t.createdBy}
                          {t.expiresAt ? <> · expires {formatRelative(t.expiresAt)}</> : null}
                        </span>
                      </div>
                    </td>
                    <td className="py-2">
                      <code className="text-xs font-mono text-text-secondary">
                        {t.prefix}…
                      </code>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {t.scopes.length === 0 ? (
                          <span className="text-xs text-text-muted">none</span>
                        ) : (
                          t.scopes.map((s, i) => (
                            <ScopeChip key={`${t.id}-${i}`} scope={s} />
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-text-secondary">
                      {formatRelative(t.createdAt)}
                    </td>
                    <td className="py-2 text-text-secondary">
                      {t.lastUsedAt ? formatRelative(t.lastUsedAt) : (
                        <span className="text-text-muted">never</span>
                      )}
                    </td>
                    <td className="py-2">
                      <Badge intent={statusIntent(t.status)}>{t.status}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex justify-end">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setConfirmRevoke(t)}
                          disabled={t.status !== "active"}
                          iconLeft={<Trash2 className="h-3 w-3" />}
                          className="text-intent-danger hover:bg-intent-danger-bg/30 disabled:text-text-muted disabled:hover:bg-transparent"
                        >
                          Revoke
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <CreateTokenDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onCreated}
      />

      <Dialog
        open={!!tokenReveal}
        onOpenChange={(o) => !o && setTokenReveal(null)}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Token created</DialogTitle>
            <DialogDescription>
              Token <strong>{tokenReveal?.name}</strong> is ready. Save it now —
              it cannot be retrieved later. Use it as a{" "}
              <code className="font-mono text-xs">Authorization: Bearer …</code>{" "}
              header from your integration.
            </DialogDescription>
          </DialogHeader>
          {tokenReveal ? <CopyableSecret value={tokenReveal.token} /> : null}
          <DialogFooter>
            <Button variant="primary" onClick={() => setTokenReveal(null)}>
              I have copied it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmRevoke}
        onOpenChange={(o) => !o && setConfirmRevoke(null)}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Revoke this token?</DialogTitle>
            <DialogDescription>
              The token stops working immediately. Any integration using it will
              start receiving 401s. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {confirmRevoke ? (
            <div className="rounded-md border border-border bg-surface-1 px-3 py-2 text-sm flex flex-col gap-1">
              <span className="font-medium text-text-primary">
                {confirmRevoke.name}
              </span>
              <code className="font-mono text-xs text-text-muted">
                {confirmRevoke.prefix}…
              </code>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmRevoke(null)}
              disabled={busyId === confirmRevoke?.id}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => confirmRevoke && runRevoke(confirmRevoke)}
              loading={busyId === confirmRevoke?.id}
            >
              Revoke token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
