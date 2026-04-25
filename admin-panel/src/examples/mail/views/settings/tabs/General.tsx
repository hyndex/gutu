import * as React from "react";
import { Button } from "@/primitives/Button";
import type { MailSettings } from "../../../lib/api";

export function GeneralTab({ settings, save }: { settings: MailSettings; save: (s: MailSettings) => Promise<void> }): React.ReactElement {
  const [theme, setTheme] = React.useState<"light" | "dark" | "system">(settings.appearance?.theme ?? "system");
  const [density, setDensity] = React.useState<"comfortable" | "compact">(settings.appearance?.density ?? "comfortable");
  const [undoSecs, setUndoSecs] = React.useState(settings.undoSeconds ?? 10);
  const onSave = (): Promise<void> => save({
    ...settings,
    appearance: { ...settings.appearance, theme, density },
    undoSeconds: undoSecs,
  });
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Appearance</h2>
      <div className="flex items-center gap-2">
        <label className="w-32 text-sm">Theme</label>
        <select className="rounded-md border border-border bg-surface-1 px-2 py-1 text-sm" value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}>
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="w-32 text-sm">Density</label>
        <select className="rounded-md border border-border bg-surface-1 px-2 py-1 text-sm" value={density} onChange={(e) => setDensity(e.target.value as "comfortable" | "compact")}>
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
        </select>
      </div>
      <h2 className="mt-4 text-sm font-semibold">Send</h2>
      <div className="flex items-center gap-2">
        <label className="w-32 text-sm">Undo window (sec)</label>
        <input type="number" min={0} max={60} className="w-24 rounded-md border border-border bg-surface-1 px-2 py-1 text-sm" value={undoSecs} onChange={(e) => setUndoSecs(parseInt(e.target.value, 10) || 0)} />
      </div>
      <Button onClick={() => void onSave()}>Save</Button>
    </section>
  );
}
