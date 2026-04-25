import * as React from "react";
import { Inbox } from "lucide-react";

export function SharedInboxTab(): React.ReactElement {
  return (
    <section className="space-y-3 text-sm">
      <p className="text-text-muted">Shared mailboxes route incoming mail to a team. Each thread can be assigned to a member, has an SLA timer, and an internal comment thread.</p>
      <div className="flex items-center gap-2 rounded-md border border-border bg-surface-0 p-3"><Inbox size={16} aria-hidden /> Configure a shared inbox by connecting an account and marking it as Shared in Connections.</div>
    </section>
  );
}
