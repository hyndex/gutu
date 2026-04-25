import * as React from "react";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Spinner } from "@/primitives/Spinner";
import { useConnections } from "../../../hooks/use-connections";
import { mailApi } from "../../../lib/api";

export function ConnectionsTab(): React.ReactElement {
  const { connections, loading, reload } = useConnections();
  const [showImap, setShowImap] = React.useState(false);
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Connected accounts</h2>
      {loading ? <Spinner /> : (
        <ul className="divide-y divide-border rounded-md border border-border bg-surface-0">
          {connections.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <div className="flex-1">
                <div className="font-medium">{c.email}{c.isDefault && <span className="ml-2 rounded bg-emerald-500/15 px-1 text-xs text-emerald-700">default</span>}</div>
                <div className="text-xs text-text-muted">{c.provider} · status {c.status}{c.lastSyncAt ? ` · last sync ${new Date(c.lastSyncAt).toLocaleString()}` : ""}</div>
              </div>
              {!c.isDefault && <Button size="sm" variant="ghost" onClick={async () => { await mailApi.setDefaultConnection(c.id); await reload(); }}>Make default</Button>}
              {c.status !== "disabled" && <Button size="sm" variant="ghost" onClick={async () => { await mailApi.disableConnection(c.id); await reload(); }}>Disable</Button>}
              <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Remove this account?")) { await mailApi.removeConnection(c.id); await reload(); } }}>Remove</Button>
            </li>
          ))}
          {connections.length === 0 && <li className="px-3 py-2 text-sm text-text-muted">No accounts connected.</li>}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => connect("google")}>Connect Google</Button>
        <Button variant="secondary" onClick={() => connect("microsoft")}>Connect Microsoft</Button>
        <Button variant="ghost" onClick={() => setShowImap((v) => !v)}>{showImap ? "Hide IMAP form" : "Add IMAP / SMTP"}</Button>
      </div>
      {showImap && <ImapForm onCreated={reload} />}
    </section>
  );
}

async function connect(provider: "google" | "microsoft"): Promise<void> {
  const r = await mailApi.startOauth(provider, window.location.hash);
  window.location.assign(r.url);
}

function ImapForm({ onCreated }: { onCreated: () => Promise<void> }): React.ReactElement {
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [imapHost, setImapHost] = React.useState("");
  const [imapPort, setImapPort] = React.useState(993);
  const [smtpHost, setSmtpHost] = React.useState("");
  const [smtpPort, setSmtpPort] = React.useState(587);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (): Promise<void> => {
    setBusy(true);
    try {
      await mailApi.attachImap({ email, displayName: name || undefined, imapHost, imapPort, smtpHost, smtpPort, username, password });
      await onCreated();
      setPassword("");
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err instanceof Error ? err.message : "attach failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 gap-2 rounded-md border border-border bg-surface-0 p-3 sm:grid-cols-2">
      <Input placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input placeholder="IMAP host" value={imapHost} onChange={(e) => setImapHost(e.target.value)} />
      <Input type="number" placeholder="IMAP port" value={imapPort} onChange={(e) => setImapPort(parseInt(e.target.value, 10) || 993)} />
      <Input placeholder="SMTP host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
      <Input type="number" placeholder="SMTP port" value={smtpPort} onChange={(e) => setSmtpPort(parseInt(e.target.value, 10) || 587)} />
      <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <Input type="password" placeholder="Password / app password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="sm:col-span-2"><Button disabled={busy} onClick={() => void submit()}>{busy ? "Connecting…" : "Connect"}</Button></div>
    </div>
  );
}
