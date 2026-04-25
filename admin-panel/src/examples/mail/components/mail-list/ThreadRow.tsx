import * as React from "react";
import { Star, Paperclip, Calendar, AlertTriangle, Pin, BellOff } from "lucide-react";
import { Checkbox } from "@/primitives/Checkbox";
import { Badge } from "@/primitives/Badge";
import { MailAvatar } from "../shared/Avatar";
import { formatRelativeTime } from "../../lib/format";
import type { MailThread } from "../../lib/api";

export interface ThreadRowProps {
  thread: MailThread;
  selected: boolean;
  active: boolean;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  onClick: (id: string, e: React.MouseEvent) => void;
  onStar: (id: string, starred: boolean) => void;
}

export const ThreadRow = React.memo(function ThreadRow(props: ThreadRowProps) {
  const { thread, selected, active, onToggleSelect, onClick, onStar } = props;
  const unread = thread.unreadCount > 0;
  const senderName = thread.fromName || thread.fromEmail || "Unknown";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => onClick(thread.id, e)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(thread.id, e as unknown as React.MouseEvent);
        }
      }}
      data-active={active || undefined}
      data-selected={selected || undefined}
      data-unread={unread || undefined}
      className={[
        "group flex cursor-pointer items-start gap-2 border-b border-border px-3 py-2 transition-colors",
        active ? "bg-accent/15" : selected ? "bg-accent/8" : "hover:bg-surface-1",
      ].join(" ")}
    >
      <div className="pt-1">
        <Checkbox
          checked={selected}
          onCheckedChange={() => undefined}
          onClick={(e: React.MouseEvent) => onToggleSelect(thread.id, e)}
          aria-label="Select thread"
        />
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onStar(thread.id, !thread.starred); }}
        className="mt-0.5 text-amber-500"
        aria-label={thread.starred ? "Unstar" : "Star"}
      >
        <Star size={16} fill={thread.starred ? "currentColor" : "none"} />
      </button>
      <MailAvatar name={thread.fromName} email={thread.fromEmail} size={32} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <div className={["truncate text-sm", unread ? "font-semibold text-text-primary" : "text-text-primary/85"].join(" ")}>
            {senderName}
            {thread.messageCount > 1 && (
              <span className="ml-1 text-xs text-text-muted">({thread.messageCount})</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-text-muted">
            {thread.pinned && <Pin size={12} aria-hidden />}
            {thread.muted && <BellOff size={12} aria-hidden />}
            {thread.hasAttachment && <Paperclip size={12} aria-hidden />}
            {thread.hasCalendarInvite && <Calendar size={12} aria-hidden />}
            {(thread.phishScore ?? 0) >= 60 && <AlertTriangle size={12} className="text-red-500" aria-hidden />}
            <span>{formatRelativeTime(thread.lastMessageAt)}</span>
          </div>
        </div>
        <div className={["truncate text-sm", unread ? "font-semibold text-text-primary" : "text-text-secondary"].join(" ")}>
          {thread.subject || "(no subject)"}
        </div>
        <div className="truncate text-xs text-text-muted">{thread.preview}</div>
        {thread.labelIds.length > 0 && (
          <div className="mt-1 flex gap-1">
            {thread.labelIds.slice(0, 4).map((l) => (
              <Badge key={l} intent="info" className="text-[10px]">{l.replace(/^Label_|^CATEGORY_|^SYSTEM_/, "")}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
