/** Dashboard widgets for the home / mail dashboard. */

import * as React from "react";
import type { DashboardWidget } from "@/contracts/views";
import { mailApi } from "./lib/api";

function UnreadCountWidget(): React.ReactElement {
  const [n, setN] = React.useState<number | null>(null);
  React.useEffect(() => {
    void mailApi.listThreads({ folder: "inbox", limit: 100 }).then((r) => {
      setN(r.rows.filter((t) => t.unreadCount > 0).length);
    }).catch(() => setN(null));
  }, []);
  return React.createElement(
    "div",
    { className: "rounded-lg border border-border bg-surface-0 p-4" },
    React.createElement("div", { className: "text-xs text-text-muted" }, "Unread inbox"),
    React.createElement("div", { className: "text-3xl font-semibold" }, n === null ? "—" : n),
  );
}

export const MAIL_WIDGETS: DashboardWidget[] = [
  { id: "mail.unread", title: "Mail: unread", size: "sm", render: () => React.createElement(UnreadCountWidget) },
];
