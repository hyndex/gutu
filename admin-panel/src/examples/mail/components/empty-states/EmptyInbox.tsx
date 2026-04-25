import * as React from "react";
import { EmptyState } from "@/admin-primitives/EmptyState";

export function EmptyInbox({ folder }: { folder: string }): React.ReactElement {
  const titles: Record<string, string> = {
    inbox: "Inbox zero",
    sent: "Nothing sent yet",
    drafts: "No drafts",
    archive: "Archive is empty",
    trash: "Trash is empty",
    spam: "No spam",
    starred: "No starred messages",
    snoozed: "No snoozed conversations",
  };
  const descriptions: Record<string, string> = {
    inbox: "When new mail arrives it'll show up here.",
    sent: "Messages you send appear here.",
    drafts: "Messages you save without sending appear here.",
    archive: "Archived messages live here, out of your inbox.",
    trash: "Deleted messages auto-purge after 30 days.",
    spam: "Messages flagged as spam will land here.",
    starred: "Star important conversations to find them quickly.",
    snoozed: "Snoozed threads return to your inbox when their wake time arrives.",
  };
  return (
    <EmptyState
      title={titles[folder] ?? "No messages"}
      description={descriptions[folder] ?? "There's nothing in this folder yet."}
    />
  );
}
