import * as React from "react";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/primitives/Input";
import { Button } from "@/primitives/Button";
import { Spinner } from "@/primitives/Spinner";
import { mailApi } from "../lib/api";

export function MailSearchPage(): React.ReactElement {
  const initial = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("q") ?? "";
  const [q, setQ] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [results, setResults] = React.useState<{ messageId: string; threadId: string; score: number; snippet?: string }[]>([]);

  const run = React.useCallback(async (): Promise<void> => {
    if (!q.trim()) { setResults([]); return; }
    setBusy(true);
    try {
      const r = await mailApi.search(q, { limit: 100 });
      setResults(r.results);
    } finally { setBusy(false); }
  }, [q]);

  React.useEffect(() => { void run(); }, [run]);

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-6">
      <div className="flex items-center gap-2">
        <SearchIcon size={16} aria-hidden />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void run(); }}
          placeholder="Search mail (try `from:alice has:attachment`)"
        />
        <Button onClick={() => void run()} disabled={busy}>{busy ? <Spinner size={12} /> : "Search"}</Button>
      </div>
      <div className="space-y-2">
        {results.map((r) => (
          <button
            key={r.messageId}
            type="button"
            onClick={() => { window.location.hash = `/mail/thread/${r.threadId}`; }}
            className="block w-full rounded-md border border-border bg-surface-0 p-3 text-left hover:border-accent"
          >
            <div className="text-xs text-text-muted">score {r.score.toFixed(3)}</div>
            <div
              className="text-sm"
              // safe: snippet wraps user content with <mark> tags only
              dangerouslySetInnerHTML={{ __html: r.snippet ?? "" }}
            />
          </button>
        ))}
        {!busy && results.length === 0 && q.trim() && (
          <div className="text-sm text-text-muted">No matches.</div>
        )}
      </div>
    </div>
  );
}
