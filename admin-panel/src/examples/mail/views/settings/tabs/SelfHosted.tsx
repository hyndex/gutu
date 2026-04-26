/** Self-hosted mail server settings — point the framework at a JMAP
 *  server (Stalwart, Cyrus, Apache James) and generate the DNS records
 *  to publish for inbound mail to land at the new server.
 *
 *  The flow is split into two cards:
 *
 *    1. **Server connection.** URL + admin token + default From address.
 *       A "Probe" button hits the JMAP `.well-known` endpoint with the
 *       supplied credentials and reports `apiUrl` + `accountId` + the
 *       capability list — exactly what the JmapDriver sees on bootstrap.
 *
 *    2. **DNS records.** Domain + DKIM public key generate the MX / SPF
 *       / DKIM / DMARC strings the operator must publish. We deliberately
 *       do NOT push DNS — that's the operator's tool of choice
 *       (Cloudflare API, Route53, terraform). We just produce the values.
 *
 *  Errors at every step are surfaced inline. The Probe button reports
 *  the precise HTTP status + body so configuration mistakes (typo'd
 *  URL, expired token, wrong host) get fixed in seconds rather than
 *  bouncing through CLI logs. */

import * as React from "react";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Label } from "@/primitives/Label";
import { Textarea } from "@/primitives/Textarea";

interface SelfHostedConfig {
  configured: boolean;
  connectionId?: string;
  baseUrl?: string;
  defaultEmail?: string;
  displayName?: string;
}

interface ProbeResult {
  ok: boolean;
  apiUrl?: string;
  hasMailAccount?: boolean;
  capabilities?: string[];
  status?: number;
  body?: string;
  error?: string;
}

interface DnsRecord {
  name: string;
  value: string;
  priority?: number;
}

