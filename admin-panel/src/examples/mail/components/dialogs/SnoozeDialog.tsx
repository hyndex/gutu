/** Snooze picker — preset durations + custom datetime. */

import * as React from "react";
import { Button } from "@/primitives/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/primitives/Dialog";
import { snoozePresets } from "../../lib/format";

export interface SnoozeDialogProps {
  open: boolean;
  onClose: () => void;
  onChoose: (wakeAt: string, reason: string) => Promise<void> | void;
}

export function SnoozeDialog({ open, onClose, onChoose }: SnoozeDialogProps): React.ReactElement {
  const [custom, setCustom] = React.useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60_000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [busy, setBusy] = React.useState(false);
  const presets = React.useMemo(() => snoozePresets(), []);

  const choose = async (at: Date, reason: string): Promise<void> => {
    setBusy(true);
    try { await onChoose(at.toISOString(), reason); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Snooze conversation</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {presets.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void choose(p.at, p.label)}
              className="flex flex-col items-start gap-0.5 px-3 py-2 text-left"
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
          <Button
            type="button"
            disabled={busy || !custom}
            onClick={() => {
              const d = new Date(custom);
              if (!Number.isNaN(d.getTime())) void choose(d, "custom");
            }}
          >
            Snooze
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
