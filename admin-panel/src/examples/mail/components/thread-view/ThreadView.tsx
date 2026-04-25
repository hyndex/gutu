import * as React from "react";
import { Reply, ReplyAll, Forward, Archive, Trash2, MoreHorizontal, Sparkles, Star, Tag, Printer, Ban, Download } from "lucide-react";
import { Button } from "@/primitives/Button";
import { Spinner } from "@/primitives/Spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/primitives/Tabs";
import { MailAvatar } from "../shared/Avatar";
import { VerificationBadges } from "../badges/VerificationBadge";
import { PhishBanner } from "../badges/PhishBanner";
import { MessageBody } from "../reader/MessageBody";
import { AISummaryPanel } from "../ai/AISummaryPanel";
import { SmartReplySuggestions } from "../ai/SmartReplySuggestions";
import { AttachmentList } from "../attachments/AttachmentList";
import { ICalRsvpBar } from "./ICalRsvpBar";
import { useThread } from "../../hooks/use-thread";
import { mailApi, type MailMessage } from "../../lib/api";
import { mailApiExtras } from "../../lib/api-extras";
import { formatAddress, formatRelativeTime } from "../../lib/format";
import { openComposer } from "../../store";

export interface ThreadViewProps {
  threadId: string;
  imageProxy?: "always" | "on-trust" | "never";
  onCloseRequest?: () => void;
}

