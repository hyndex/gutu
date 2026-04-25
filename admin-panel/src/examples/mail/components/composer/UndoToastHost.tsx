import * as React from "react";
import { Button } from "@/primitives/Button";
import { useMailStore, dropUndo } from "../../store";
import { mailApi } from "../../lib/api";

export function UndoToastHost(): React.ReactElement {
  const queue = useMailStore((s) => s.undoQueue);
  if (queue.length === 0) return <></>;
  return (
    <div className="fixed bottom-2 left-3 z-40 flex flex-col gap-2">
      {queue.map((t) => (
        <UndoToast key={t.id} id={t.id} releaseAt={t.releaseAt} subject={t.subject} recipients={t.recipients} />
      ))}
    </div>
  );
}

function UndoToast({ id, releaseAt, subject, recipients }: { id: string; releaseAt: string; subject: string; recipients: string }): React.ReactElement | null {
  const [secs, setSecs] = React.useState(() => Math.max(0, Math.round((new Date(releaseAt).getTime() - Date.now()) / 1000)));
  React.useEffect(() => {
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((new Date(releaseAt).getTime() - Date.now()) / 1000));
      setSecs(left);
      if (left <= 0) { dropUndo(id); clearInterval(t); }
    }, 250);
    return (): void => clearInterval(t);
  }, [id, releaseAt]);
  if (secs <= 0) return null;
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface-0 px-3 py-2 text-sm shadow-2xl">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">Sending “{subject}”…</div>
        <div className="truncate text-xs text-text-muted">to {recipients}</div>
      </div>
      <div className="text-xs text-text-muted">{secs}s</div>
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          try { await mailApi.undoSend(id); } catch { /* too late */ }
          dropUndo(id);
        }}
      >
        Undo
      </Button>
    </div>
  );
}
