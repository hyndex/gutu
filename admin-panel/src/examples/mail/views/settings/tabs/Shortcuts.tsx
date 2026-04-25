import * as React from "react";
import { Button } from "@/primitives/Button";
import type { MailSettings } from "../../../lib/api";

const DEFAULT_BINDINGS: Record<string, string[]> = {
  compose: ["c"],
  reply: ["r"],
  replyAll: ["a"],
  forward: ["f"],
  archive: ["e"],
  trash: ["#"],
  markSpam: ["!"],
  star: ["s"],
  search: ["/"],
  next: ["j"],
  prev: ["k"],
  selectAll: ["*", "a"],
  snooze: ["b"],
  schedule: ["g", "s"],
  switchAccount: ["g", "a"],
};

export function ShortcutsTab({ settings, save }: { settings: MailSettings; save: (s: MailSettings) => Promise<void> }): React.ReactElement {
  const [bindings, setBindings] = React.useState<Record<string, string[]>>({ ...DEFAULT_BINDINGS, ...(settings.shortcuts ?? {}) });
  const updateField = (action: string, key: string): void => {
    const split = key.split(/[+ ]/).map((s) => s.trim()).filter(Boolean);
    setBindings((prev) => ({ ...prev, [action]: split }));
  };
  return (
    <section className="space-y-3">
      <table className="w-full text-sm">
        <thead className="text-xs text-text-muted"><tr><th className="text-left">Action</th><th className="text-left">Keys</th></tr></thead>
        <tbody>
          {Object.entries(bindings).map(([action, keys]) => (
            <tr key={action} className="border-b border-border">
              <td className="py-1 capitalize">{action.replace(/([A-Z])/g, " $1")}</td>
              <td className="py-1"><input className="rounded-md border border-border bg-surface-1 px-2 py-1 text-sm font-mono" value={keys.join(" ")} onChange={(e) => updateField(action, e.target.value)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button onClick={() => void save({ ...settings, shortcuts: bindings })}>Save</Button>
    </section>
  );
}
