import type { CommandDescriptor } from "@/contracts/commands";
import { mailApi } from "./lib/api";
import { openComposer } from "./store";

export const MAIL_COMMANDS: CommandDescriptor[] = [
  { id: "mail.go.inbox", label: "Mail: Open inbox", icon: "Mail", run: () => { window.location.hash = "/mail"; } },
  { id: "mail.go.starred", label: "Mail: Open Starred", icon: "Star", run: () => { window.location.hash = "/mail/starred"; } },
  { id: "mail.go.snoozed", label: "Mail: Open Snoozed", icon: "Clock", run: () => { window.location.hash = "/mail/snoozed"; } },
  { id: "mail.go.sent", label: "Mail: Open Sent", icon: "Send", run: () => { window.location.hash = "/mail/sent"; } },
  { id: "mail.go.drafts", label: "Mail: Open Drafts", icon: "FileText", run: () => { window.location.hash = "/mail/drafts"; } },
  { id: "mail.go.archive", label: "Mail: Open Archive", icon: "Archive", run: () => { window.location.hash = "/mail/archive"; } },
  { id: "mail.go.spam", label: "Mail: Open Spam", icon: "AlertOctagon", run: () => { window.location.hash = "/mail/spam"; } },
  { id: "mail.go.trash", label: "Mail: Open Trash", icon: "Trash2", run: () => { window.location.hash = "/mail/trash"; } },
  { id: "mail.compose.new", label: "Mail: New message", icon: "Plus", shortcut: "c", run: () => openComposer({ id: `cmd-${Date.now()}`, mode: "new" }) },
  { id: "mail.search", label: "Mail: Search", icon: "Search", shortcut: "/", run: () => {
    const q = window.prompt("Search mail:");
    if (q) window.location.hash = `/mail/search?q=${encodeURIComponent(q)}`;
  }},
  { id: "mail.go.labels", label: "Mail: Manage labels", icon: "Tag", run: () => { window.location.hash = "/mail/labels"; } },
  { id: "mail.go.filters", label: "Mail: Filters & rules", icon: "Filter", run: () => { window.location.hash = "/mail/filters"; } },
  { id: "mail.go.contacts", label: "Mail: Contacts", icon: "UserSquare", run: () => { window.location.hash = "/mail/contacts"; } },
  { id: "mail.go.settings", label: "Mail: Settings", icon: "Settings", run: () => { window.location.hash = "/settings/mail"; } },
  { id: "mail.go.dashboard", label: "Mail: Dashboard", icon: "BarChart3", run: () => { window.location.hash = "/mail/dashboard"; } },
  { id: "mail.go.developer", label: "Mail: Developer", icon: "Terminal", run: () => { window.location.hash = "/mail/developer"; } },
  { id: "mail.action.refresh", label: "Mail: Sync now", icon: "RefreshCcw", run: async () => {
    // Trigger a sync of the current thread if available — best effort.
    const m = window.location.hash.match(/\/mail\/.*?\/(?:thread|t)\/([^/?#]+)/);
    if (m) { try { await mailApi.syncThread(m[1]); } catch { /* ignore */ } }
  }},
];