export function ThreadView(props: ThreadViewProps): React.ReactElement {
  const { thread, messages, loading, error, reload } = useThread(props.threadId);
  const [busy, setBusy] = React.useState<null | "archive" | "trash" | "spam">(null);

  const onAction = React.useCallback(async (kind: "archive" | "trash" | "spam") => {
    if (!thread) return;
    setBusy(kind);
    try {
      if (kind === "archive") await mailApi.archive([thread.id]);
      else if (kind === "trash") await mailApi.trash([thread.id]);
      else await mailApi.spam([thread.id]);
      props.onCloseRequest?.();
    } finally {
      setBusy(null);
    }
  }, [thread, props]);

  if (loading && !thread) {
    return <div className="grid h-full place-items-center"><Spinner /></div>;
  }
  if (error) {
    return (
      <div className="grid h-full place-items-center text-sm text-red-600">
        Failed to load: {error.message}
        <Button variant="ghost" size="sm" onClick={() => reload()}>Retry</Button>
      </div>
    );
  }
  if (!thread) return <div className="grid h-full place-items-center text-sm text-text-muted">Select a conversation.</div>;

  function printThread(subject: string): void {
    const w = window.open("", "_blank", "width=900,height=720");
    if (!w) return;
    const safeSubject = subject.replace(/[<>&]/g, "");
    const parts = messages.map((m) => `
      <article style="border-top:1px solid #ccc;padding:12px 0">
        <header style="font-size:12px;color:#555">From: ${escapeHtml(m.from?.email ?? "")} · ${escapeHtml(m.receivedAt)}</header>
        <h3 style="margin:6px 0;font-size:14px">${escapeHtml(m.subject ?? "")}</h3>
        <div>${m.bodyHtml ?? `<pre>${escapeHtml(m.bodyText ?? "")}</pre>`}</div>
      </article>
    `).join("");
    w.document.write(`<!doctype html><html><head><title>${safeSubject}</title></head><body style="font-family:system-ui;max-width:760px;margin:24px auto;padding:0 16px">${parts}<script>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  }

  function downloadMbox(threadId: string): void {
    window.open(mailApiExtras.exportThreadMbox(threadId), "_blank");
  }
  function escapeHtml(s: string): string {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-surface-0 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{thread.subject || "(no subject)"}</h2>
            {thread.starred && <Star size={16} className="text-amber-500" fill="currentColor" aria-hidden />}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-text-muted">
            <span>{thread.messageCount} message{thread.messageCount === 1 ? "" : "s"}</span>
            <span>·</span>
            <span>{formatRelativeTime(thread.lastMessageAt)}</span>
            {thread.labelIds.length > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Tag size={12} /> {thread.labelIds.length} label{thread.labelIds.length === 1 ? "" : "s"}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" disabled={busy === "archive"} onClick={() => onAction("archive")} aria-label="Archive (e)">
            <Archive size={16} />
          </Button>
          <Button size="sm" variant="ghost" disabled={busy === "trash"} onClick={() => onAction("trash")} aria-label="Trash (#)">
            <Trash2 size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction("spam")} aria-label="Mark spam (!)">
            <MoreHorizontal size={16} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => printThread(thread.subject)}
            aria-label="Print thread"
            title="Print"
          >
            <Printer size={16} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => downloadMbox(thread.id)}
            aria-label="Export thread"
            title="Export thread (.mbox)"
          >
            <Download size={16} />
          </Button>
          {thread.fromEmail && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (!confirm(`Block ${thread.fromEmail}? Future messages will go to spam.`)) return;
                await mailApiExtras.blockSender(thread.fromEmail!);
                props.onCloseRequest?.();
              }}
              aria-label="Block sender"
              title="Block sender"
            >
              <Ban size={16} />
            </Button>
          )}
        </div>
      </header>

      <PhishBanner score={thread.phishScore} />

      <Tabs defaultValue="messages" className="flex-1 overflow-hidden">
        <TabsList className="px-4">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="messages" className="h-full overflow-y-auto">
          <div className="space-y-3 px-4 py-3">
            {messages.map((msg, idx) => (
              <MessageCard
                key={msg.id}
                msg={msg}
                threadId={thread.id}
                imageProxy={props.imageProxy}
                onReply={() => openComposer({ id: `reply-${msg.id}`, mode: "reply", threadId: thread.id, inReplyToMessageId: msg.id })}
                onReplyAll={() => openComposer({ id: `replyall-${msg.id}`, mode: "reply-all", threadId: thread.id, inReplyToMessageId: msg.id })}
                onForward={() => openComposer({ id: `fwd-${msg.id}`, mode: "forward", threadId: thread.id, inReplyToMessageId: msg.id })}
                expandedByDefault={idx === messages.length - 1}
              />
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => openComposer({ id: `reply-thread-${thread.id}`, mode: "reply", threadId: thread.id, inReplyToMessageId: messages[messages.length - 1]?.id })}>
                <Reply size={14} className="mr-1" /> Reply
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openComposer({ id: `replyall-thread-${thread.id}`, mode: "reply-all", threadId: thread.id, inReplyToMessageId: messages[messages.length - 1]?.id })}>
                <ReplyAll size={14} className="mr-1" /> Reply all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openComposer({ id: `fwd-thread-${thread.id}`, mode: "forward", threadId: thread.id, inReplyToMessageId: messages[messages.length - 1]?.id })}>
                <Forward size={14} className="mr-1" /> Forward
              </Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="ai" className="h-full overflow-y-auto">
          <div className="space-y-3 px-4 py-3">
            <AISummaryPanel threadId={thread.id} />
            <SmartReplySuggestions threadId={thread.id} onPick={(text) => openComposer({ id: `sr-${thread.id}-${Date.now()}`, mode: "reply", threadId: thread.id, inReplyToMessageId: messages[messages.length - 1]?.id })} />
            <p className="flex items-center gap-1 text-xs text-text-muted"><Sparkles size={12} /> AI features run server-side; usage is logged per tenant.</p>
          </div>
        </TabsContent>
        <TabsContent value="notes" className="h-full overflow-y-auto">
          <NotesTab threadId={thread.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface MessageCardProps {
  msg: MailMessage;
  threadId: string;
  imageProxy?: "always" | "on-trust" | "never";
  expandedByDefault?: boolean;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
}

function MessageCard({ msg, threadId, imageProxy, expandedByDefault, onReply, onReplyAll, onForward }: MessageCardProps): React.ReactElement {
  const [open, setOpen] = React.useState(!!expandedByDefault);
  const headers = msg.headers ?? {};
  const auth = headers["authentication-results"] ?? "";
  const verdict = parseVerdict(auth);
  return (
    <article className="rounded-lg border border-border bg-surface-0">
      <header className="flex items-start gap-3 border-b border-border px-3 py-2 cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <MailAvatar name={msg.from?.name} email={msg.from?.email} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="truncate text-sm font-semibold">{msg.from ? formatAddress(msg.from) : "Unknown"}</div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <VerificationBadges spf={verdict.spf} dkim={verdict.dkim} dmarc={verdict.dmarc} />
              <span>{formatRelativeTime(msg.receivedAt)}</span>
            </div>
          </div>
          <div className="text-xs text-text-muted">
            to {msg.to.map((a) => a.name || a.email).join(", ") || "—"}
            {msg.cc.length > 0 && <span> · cc {msg.cc.map((a) => a.name || a.email).join(", ")}</span>}
          </div>
        </div>
      </header>
      {open && (
        <div className="space-y-3 px-3 py-3">
          <MessageBody threadId={threadId} bodyHtml={msg.bodyHtml} bodyText={msg.bodyText} trackerCount={msg.trackerCount} imageCount={msg.imageCount} imageProxy={imageProxy} />
          {msg.icsEventId && <ICalRsvpBar messageId={msg.id} />}
          {msg.attachments.length > 0 && <AttachmentList attachments={msg.attachments} messageId={msg.providerMessageId} />}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onReply}><Reply size={14} className="mr-1" />Reply</Button>
            <Button variant="ghost" size="sm" onClick={onReplyAll}><ReplyAll size={14} className="mr-1" />Reply all</Button>
            <Button variant="ghost" size="sm" onClick={onForward}><Forward size={14} className="mr-1" />Forward</Button>
          </div>
        </div>
      )}
    </article>
  );
}

function parseVerdict(s: string): { spf?: string; dkim?: string; dmarc?: string } {
  const out: { spf?: string; dkim?: string; dmarc?: string } = {};
  for (const part of s.split(";")) {
    const m = part.trim().match(/^(spf|dkim|dmarc)\s*=\s*([a-z]+)/i);
    if (m) (out as Record<string, string>)[m[1].toLowerCase()] = m[2].toLowerCase();
  }
  return out;
}

function NotesTab({ threadId }: { threadId: string }): React.ReactElement {
  const [notes, setNotes] = React.useState<{ id: string; content: string; color: string; isPinned: boolean }[]>([]);
  const [draft, setDraft] = React.useState("");
  const reload = React.useCallback(async (): Promise<void> => {
    const r = await mailApi.listNotes(threadId);
    setNotes(r.rows.map((n) => ({ id: n.id, content: n.content, color: n.color, isPinned: n.isPinned })));
  }, [threadId]);
  React.useEffect(() => { void reload(); }, [reload]);

  return (
    <div className="space-y-3 px-4 py-3">
      <div className="space-y-2">
        {notes.length === 0 && <p className="text-sm text-text-muted">No notes yet — jot something for future-you.</p>}
        {notes.map((n) => (
          <div key={n.id} className="rounded-md border border-border bg-amber-50 p-2 text-sm dark:bg-amber-950/30">
            {n.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-border bg-surface-0 px-2 py-1.5 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note…"
        />
        <Button
          size="sm"
          disabled={!draft.trim()}
          onClick={async () => {
            await mailApi.createNote({ threadId, content: draft });
            setDraft("");
            await reload();
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
