import * as React from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Textarea } from "@/primitives/Textarea";
import { mailApi } from "../../../lib/api";

interface Sig { id: string; name: string; bodyHtml: string; default: boolean }

export function SignaturesTab(): React.ReactElement {
  const [sigs, setSigs] = React.useState<Sig[]>([]);
  const [name, setName] = React.useState("Default");
  const [body, setBody] = React.useState("");
  const reload = React.useCallback(async (): Promise<void> => {
    const r = await mailApi.listSignatures();
    setSigs(r.rows);
  }, []);
  React.useEffect(() => { void reload(); }, [reload]);
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Signatures</h2>
      <ul className="divide-y divide-border rounded-md border border-border bg-surface-0">
        {sigs.map((s) => <Row key={s.id} sig={s} reload={reload} />)}
        {sigs.length === 0 && <li className="px-3 py-2 text-sm text-text-muted">No signatures yet.</li>}
      </ul>
      <div className="space-y-2 rounded-md border border-border bg-surface-0 p-3">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea rows={5} placeholder="Signature HTML" value={body} onChange={(e) => setBody(e.target.value)} />
        <Button onClick={async () => { await mailApi.saveSignature({ name, bodyHtml: body, default: sigs.length === 0 }); await reload(); setBody(""); }}><Plus size={14} className="mr-1" />Add</Button>
      </div>
    </section>
  );
}

function Row({ sig, reload }: { sig: Sig; reload: () => Promise<void> }): React.ReactElement {
  const [name, setName] = React.useState(sig.name);
  const [body, setBody] = React.useState(sig.bodyHtml);
  return (
    <li className="space-y-1 px-3 py-2">
      <div className="flex items-center gap-2">
        <Input className="flex-1" value={name} onChange={(e) => setName(e.target.value)} />
        {sig.default && <span className="rounded bg-emerald-500/15 px-1 text-xs text-emerald-700">default</span>}
        <Button size="sm" variant="ghost" onClick={async () => { await mailApi.saveSignature({ id: sig.id, name, bodyHtml: body, default: sig.default }); await reload(); }}><Save size={14} /></Button>
        <Button size="sm" variant="ghost" onClick={async () => { await mailApi.deleteSignature(sig.id); await reload(); }}><Trash2 size={14} /></Button>
      </div>
      <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
    </li>
  );
}
