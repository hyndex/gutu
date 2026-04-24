import * as React from "react";
import { Building2, Plus, Trash2, Archive } from "lucide-react";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/admin-primitives/Card";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Label } from "@/primitives/Label";
import { Badge } from "@/primitives/Badge";
import { Dialog, DialogContent } from "@/primitives/Dialog";
import { StatusDot } from "@/admin-primitives/StatusDot";
import { FreshnessIndicator } from "@/admin-primitives/FreshnessIndicator";
import { EmptyStateFramework } from "@/admin-primitives/EmptyStateFramework";
import { ErrorRecoveryFramework } from "@/admin-primitives/ErrorRecoveryFramework";
import { apiFetch, fetchPlatformConfig, authStore } from "@/runtime/auth";
import { useRuntime } from "@/runtime/context";

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  status: "active" | "suspended" | "archived";
  plan: string;
  createdAt: string;
  updatedAt: string;
}

async function loadTenants(): Promise<TenantRow[]> {
  const r = await apiFetch<{ tenants: TenantRow[] }>("/tenants");
  return r.tenants;
}

export function TenantManagementPage() {
  const runtime = useRuntime();
  const [rows, setRows] = React.useState<TenantRow[] | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());
  const [multisite, setMultisite] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const r = await loadTenants();
      setRows(r);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    void fetchPlatformConfig().then((c) => setMultisite(c.multisite));
  }, [refresh]);

  const archive = async (t: TenantRow) => {
    setBusyId(t.id);
    try {
      await apiFetch(`/tenants/${t.id}/archive`, { method: "POST" });
      runtime.actions.toast({ title: `Archived ${t.name}`, intent: "warning" });
      await refresh();
    } catch (err) {
      runtime.actions.toast({
        title: "Archive failed",
        description: err instanceof Error ? err.message : undefined,
        intent: "danger",
      });
    } finally {
      setBusyId(null);
    }
  };

  const hardDelete = async (t: TenantRow) => {
    const confirmed = await runtime.actions.confirm({
      title: `Permanently delete ${t.name}?`,
      description: `Type "${t.slug}" to confirm. This drops the tenant schema, memberships, domains, and all files. Cannot be undone.`,
      destructive: true,
    });
    if (!confirmed) return;
    setBusyId(t.id);
    try {
      await apiFetch(`/tenants/${t.id}/delete-hard`, {
        method: "POST",
        body: JSON.stringify({ confirm: "DELETE", slug: t.slug }),
      });
      runtime.actions.toast({ title: `Deleted ${t.name}`, intent: "danger" });
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

  const isAdmin = (authStore.user?.role ?? "") === "admin";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tenants"
        description="Workspaces, schema provisioning, memberships, and domains. Every mutation is audited."
        actions={
          <div className="flex items-center gap-2">
            <FreshnessIndicator lastUpdatedAt={lastUpdated} />
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setCreating(true)}
              >
                New tenant
              </Button>
            )}
          </div>
        }
      />

      {!multisite && (
        <Card>
          <CardContent className="py-3 text-xs text-text-muted flex items-start gap-2">
            <Building2 className="h-3.5 w-3.5 mt-0.5 text-accent" />
            <div>
              <div className="text-text-primary font-medium">Single-site mode</div>
              Multi-tenancy is installed but disabled. Set{" "}
              <code className="font-mono">MULTISITE=1</code> (requires Postgres) to
              enable schema-per-tenant isolation and domain-based routing. The
              default <strong>Main</strong> tenant below is used for all requests.
            </div>
          </CardContent>
        </Card>
      )}

      {error ? (
        <ErrorRecoveryFramework
          message={error.message}
          onRetry={refresh}
        />
      ) : rows === null ? (
        <Card>
          <CardContent className="py-10 text-center text-xs text-text-muted">
            Loading…
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyStateFramework
              kind="first-time"
              title="No tenants yet"
              description="Create your first workspace."
              primary={{ label: "New tenant", onClick: () => setCreating(true) }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-text-muted">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Slug</th>
                  <th className="text-left p-3">Plan</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border-subtle last:border-b-0 hover:bg-surface-1"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-text-muted" />
                        <span className="text-text-primary font-medium">{t.name}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs text-text-secondary">
                      {t.slug}
                    </td>
                    <td className="p-3">
                      <Badge intent="info">{t.plan}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="inline-flex items-center gap-1.5">
                        <StatusDot
                          intent={
                            t.status === "active"
                              ? "success"
                              : t.status === "suspended"
                                ? "warning"
                                : "neutral"
                          }
                        />
                        <span className="text-xs text-text-secondary">{t.status}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-text-muted">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {isAdmin && t.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={busyId === t.id}
                            iconLeft={<Archive className="h-3 w-3" />}
                            onClick={() => void archive(t)}
                          >
                            Archive
                          </Button>
                        )}
                        {isAdmin && t.plan !== "builtin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={busyId === t.id}
                            iconLeft={
                              <Trash2 className="h-3 w-3 text-intent-danger" />
                            }
                            onClick={() => void hardDelete(t)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <CreateTenantDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={async () => {
          await refresh();
          setCreating(false);
        }}
      />
    </div>
  );
}

function CreateTenantDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void | Promise<void>;
}) {
  const runtime = useRuntime();
  const [slug, setSlug] = React.useState("");
  const [name, setName] = React.useState("");
  const [plan, setPlan] = React.useState("free");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) { setSlug(""); setName(""); setPlan("free"); setError(null); }
  }, [open]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/tenants", {
        method: "POST",
        body: JSON.stringify({ slug: slug.trim(), name: name.trim(), plan }),
      });
      runtime.actions.toast({ title: `Created ${name}`, intent: "success" });
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="px-5 py-4 border-b border-border">
          <div className="text-sm font-semibold text-text-primary">New tenant</div>
          <div className="text-xs text-text-muted mt-0.5">
            Provisions a new schema and makes you its owner.
          </div>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="t-slug">Slug</Label>
            <Input
              id="t-slug"
              autoFocus
              placeholder="acme"
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_-]/g, "")
                    .slice(0, 63),
                )
              }
            />
            <span className="text-xs text-text-muted">
              URL-safe. Used as the Postgres schema name (a–z, 0–9, _, -). 2–63 chars.
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="t-name">Display name</Label>
            <Input
              id="t-name"
              placeholder="Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 120))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="t-plan">Plan</Label>
            <Input
              id="t-plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            />
          </div>
          {error && <div className="text-xs text-intent-danger">{error}</div>}
        </div>
        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={busy}
            disabled={slug.length < 2 || name.length < 1}
            onClick={submit}
            iconLeft={<Building2 className="h-3.5 w-3.5" />}
          >
            Create tenant
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
