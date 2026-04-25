import * as React from "react";
import { Button } from "@/primitives/Button";
import { Switch } from "@/primitives/Switch";
import { Input } from "@/primitives/Input";
import { mailApi } from "../../../lib/api";

export function TenantPolicyTab(): React.ReactElement {
  const [policy, setPolicy] = React.useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { void mailApi.getTenantSettings().then(setPolicy).catch(() => undefined); }, []);
  if (!policy) return <div className="text-sm text-text-muted">Loading…</div>;

  const update = <K extends keyof typeof policy>(key: K, value: typeof policy[K]): void => {
    setPolicy((p) => ({ ...(p ?? {}), [key]: value }));
  };

  return (
    <section className="space-y-3">
      <Row label="AI features allowed" right={<Switch checked={!!policy.aiAllowed} onCheckedChange={(v: boolean) => update("aiAllowed", v)} aria-label="AI" />} />
      <Row label="Image proxy enforced" right={<Switch checked={!!policy.imageProxyEnforced} onCheckedChange={(v: boolean) => update("imageProxyEnforced", v)} aria-label="Image proxy" />} />
      <Row label="Require MFA for mail access" right={<Switch checked={!!policy.requireMfa} onCheckedChange={(v: boolean) => update("requireMfa", v)} aria-label="MFA" />} />
      <Row label="Require DKIM-signed outbound" right={<Switch checked={!!policy.requireDkim} onCheckedChange={(v: boolean) => update("requireDkim", v)} aria-label="DKIM" />} />
      <Row label="Default retention (days)" right={<Input type="number" className="w-24" value={Number(policy.defaultRetentionDays ?? 0)} onChange={(e) => update("defaultRetentionDays", parseInt(e.target.value, 10) || 0)} />} />
      <Row label="Max connections / user" right={<Input type="number" className="w-24" value={Number(policy.maxConnectionsPerUser ?? 5)} onChange={(e) => update("maxConnectionsPerUser", parseInt(e.target.value, 10) || 5)} />} />
      <Button disabled={saving} onClick={async () => { setSaving(true); try { await mailApi.putTenantSettings(policy); } finally { setSaving(false); } }}>Save policy</Button>
    </section>
  );
}

function Row({ label, right }: { label: string; right: React.ReactNode }): React.ReactElement {
  return <div className="flex items-center justify-between gap-2"><span className="text-sm">{label}</span>{right}</div>;
}
