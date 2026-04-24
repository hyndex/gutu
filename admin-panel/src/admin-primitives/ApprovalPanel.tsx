import * as React from "react";
import { Check, Clock, ShieldCheck, UserCheck, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import { Button } from "@/primitives/Button";
import { Textarea } from "@/primitives/Textarea";
import { Badge } from "@/primitives/Badge";
import { StatusDot } from "./StatusDot";
import { cn } from "@/lib/cn";

export interface ApprovalStep {
  id: string;
  label: string;
  approver?: string;
  approverRole?: string;
  status: "pending" | "approved" | "rejected" | "delegated" | "skipped";
  at?: string;
  reason?: string;
}

export interface ApprovalPanelProps {
  title?: string;
  steps: readonly ApprovalStep[];
  /** True if the current user can act on the current pending step. */
  canAct?: boolean;
  onApprove?: (reason?: string) => void | Promise<void>;
  onReject?: (reason: string) => void | Promise<void>;
  onDelegate?: (userId: string) => void | Promise<void>;
}

function intent(s: ApprovalStep["status"]) {
  switch (s) {
    case "approved": return "success" as const;
    case "rejected": return "danger" as const;
    case "delegated": return "info" as const;
    case "skipped": return "neutral" as const;
    default: return "warning" as const;
  }
}

export function ApprovalPanel({
  title = "Approvals",
  steps,
  canAct,
  onApprove,
  onReject,
}: ApprovalPanelProps) {
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState<"approve" | "reject" | null>(null);
  const pending = steps.find((s) => s.status === "pending");

  const handleApprove = async () => {
    if (!onApprove) return;
    setBusy("approve");
    try {
      await onApprove(reason.trim() || undefined);
      setReason("");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    if (!onReject || !reason.trim()) return;
    setBusy("reject");
    try {
      await onReject(reason.trim());
      setReason("");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-text-muted" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={s.id} className="flex items-start gap-3">
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  s.status === "approved" && "bg-intent-success text-white",
                  s.status === "rejected" && "bg-intent-danger text-white",
                  s.status === "pending" && "bg-intent-warning-bg text-intent-warning",
                  s.status === "delegated" && "bg-intent-info-bg text-intent-info",
                  s.status === "skipped" && "bg-surface-2 text-text-muted",
                )}
              >
                {s.status === "approved" ? (
                  <Check className="h-3 w-3" />
                ) : s.status === "rejected" ? (
                  <X className="h-3 w-3" />
                ) : s.status === "pending" ? (
                  <Clock className="h-3 w-3" />
                ) : (
                  <span className="text-xs">{i + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-medium text-text-primary">{s.label}</div>
                  <Badge intent={intent(s.status)}>{s.status}</Badge>
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {s.approver && <span>by {s.approver}</span>}
                  {s.approverRole && <span>{s.approver ? " · " : ""}{s.approverRole}</span>}
                  {s.at && <span> · {new Date(s.at).toLocaleString()}</span>}
                </div>
                {s.reason && (
                  <div className="text-xs text-text-secondary mt-1 italic">"{s.reason}"</div>
                )}
              </div>
              <StatusDot intent={intent(s.status)} />
            </li>
          ))}
        </ol>
        {canAct && pending && onApprove && onReject && (
          <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
            <Textarea
              rows={2}
              placeholder="Reason (required to reject, optional to approve)…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                loading={busy === "approve"}
                iconLeft={<UserCheck className="h-3.5 w-3.5" />}
              >
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReject}
                loading={busy === "reject"}
                disabled={!reason.trim()}
                iconLeft={<X className="h-3.5 w-3.5" />}
              >
                Reject
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
