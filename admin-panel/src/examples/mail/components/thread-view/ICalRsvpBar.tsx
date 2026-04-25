import * as React from "react";
import { Button } from "@/primitives/Button";
import { Calendar } from "lucide-react";
import { mailApi } from "../../lib/api";

export function ICalRsvpBar({ messageId }: { messageId: string }): React.ReactElement {
  const [pending, setPending] = React.useState<"ACCEPTED" | "DECLINED" | "TENTATIVE" | null>(null);
  const [done, setDone] = React.useState<"ACCEPTED" | "DECLINED" | "TENTATIVE" | null>(null);
  const submit = async (s: "ACCEPTED" | "DECLINED" | "TENTATIVE"): Promise<void> => {
    setPending(s);
    try { await mailApi.rsvp(messageId, s); setDone(s); }
    finally { setPending(null); }
  };
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface-1 p-2">
      <Calendar size={14} aria-hidden />
      <span className="text-sm text-text-secondary">Calendar invite</span>
      <div className="ml-auto flex gap-1">
        <Button size="sm" variant={done === "ACCEPTED" ? "primary" : "ghost"} disabled={pending !== null} onClick={() => submit("ACCEPTED")}>Yes</Button>
        <Button size="sm" variant={done === "TENTATIVE" ? "primary" : "ghost"} disabled={pending !== null} onClick={() => submit("TENTATIVE")}>Maybe</Button>
        <Button size="sm" variant={done === "DECLINED" ? "primary" : "ghost"} disabled={pending !== null} onClick={() => submit("DECLINED")}>No</Button>
      </div>
    </div>
  );
}
