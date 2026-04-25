import * as React from "react";
import { Send, X, Paperclip, Sparkles, Clock, Trash2, Minus, ArchiveRestore } from "lucide-react";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { mailApi, type MailDraft, type SendResult } from "../../lib/api";
import { closeComposer, minimizeComposer, pushUndo } from "../../store";
import { Toolbar } from "./Toolbar";
import { RichEditor, type RichEditorHandle } from "./RichEditor";
import { ScheduleDialog } from "../dialogs/ScheduleDialog";

export interface ComposerProps {
  id: string;
  mode: "new" | "reply" | "reply-all" | "forward";
  threadId?: string;
  inReplyToMessageId?: string;
  draftId?: string;
  defaultConnectionId?: string;
  defaultSignatureBody?: string;
  prefill?: { to?: string; cc?: string; bcc?: string; subject?: string; bodyHtml?: string };
  minimized?: boolean;
  onSent?: (kind: "send" | "send-and-archive" | "scheduled") => void;
}

export function Composer(props: ComposerProps): React.ReactElement {
  const [to, setTo] = React.useState(props.prefill?.to ?? "");
  const [cc, setCc] = React.useState(props.prefill?.cc ?? "");
  const [bcc, setBcc] = React.useState(props.prefill?.bcc ?? "");
  const [subject, setSubject] = React.useState(props.prefill?.subject ?? "");
  const [body, setBody] = React.useState(props.prefill?.bodyHtml ?? "");
  const [showCcBcc, setShowCcBcc] = React.useState(!!(props.prefill?.cc || props.prefill?.bcc));
  const [draftId, setDraftId] = React.useState<string | undefined>(props.draftId);
  const [saving, setSaving] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [aiBusy, setAiBusy] = React.useState<null | "improve" | "subject" | "draft">(null);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [requestReceipt, setRequestReceipt] = React.useState(false);
  const [attachments, setAttachments] = React.useState<{ id: string; filename: string; size: number; contentType: string; inline: boolean }[]>([]);
  const editorRef = React.useRef<RichEditorHandle>(null);
  const editorEl = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const idemKeyRef = React.useRef<string>(`compose-${props.id}-${Math.random().toString(16).slice(2)}`);

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void saveDraft(); }, 1200);
    return (): void => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, cc, bcc, subject, body, attachments]);

  const saveDraft = React.useCallback(async (): Promise<void> => {
    if (!to && !cc && !bcc && !subject && !body) return;
    setSaving(true);
    try {
      const payload: Partial<MailDraft> = {
        id: draftId,
        connectionId: props.defaultConnectionId,
        threadId: props.threadId,
        inReplyToMessageId: props.inReplyToMessageId,
        to, cc, bcc, subject, bodyHtml: body,
        attachmentIds: attachments.map((a) => a.id),
      };
      const saved = draftId ? await mailApi.patchDraft(draftId, payload) : await mailApi.saveDraft(payload);
      if (saved.id !== draftId) setDraftId(saved.id);
    } catch { /* network — retry on next change */ }
    finally { setSaving(false); }
  }, [to, cc, bcc, subject, body, attachments, draftId, props.defaultConnectionId, props.threadId, props.inReplyToMessageId]);

  const finalize = React.useCallback(async (sendAt?: string, archiveAfter = false): Promise<void> => {
    setSending(true);
    try {
      const payload: Partial<MailDraft> & { undoSeconds?: number; sendAt?: string } = {
        id: draftId,
        connectionId: props.defaultConnectionId,
        threadId: props.threadId,
        inReplyToMessageId: props.inReplyToMessageId,
        to, cc, bcc, subject, bodyHtml: body,
        attachmentIds: attachments.map((a) => a.id),
        ...(sendAt && { sendAt }),
      };
      const result: SendResult = await mailApi.send(payload, idemKeyRef.current);
      if (result.kind === "undo" && result.undoableUntil) {
        pushUndo({
          id: result.id,
          releaseAt: result.undoableUntil,
          subject: subject || "(no subject)",
          recipients: [to, cc, bcc].filter(Boolean).join(", "),
        });
      }
      if (archiveAfter && props.threadId) {
        try { await mailApi.archive([props.threadId]); } catch { /* ignore */ }
      }
      if (requestReceipt && draftId) {
        try { await import("../../lib/api-extras").then((m) => m.mailApiExtras.issueReceipt(draftId, props.threadId)); } catch { /* ignore */ }
      }
      props.onSent?.(sendAt ? "scheduled" : archiveAfter ? "send-and-archive" : "send");
      closeComposer(props.id);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err instanceof Error ? err.message : "send failed");
    } finally {
      setSending(false);
    }
  }, [to, cc, bcc, subject, body, attachments, draftId, requestReceipt, props]);

  const aiImprove = React.useCallback(async (mode: "shorter" | "friendlier" | "more-formal" | "fix-grammar"): Promise<void> => {
    if (!body.trim()) return;
    setAiBusy("improve");
    try {
      const r = await mailApi.aiImprove(htmlToPlainTextLight(body), mode);
      const html = r.text.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br />");
      setBody(`<p>${html}</p>`);
      editorRef.current?.insertHtml("");
    } finally { setAiBusy(null); }
  }, [body]);

  const aiSubject = React.useCallback(async (): Promise<void> => {
    if (!body.trim()) return;
    setAiBusy("subject");
    try {
      const r = await mailApi.aiSubject(htmlToPlainTextLight(body));
      if (r.suggestions[0]) setSubject(r.suggestions[0]);
    } finally { setAiBusy(null); }
  }, [body]);

  const aiDraft = React.useCallback(async (): Promise<void> => {
    // eslint-disable-next-line no-alert
    const brief = window.prompt("Briefly: what should this email say?");
    if (!brief) return;
    setAiBusy("draft");
    try {
      const r = await mailApi.aiDraft(brief);
      const html = `<p>${r.body.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br />")}</p>`;
      setBody(html);
    } finally { setAiBusy(null); }
  }, []);

  const handleUpload = React.useCallback(async (file: File, kind: "inline" | "attachment"): Promise<void> => {
    const reader = new FileReader();
    const dataUrl: string = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const id = `att_${Math.random().toString(16).slice(2)}`;
    setAttachments((prev) => [...prev, { id, filename: file.name, size: file.size, contentType: file.type, inline: kind === "inline" }]);
    if (kind === "inline" && file.type.startsWith("image/")) {
      editorRef.current?.insertImage(dataUrl, file.name);
    }
  }, []);

  const onAttachClick = React.useCallback(() => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.multiple = true;
    inp.onchange = async () => {
      for (const f of Array.from(inp.files ?? [])) {
        await handleUpload(f, "attachment");
      }
    };
    inp.click();
  }, [handleUpload]);

  const onLink = React.useCallback(() => {
    // eslint-disable-next-line no-alert
    const url = window.prompt("URL:");
    if (!url) return;
    try { document.execCommand("createLink", false, url); } catch { /* ignore */ }
  }, []);

  const onInsertImage = React.useCallback(() => {
    // eslint-disable-next-line no-alert
    const url = window.prompt("Image URL:");
    if (!url) return;
    editorRef.current?.insertImage(url, "image");
  }, []);

  // Cmd+Enter to send.
  const onKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void finalize();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      minimizeComposer(props.id, true);
    }
  }, [finalize, props.id]);

  if (props.minimized) {
    return (
      <button
        type="button"
        onClick={() => minimizeComposer(props.id, false)}
        className="fixed bottom-2 right-3 z-30 inline-flex items-center gap-2 rounded-md border border-border bg-surface-0 px-3 py-1.5 text-sm shadow-lg"
      >
        {subject || "(new message)"}
      </button>
    );
  }

  return (
    <div onKeyDown={onKeyDown} className="fixed bottom-2 right-3 z-30 flex w-[min(100vw-1rem,640px)] flex-col rounded-md border border-border bg-surface-0 shadow-2xl">
      <header className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <div className="text-sm font-semibold">{props.mode === "new" ? "New message" : props.mode === "forward" ? "Forward" : props.mode === "reply-all" ? "Reply all" : "Reply"}</div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" aria-label="Minimize" onClick={() => minimizeComposer(props.id, true)}><Minus size={14} /></Button>
          <Button size="sm" variant="ghost" aria-label="Discard" onClick={async () => { if (draftId) await mailApi.deleteDraft(draftId).catch(() => undefined); closeComposer(props.id); }}>
            <Trash2 size={14} />
          </Button>
          <Button size="sm" variant="ghost" aria-label="Close" onClick={() => closeComposer(props.id)}><X size={14} /></Button>
        </div>
      </header>
      <div className="space-y-2 px-3 py-2">
        <Field label="To"><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="email@example.com, …" /></Field>
        {showCcBcc ? (
          <>
            <Field label="Cc"><Input value={cc} onChange={(e) => setCc(e.target.value)} /></Field>
            <Field label="Bcc"><Input value={bcc} onChange={(e) => setBcc(e.target.value)} /></Field>
          </>
        ) : (
          <button type="button" className="ml-16 text-xs text-accent" onClick={() => setShowCcBcc(true)}>Add Cc / Bcc</button>
        )}
        <Field label="Subject">
          <div className="flex gap-1">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="flex-1" />
            <Button variant="ghost" size="sm" disabled={aiBusy !== null} onClick={() => void aiSubject()} title="Suggest subject">
              <Sparkles size={14} />
            </Button>
          </div>
        </Field>
      </div>
      <Toolbar editor={editorEl} onInsertImage={onInsertImage} onLink={onLink} />
      <div className="px-3 py-2">
        <RichEditor
          ref={editorRef}
          initialHtml={body}
          onChange={(html) => setBody(html)}
          onUpload={handleUpload}
          placeholder="Write your message…"
        />
      </div>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
          {attachments.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-1 px-2 py-1 text-xs">
              <Paperclip size={10} aria-hidden />
              <span className="truncate" style={{ maxWidth: 180 }}>{a.filename}</span>
              <button
                type="button"
                aria-label={`Remove ${a.filename}`}
                onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                className="text-text-muted hover:text-text-primary"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <footer className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
        <Button onClick={() => void finalize()} disabled={sending || !to.trim() || !subject.trim()} title="Send (⌘⏎)">
          <Send size={14} className="mr-1" /> {sending ? "Sending…" : "Send"}
        </Button>
        {props.threadId && (
          <Button variant="secondary" size="sm" onClick={() => void finalize(undefined, true)} disabled={sending} title="Send and archive">
            <ArchiveRestore size={14} className="mr-1" />Send &amp; archive
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => setScheduleOpen(true)}><Clock size={14} className="mr-1" />Schedule</Button>
        <Button variant="ghost" size="sm" onClick={onAttachClick} title="Attach files"><Paperclip size={14} /></Button>
        <label className="ml-auto inline-flex items-center gap-1 text-xs text-text-muted">
          <input type="checkbox" checked={requestReceipt} onChange={(e) => setRequestReceipt(e.target.checked)} />
          Request read receipt
        </label>
        <div className="text-xs text-text-muted">{saving ? "Saving…" : draftId ? "Saved" : ""}</div>
        <div className="flex w-full flex-wrap gap-1">
          <Button variant="ghost" size="sm" onClick={() => void aiDraft()} disabled={aiBusy !== null}><Sparkles size={12} className="mr-1" />Draft with AI</Button>
          <Button variant="ghost" size="sm" onClick={() => void aiImprove("shorter")} disabled={aiBusy !== null}>Shorter</Button>
          <Button variant="ghost" size="sm" onClick={() => void aiImprove("friendlier")} disabled={aiBusy !== null}>Friendlier</Button>
          <Button variant="ghost" size="sm" onClick={() => void aiImprove("more-formal")} disabled={aiBusy !== null}>More formal</Button>
          <Button variant="ghost" size="sm" onClick={() => void aiImprove("fix-grammar")} disabled={aiBusy !== null}>Fix grammar</Button>
        </div>
      </footer>
      <ScheduleDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} onChoose={async (sendAt) => { await finalize(sendAt); }} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-baseline gap-2">
      <label className="w-12 text-xs text-text-muted">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function htmlToPlainTextLight(html: string): string {
  return html.replace(/<br\s*\/?>(?!\n)/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}
