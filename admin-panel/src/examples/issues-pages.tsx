import { defineKanbanView } from "@/builders";
import { Badge } from "@/primitives/Badge";

const TICKET_COLS = [
  { id: "open", title: "Open", intent: "info" as const },
  { id: "in_progress", title: "In progress", intent: "warning" as const },
  { id: "resolved", title: "Resolved", intent: "success" as const },
  { id: "closed", title: "Closed", intent: "neutral" as const },
];
const PRIORITY_INTENT: Record<string, "neutral" | "info" | "warning" | "danger"> = {
  low: "neutral",
  normal: "info",
  high: "warning",
  urgent: "danger",
};

type IssueRow = {
  id: string;
  code?: string;
  title?: string;
  assignee?: string;
  priority?: keyof typeof PRIORITY_INTENT;
  status: string;
  severity?: string;
};

/** Issues kanban — declarative view backed by KanbanViewRenderer.
 *  Gets search, simple filter chips, and the advanced QueryBuilder for free. */
export const issuesKanbanView = defineKanbanView({
  id: "issues.kanban.view",
  title: "Issues board",
  description: "Every open engineering issue. Drag cards to move them between columns.",
  resource: "issues.issue",
  statusField: "status",
  columns: TICKET_COLS,
  search: true,
  searchFields: ["title", "code", "assignee"],
  filters: [
    {
      field: "priority",
      label: "Priority",
      kind: "enum",
      options: [
        { value: "urgent", label: "Urgent" },
        { value: "high", label: "High" },
        { value: "normal", label: "Normal" },
        { value: "low", label: "Low" },
      ],
    },
    {
      field: "severity",
      label: "Severity",
      kind: "enum",
    },
  ],
  advancedFilterFields: [
    { field: "title", label: "Title", kind: "text" },
    { field: "code", label: "Code", kind: "text" },
    {
      field: "priority",
      label: "Priority",
      kind: "enum",
      options: [
        { value: "urgent", label: "Urgent" },
        { value: "high", label: "High" },
        { value: "normal", label: "Normal" },
        { value: "low", label: "Low" },
      ],
    },
    { field: "assignee", label: "Assignee", kind: "text" },
    { field: "severity", label: "Severity", kind: "text" },
  ],
  cardPath: (row) => `/issues/${String((row as IssueRow).id)}`,
  renderCard: (row) => {
    const i = row as IssueRow;
    return (
      <div>
        <div className="flex items-center justify-between">
          <code className="text-xs font-mono text-text-muted">{i.code}</code>
          {i.priority && (
            <Badge intent={PRIORITY_INTENT[i.priority] ?? "neutral"}>
              {i.priority}
            </Badge>
          )}
        </div>
        <div className="text-sm text-text-primary mt-1 line-clamp-2">
          {i.title}
        </div>
        <div className="text-xs text-text-muted mt-1">{i.assignee}</div>
      </div>
    );
  },
});
