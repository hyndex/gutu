import * as React from "react";
import { Spinner } from "@/primitives/Spinner";
import { mailApi } from "../lib/api";

export function MailDeveloperPage(): React.ReactElement {
  const [usage, setUsage] = React.useState<{ window: string; rows: Record<string, unknown>[] } | null>(null);
  const [scheduled, setScheduled] = React.useState<{ rows: unknown[] } | null>(null);

  React.useEffect(() => {
    void (async () => {
      const [u, s] = await Promise.all([mailApi.aiUsage(), mailApi.listScheduled()]);
      setUsage(u);
      setScheduled({ rows: s.rows });
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Developer</h1>
      <section>
        <h2 className="mb-2 text-sm font-semibold">AI usage ({usage?.window ?? "30d"})</h2>
        {!usage ? <Spinner /> : <pre className="overflow-x-auto rounded-md border border-border bg-surface-0 p-3 text-xs">{JSON.stringify(usage.rows, null, 2)}</pre>}
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">Send queue</h2>
        {!scheduled ? <Spinner /> : <pre className="overflow-x-auto rounded-md border border-border bg-surface-0 p-3 text-xs">{JSON.stringify(scheduled.rows, null, 2)}</pre>}
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">Endpoints</h2>
        <pre className="overflow-x-auto rounded-md border border-border bg-surface-0 p-3 text-xs">{[
          "GET    /api/mail/connections",
          "POST   /api/mail/connections/oauth/:provider/start",
          "GET    /api/mail/connections/oauth/:provider/callback",
          "POST   /api/mail/connections/imap",
          "POST   /api/mail/connections/:id/default | /disable",
          "DELETE /api/mail/connections/:id",
          "GET    /api/mail/threads?folder=&label=&connectionId=&cursor=",
          "GET    /api/mail/threads/:id",
          "POST   /api/mail/threads/:id/sync",
          "POST   /api/mail/threads/bulk/{archive,trash,spam,star,labels,read,snooze,mute}",
          "POST   /api/mail/messages/drafts | PATCH /api/mail/messages/drafts/:id",
          "POST   /api/mail/messages/send | /undo/:id | /scheduled/:id/cancel",
          "GET    /api/mail/messages/scheduled",
          "GET/POST/PATCH/DELETE /api/mail/labels",
          "GET    /api/mail/search?q=",
          "POST   /api/mail/ai/{summary,smart-reply,subject,classify,draft,improve,translate}",
          "GET    /api/mail/ai/usage",
          "GET/POST/PATCH/DELETE /api/mail/templates | /notes | /rules | /contacts",
          "POST   /api/mail/agent/stream (SSE)",
          "POST   /api/mail/shared/{assign,status,comments}",
          "POST   /api/mail/ical/rsvp/:messageId",
          "POST   /api/mail/unsubscribe/:messageId",
          "GET    /api/mail/image-proxy?u=&h=",
          "POST   /api/mail/webhooks/google",
          "GET/POST /api/mail/webhooks/microsoft",
        ].join("\n")}</pre>
      </section>
    </div>
  );
}