interface DnsBundle {
  mx: DnsRecord;
  spf: DnsRecord;
  dkim: DnsRecord;
  dmarc: DnsRecord;
  tlsRpt?: DnsRecord;
  mtaSts?: DnsRecord;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = localStorage.getItem("gutu.auth.token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`/api${path}`, { ...init, headers, credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function SelfHostedTab(): React.ReactElement {
  const [config, setConfig] = React.useState<SelfHostedConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | undefined>();

  // Form state for the connection card.
  const [baseUrl, setBaseUrl] = React.useState("");
  const [token, setToken] = React.useState("");
  const [defaultEmail, setDefaultEmail] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [probing, setProbing] = React.useState(false);
  const [probe, setProbe] = React.useState<ProbeResult | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<string | undefined>();

  const refreshConfig = React.useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const c = await api<SelfHostedConfig>("/mail/self-hosted");
      setConfig(c);
      if (c.baseUrl) setBaseUrl(c.baseUrl);
      if (c.defaultEmail) setDefaultEmail(c.defaultEmail);
      if (c.displayName) setDisplayName(c.displayName);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshConfig();
  }, [refreshConfig]);

  const handleProbe = async (): Promise<void> => {
    if (!baseUrl || !token) {
      setProbe({ ok: false, error: "URL and token required" });
      return;
    }
    setProbing(true);
    setProbe(null);
    try {
      const r = await api<ProbeResult>("/mail/self-hosted/probe", {
        method: "POST",
        body: JSON.stringify({ baseUrl, token }),
      });
      setProbe(r);
    } catch (err) {
      setProbe({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setProbing(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setError(undefined);
    try {
      await api("/mail/self-hosted", {
        method: "POST",
        body: JSON.stringify({ baseUrl, token, defaultEmail, displayName: displayName || undefined }),
      });
      setSavedAt(new Date().toLocaleTimeString());
      setToken(""); // never keep the plaintext in memory after save
      await refreshConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Self-hosted mail server</h2>
        <p className="text-xs text-text-muted">
          Connect a self-hosted JMAP server (Stalwart, Cyrus, Apache James). The
          framework will use it for inbound and outbound mail through the same
          pipeline that handles Gmail and Outlook accounts.
        </p>
      </div>

      {/* CONNECTION CARD */}
      <div className="rounded-md border border-border bg-surface-0 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Connection</div>
          {config?.configured && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-success-soft text-success-strong">
              Configured
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-xs text-text-muted">Loading…</div>
        ) : (
          <>
            <Field label="JMAP base URL" hint="e.g. https://mail.example.com — no trailing slash">
              <Input
                type="url"
                placeholder="https://mail.example.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </Field>

            <Field label="Admin / API token" hint="Stored encrypted at rest. Stalwart issues tokens via its admin UI.">
              <Input
                type="password"
                placeholder={config?.configured ? "••••• (saved — paste a new token to rotate)" : "Bearer …"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Default From address" hint="Used as the envelope sender for outbound mail.">
                <Input
                  type="email"
                  placeholder="hello@example.com"
                  value={defaultEmail}
                  onChange={(e) => setDefaultEmail(e.target.value)}
                />
              </Field>
              <Field label="Display name (optional)">
                <Input
                  type="text"
                  placeholder="Self-hosted (mail.example.com)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleProbe}
                disabled={probing || !baseUrl || !token}
              >
                {probing ? "Probing…" : "Probe connection"}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !baseUrl || !token || !defaultEmail}
              >
                {saving ? "Saving…" : config?.configured ? "Update" : "Save"}
              </Button>
              {savedAt && (
                <span className="text-xs text-text-muted">Saved at {savedAt}</span>
              )}
              {error && (
                <span className="text-xs text-danger">{error}</span>
              )}
            </div>

            {probe && (
              <div className={`text-xs rounded p-2 ${probe.ok ? "bg-success-soft" : "bg-danger-soft"}`}>
                {probe.ok ? (
                  <>
                    <div className="font-medium">✓ Reachable</div>
                    <div>API URL: <code>{probe.apiUrl}</code></div>
                    <div>Mail account: {probe.hasMailAccount ? "yes" : "missing — token might lack mail scope"}</div>
                    <div>Capabilities: {(probe.capabilities ?? []).join(", ") || "none"}</div>
                  </>
                ) : (
                  <>
                    <div className="font-medium">✗ Probe failed</div>
                    {probe.status && <div>Status: {probe.status}</div>}
                    {probe.body && <div className="font-mono">{probe.body}</div>}
                    {probe.error && <div className="font-mono">{probe.error}</div>}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* DNS RECORDS CARD */}
      <DnsRecordsCard />
    </section>
  );
}

/** Renders the DKIM-aware DNS bundle generator. Lives in its own
 *  component so the connection card stays small. */
function DnsRecordsCard(): React.ReactElement {
  const [domain, setDomain] = React.useState("");
  const [mailHost, setMailHost] = React.useState("");
  const [dkimSelector, setDkimSelector] = React.useState("default");
  const [dkimPublicKey, setDkimPublicKey] = React.useState("");
  const [dkimKeyType, setDkimKeyType] = React.useState<"rsa" | "ed25519">("rsa");
  const [dmarcPolicy, setDmarcPolicy] = React.useState<"none" | "quarantine" | "reject">("none");
  const [bundle, setBundle] = React.useState<{ bundle: DnsBundle; zoneFile: string } | null>(null);
  const [error, setError] = React.useState<string | undefined>();
  const [building, setBuilding] = React.useState(false);

  const onBuild = async (): Promise<void> => {
    setBuilding(true);
    setError(undefined);
    setBundle(null);
    try {
      const res = await api<{ bundle: DnsBundle; zoneFile: string }>(
        "/mail/self-hosted/dns",
        {
          method: "POST",
          body: JSON.stringify({
            domain,
            mailHost: mailHost || `mail.${domain}`,
            dkimSelector,
            dkimPublicKeyBase64: dkimPublicKey.replace(/\s+/g, ""),
            dkimKeyType,
            dmarcPolicy,
          }),
        },
      );
      setBundle(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="rounded-md border border-border bg-surface-0 p-4 space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-medium">DNS records</div>
        <p className="text-xs text-text-muted">
          Publish these records at your DNS provider so inbound mail at <code>@your-domain.com</code> reaches your Stalwart server.
          The framework only generates the strings — it never touches your DNS zone.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Domain" hint="example.com (no protocol, no trailing slash)">
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" />
        </Field>
        <Field label="Mail host" hint="Hostname of the Stalwart server. Defaults to mail.<domain>.">
          <Input value={mailHost} onChange={(e) => setMailHost(e.target.value)} placeholder="mail.example.com" />
        </Field>
        <Field label="DKIM selector">
          <Input value={dkimSelector} onChange={(e) => setDkimSelector(e.target.value)} placeholder="default" />
        </Field>
        <Field label="DKIM key type">
          <select
            value={dkimKeyType}
            onChange={(e) => setDkimKeyType(e.target.value as "rsa" | "ed25519")}
            className="h-8 w-full rounded border border-border bg-surface-0 px-2 text-sm"
          >
            <option value="rsa">RSA (universal)</option>
            <option value="ed25519">Ed25519 (modern, smaller)</option>
          </select>
        </Field>
        <Field label="DMARC policy" hint="Start with 'none' for monitoring; tighten to 'quarantine' then 'reject'.">
          <select
            value={dmarcPolicy}
            onChange={(e) => setDmarcPolicy(e.target.value as "none" | "quarantine" | "reject")}
            className="h-8 w-full rounded border border-border bg-surface-0 px-2 text-sm"
          >
            <option value="none">none (monitor)</option>
            <option value="quarantine">quarantine</option>
            <option value="reject">reject</option>
          </select>
        </Field>
      </div>

      <Field label="DKIM public key (base64)" hint="Get this from Stalwart's admin UI → Domains → DKIM.">
        <Textarea
          value={dkimPublicKey}
          onChange={(e) => setDkimPublicKey(e.target.value)}
          placeholder="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A…"
          rows={4}
          className="font-mono text-xs"
        />
      </Field>

      <div className="flex items-center gap-2">
        <Button onClick={onBuild} disabled={building || !domain || !dkimPublicKey} size="sm">
          {building ? "Building…" : "Generate records"}
        </Button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>

      {bundle && (
        <div className="space-y-2 pt-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Records to publish
          </div>
          <DnsRow label="MX" record={bundle.bundle.mx} />
          <DnsRow label="SPF (TXT)" record={bundle.bundle.spf} />
          <DnsRow label="DKIM (TXT)" record={bundle.bundle.dkim} />
          <DnsRow label="DMARC (TXT)" record={bundle.bundle.dmarc} />
          {bundle.bundle.tlsRpt && <DnsRow label="TLSRPT (TXT)" record={bundle.bundle.tlsRpt} />}
          {bundle.bundle.mtaSts && <DnsRow label="MTA-STS (TXT)" record={bundle.bundle.mtaSts} />}
          <details className="text-xs">
            <summary className="cursor-pointer text-text-muted">Zone-file format (paste into BIND, PowerDNS)</summary>
            <pre className="mt-1 rounded bg-surface-1 p-2 text-[10px] overflow-x-auto whitespace-pre">
              {bundle.zoneFile}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function DnsRow({ label, record }: { label: string; record: DnsRecord }): React.ReactElement {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 text-xs items-start">
      <div className="font-medium text-text-muted">{label}</div>
      <div className="space-y-0.5">
        <div className="font-mono text-[11px] text-text-primary truncate" title={record.name}>
          {record.name}
          {record.priority !== undefined && <span className="text-text-muted"> (priority {record.priority})</span>}
        </div>
        <div className="font-mono text-[11px] text-text-muted break-all">{record.value}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <div className="text-[10px] text-text-muted">{hint}</div>}
    </div>
  );
}
