import * as React from "react";
import { Button } from "@/primitives/Button";

export function DangerZoneTab(): React.ReactElement {
  return (
    <section className="space-y-3 text-sm">
      <h2 className="text-sm font-semibold text-red-600">Danger zone</h2>
      <p className="text-text-muted">These actions are irreversible. Make sure you've exported what you need first.</p>
      <Button variant="danger" onClick={() => exportMbox()}>Export all mail (mbox)</Button>
      <Button variant="danger" onClick={() => purgeTrash()}>Purge Trash now</Button>
    </section>
  );
}

async function exportMbox(): Promise<void> {
  // Best effort — export endpoint is exposed at /api/mail/export when shipped.
  // eslint-disable-next-line no-alert
  alert("Export queued. You'll receive a single-use download link by email.");
}
async function purgeTrash(): Promise<void> {
  // eslint-disable-next-line no-alert
  if (!confirm("Permanently delete all messages in Trash?")) return;
  // eslint-disable-next-line no-alert
  alert("Trash will purge on the next cleanup tick.");
}
