import * as React from "react";
import { Plus, Trash2, Play, Save } from "lucide-react";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Spinner } from "@/primitives/Spinner";
import { mailApi } from "../lib/api";

interface RuleSummary {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  when: unknown;
  then: { kind: string; args?: Record<string, unknown> }[];
}

export function MailFiltersPage(): React.ReactElement {
  const [rules, setRules] = React.useState<RuleSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [fromContains, setFromContains] = React.useState("");
  const [actionLabel, setActionLabel] = React.useState("");

  const reload = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const r = await mailApi.listRules();
      setRules(r.rows);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void reload(); }, [reload]);

  const create = async (): Promise<void> => {
    if (!name.trim()) return;
    await mailApi.createRule({
      name,
      enabled: true,
      order: 100,
      when: { kind: "leaf", leaf: { field: "fromEmail", op: "contains", value: fromContains } },
      then: [
        ...(actionLabel ? [{ kind: "applyLabel", args: { labelId: actionLabel } }] : []),
        { kind: "markRead" },
      ],
    });
    setName("");
    setFromContains("");
    setActionLabel("");
    await reload();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Filters & rules</h1>
      <p className="text-sm text-text-muted">Rules apply to incoming messages before they reach your inbox.</p>
      <section className="space-y-2 rounded-md border border-border bg-surface-0 p-3">
        <Input placeholder="Rule name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="When sender contains…" value={fromContains} onChange={(e) => setFromContains(e.target.value)} />
        <Input placeholder="Then apply label id (optional)" value={actionLabel} onChange={(e) => setActionLabel(e.target.value)} />
        <Button onClick={() => void create()}><Plus size={14} className="mr-1" />Add rule</Button>
      </section>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-text-muted"><Spinner size={14} /> Loading…</div>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-surface-0">
          {rules.map((r) => <RuleRow key={r.id} rule={r} reload={reload} />)}
          {rules.length === 0 && <li className="px-3 py-2 text-sm text-text-muted">No rules yet.</li>}
        </ul>
      )}
    </div>
  );
}

function RuleRow({ rule, reload }: { rule: RuleSummary; reload: () => Promise<void> }): React.ReactElement {
  const [name, setName] = React.useState(rule.name);
  const [enabled, setEnabled] = React.useState(rule.enabled);
  const [dry, setDry] = React.useState<{ scanned: number; matched: number } | null>(null);
  return (
    <li className="space-y-1 px-3 py-2">
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} aria-label="Enable" />
        <Input className="flex-1" value={name} onChange={(e) => setName(e.target.value)} />
        <Button size="sm" variant="ghost" onClick={async () => { await mailApi.updateRule(rule.id, { name, enabled }); await reload(); }}><Save size={14} /></Button>
        <Button size="sm" variant="ghost" onClick={async () => { setDry(await mailApi.dryRunRule(rule.id)); }}><Play size={14} /></Button>
        <Button size="sm" variant="ghost" onClick={async () => { await mailApi.deleteRule(rule.id); await reload(); }}><Trash2 size={14} /></Button>
      </div>
      {dry && <div className="ml-6 text-xs text-text-muted">Scanned {dry.scanned}, would match {dry.matched}.</div>}
      <pre className="ml-6 text-xs text-text-muted whitespace-pre-wrap">{JSON.stringify({ when: rule.when, then: rule.then }, null, 2)}</pre>
    </li>
  );
}
