import * as React from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/primitives/Button";
import { Spinner } from "@/primitives/Spinner";
import { mailApi } from "../../lib/api";

export function SmartReplySuggestions({ threadId, onPick }: { threadId: string; onPick: (text: string) => void }): React.ReactElement {
  const [state, setState] = React.useState<"idle" | "loading" | "ready" | "error">("idle");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

  const run = React.useCallback(async (): Promise<void> => {
    setState("loading");
    try {
      const r = await mailApi.aiSmartReply(threadId);
      setSuggestions(r.suggestions);
      setState("ready");
    } catch { setState("error"); }
  }, [threadId]);

  return (
    <section className="rounded-lg border border-border bg-surface-1 p-3">
      <header className="mb-2 flex items-center gap-1 text-sm font-semibold">
        <Wand2 size={14} aria-hidden /> Smart reply
      </header>
      {state === "idle" && <Button size="sm" variant="secondary" onClick={() => void run()}>Suggest replies</Button>}
      {state === "loading" && <div className="flex items-center gap-2 text-sm text-text-muted"><Spinner size={12} /> Drafting…</div>}
      {state === "error" && <div className="text-sm text-red-600">Couldn't draft. Try again.</div>}
      {state === "ready" && (
        <div className="flex flex-col gap-1.5">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="rounded-md border border-border bg-surface-0 px-2 py-1.5 text-left text-sm hover:border-accent"
              onClick={() => onPick(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
