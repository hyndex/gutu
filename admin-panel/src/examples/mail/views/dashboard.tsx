import * as React from "react";
import { KPI } from "@/admin-primitives/KPI";
import { Spinner } from "@/primitives/Spinner";
import { mailApi, type MailThread } from "../lib/api";

export function MailDashboardPage(): React.ReactElement {
  const [unread, setUnread] = React.useState<number | null>(null);
  const [threads, setThreads] = React.useState<MailThread[] | null>(null);
  const [scheduled, setScheduled] = React.useState<number | null>(null);
  const [aiCalls, setAiCalls] = React.useState<number | null>(null);

  React.useEffect(() => {
    void (async (): Promise<void> => {
      try {
        const [t, s, u] = await Promise.all([
          mailApi.listThreads({ folder: "inbox", limit: 50 }),
          mailApi.listScheduled(),
          mailApi.aiUsage(),
        ]);
        setThreads(t.rows);
        setUnread(t.rows.filter((r) => r.unreadCount > 0).length);
        setScheduled(s.rows.length);
        setAiCalls((u.rows ?? []).reduce((a, r: { calls?: number }) => a + (Number(r.calls) || 0), 0));
      } catch { /* show partial */ }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Mail dashboard</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <KPI label="Unread (inbox)" value={unread === null ? "—" : String(unread)} />
        <KPI label="Scheduled sends" value={scheduled === null ? "—" : String(scheduled)} />
        <KPI label="AI calls (30d)" value={aiCalls === null ? "—" : String(aiCalls)} />
        <KPI label="Trackers blocked" value="—" />
      </div>
      <section className="rounded-lg border border-border bg-surface-0 p-3">
        <h2 className="mb-2 text-sm font-semibold">Recent activity</h2>
        {threads === null ? <Spinner /> : (
          <ul className="space-y-1 text-sm">
            {threads.slice(0, 10).map((t) => (
              <li key={t.id} className="truncate">
                <a className="text-accent" href={`#/mail/thread/${t.id}`}>{t.subject || "(no subject)"}</a>
                <span className="ml-2 text-text-muted">— {t.fromEmail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
