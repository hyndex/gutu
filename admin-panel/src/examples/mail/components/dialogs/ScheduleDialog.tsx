/** Schedule-send picker — preset times + custom datetime. */

import * as React from "react";
import { Button } from "@/primitives/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/primitives/Dialog";

export interface ScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  onChoose: (sendAt: string) => Promise<void> | void;
}

function presets(): { label: string; at: Date }[] {
  const now = new Date();
  const tomorrow8 = new Date(now);
  tomorrow8.setDate(tomorrow8.getDate() + 1);
  tomorrow8.setHours(8, 0, 0, 0);
  const tomorrow1 = new Date(now);
  tomorrow1.setDate(tomorrow1.getDate() + 1);
  tomorrow1.setHours(13, 0, 0, 0);
  const monday8 = new Date(now);
  monday8.setDate(monday8.getDate() + ((1 - monday8.getDay() + 7) % 7 || 7));
  monday8.setHours(8, 0, 0, 0);
  return [
    { label: "Tomorrow morning (8am)", at: tomorrow8 },
    { label: "Tomorrow afternoon (1pm)", at: tomorrow1 },
    { label: "Next Monday (8am)", at: monday8 },
  ];
}

export function ScheduleDialog({ open, onClose, onChoose }: ScheduleDialogProps): React.ReactElement {
  const [custom, setCustom] = React.useState(() => {
    const d = new Date(Date.now() + 60 * 60_000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [busy, setBusy] = React.useState(false);

  const choose = async (at: Date): Promise<void> => {
    if (at.getTime() < Date.now() + 30_000) {
      // eslint-disable-next-line no-alert
      alert("Pick a time at least 30 seconds in the future.");
      return;
    }
    setBusy(true);
    try { await onChoose(at.toISOString()); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule send</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          {presets().map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void choose(p.at)}
              className="flex w-full items-center justify-between"
            >
              <span>{p.label}</span>
              <span className="text-xs text-text-muted">{p.at.toLocaleString()}</span>
            </Button>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-text-muted">Custom date &amp; time</label>
          <input
            type="datetime-local"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="w-full rounded-md border border-border bg-surface-1 px-2 py-1 text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" disabled={busy || !custom} onClick={() => {
            const d = new Date(custom);
            if (!Number.isNaN(d.getTime())) void choose(d);
          }}>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
