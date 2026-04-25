import * as React from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { useLabels } from "../hooks/use-labels";
import { mailApi } from "../lib/api";

export function MailLabelManagerPage(): React.ReactElement {
  const { labels, reload } = useLabels();
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#6366F1");
  const create = async (): Promise<void> => {
    if (!name.trim()) return;
    await mailApi.createLabel({ name: name.trim(), color });
    setName("");
    await reload();
  };
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Labels</h1>
      <section className="flex items-end gap-2 rounded-md border border-border bg-surface-0 p-3">
        <div className="flex-1">
          <label className="block text-xs text-text-muted">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project Apollo" />
        </div>
        <div>
          <label className="block text-xs text-text-muted">Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-16 rounded border border-border" />
        </div>
        <Button onClick={() => void create()}><Plus size={14} className="mr-1" />Create</Button>
      </section>
      <ul className="divide-y divide-border rounded-md border border-border bg-surface-0">
        {labels.map((l) => (
          <LabelRow key={l.id} label={l} onChange={reload} />
        ))}
        {labels.length === 0 && <li className="px-3 py-2 text-sm text-text-muted">No labels yet.</li>}
      </ul>
    </div>
  );
}

function LabelRow({ label, onChange }: { label: { id: string; name: string; color?: string; system?: boolean }; onChange: () => Promise<void> | void }): React.ReactElement {
  const [name, setName] = React.useState(label.name);
  const [color, setColor] = React.useState(label.color ?? "#6366F1");
  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-10 rounded border border-border" />
      <Input className="flex-1" value={name} onChange={(e) => setName(e.target.value)} />
      <Button size="sm" variant="ghost" onClick={async () => { await mailApi.updateLabel(label.id, { name, color }); await onChange(); }}>
        <Save size={14} />
      </Button>
      {!label.system && (
        <Button size="sm" variant="ghost" onClick={async () => { await mailApi.deleteLabel(label.id); await onChange(); }}>
          <Trash2 size={14} />
        </Button>
      )}
    </li>
  );
}
