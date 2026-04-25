import * as React from "react";
import { Sparkles, RefreshCcw } from "lucide-react";
import { Button } from "@/primitives/Button";
import { Spinner } from "@/primitives/Spinner";
import { mailApi } from "../../lib/api";

export function AISummaryPanel({ threadId }: { threadId: string }): React.ReactElement {
  const [state, setState] = React.useState<"idle" | "loading" | "ready" | "error">("idle");
  const [tldr, setTldr] = React.useState("");
  const [bullets, setBullets] = React.useState<string[]>([]);
  const [error, setError] = React.useState("");

  const run = React.useCallback(async (): Promise<void> => {
    setState("loading");
    try {
      const r = await mailApi.aiSummary(threadId);
      setTldr(r.tldr);
      setBullets(r.bullets);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "summary failed");
      setState("error");
    }
  }, [threadId]);

  return (
    <section className="rounded-lg border border-border bg-surface-1 p-3">
      <header className="mb-2 flex items-center gap-1 text-sm font-semibold">
        <Sparkles size={14} aria-hidden /> AI summary
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void run()} aria-label="Regenerate">
          <RefreshCcw size={12} />
        </Button>
      </header>
      {state === "idle" && <Button size="sm" variant="secondary" onClick={() => void run()}>Summarize this thread</Button>}
      {state === "loading" && <div className="flex items-center gap-2 text-sm text-text-muted"><Spinner size={12} /> Working…</div>}
      {state === "error" && <div className="text-sm text-red-600">{error}</div>}
      {state === "ready" && (
        <div className="space-y-2 text-sm">
          {tldr && <p className="font-medium">{tldr}</p>}
          {bullets.length > 0 && (
            <ul className="ml-4 list-disc space-y-1 text-text-secondary">
              {bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
