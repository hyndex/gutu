import * as React from "react";
import { Send, X, Paperclip, Sparkles, Clock, Trash2, Minus } from "lucide-react";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Textarea } from "@/primitives/Textarea";
import { mailApi, type MailDraft, type SendResult } from "../../lib/api";
import { closeComposer, minimizeComposer, pushUndo } from "../../store";

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
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const idemKeyRef = React.useRef<string>(`compose-${props.id}-${Math.random().toString(16).slice(2)}`);

  // Auto-save 1s after last edit.
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void saveDraft(); }, 1200);
    return (): void => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, cc, bcc, subject, body]);

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
      };
      const saved = draftId ? await mailApi.patchDraft(draftId, payload) : await mailApi.saveDraft(payload);
      if (saved.id !== draftId) setDraftId(saved.id);
    } catch { /* offline / network — keep state, retry on next change */ }
    finally { setSaving(false); }
  }, [to, cc, bcc, subject, body, draftId, props.defaultConnectionId, props.threadId, props.inReplyToMessageId]);

  const onSend = React.useCallback(async (): Promise<void> => {
    setSending(true);
    try {
      const payload: Partial<MailDraft> & { undoSeconds?: number } = {
        id: draftId,
        connectionId: props.defaultConnectionId,
        threadId: props.threadId,
        inReplyToMessageId: props.inReplyToMessageId,
        to, cc, bcc, subject, bodyHtml: body,
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
      closeComposer(props.id);
    } catch (err) {
      // Keep composer open + surface error — user retries.
      // eslint-disable-next-line no-alert
      alert(err instanceof Error ? err.message : "send failed");
    } finally {
      setSending(false);
    }
  }, [to, cc, bcc, subject, body, draftId, props]);

  const onSchedule = React.useCallback(async (): Promise<void> => {
    // eslint-disable-next-line no-alert
    const at = window.prompt("Send at (ISO datetime, e.g. 2026-05-01T09:00):");
    if (!at) return;
    const sendAt = new Date(at).toISOString();
    setSending(true);
    try {
      await mailApi.send({
        id: draftId,
        connectionId: props.defaultConnectionId,
        threadId: props.threadId,
        inReplyToMessageId: props.inReplyToMessageId,
        to, cc, bcc, subject, bodyHtml: body,
        sendAt,
      }, idemKeyRef.current);
      closeComposer(props.id);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err instanceof Error ? err.message : "schedule failed");
    } finally { setSending(false); }
  }, [to, cc, bcc, subject, body, draftId, props]);

  const aiImprove = React.useCallback(async (mode: "shorter" | "friendlier" | "more-formal" | "fix-grammar"): Promise<void> => {
    if (!body.trim()) return;
    setAiBusy("improve");
    try {
      const r = await mailApi.aiImprove(stripHtml(body), mode);
      setBody(r.text.replace(/\n/g, "<br />"));
    } finally { setAiBusy(null); }
  }, [body]);

  const aiSubject = React.useCallback(async (): Promise<void> => {
    if (!body.trim()) return;
    setAiBusy("subject");
    try {
      const r = await mailApi.aiSubject(stripHtml(body));
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
      setBody(r.body.replace(/\n/g, "<br />"));
    } finally { setAiBusy(null); }
  }, []);

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
    <div className="fixed bottom-2 right-3 z-30 flex w-[min(100vw-1rem,640px)] flex-col rounded-md border border-border bg-surface-0 shadow-2xl">
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
        <Textarea
          rows={10}
          value={stripHtml(body)}
          onChange={(e) => setBody(e.target.value.replace(/\n/g, "<br />"))}
          placeholder="Write your message…"
          className="font-mono text-sm"
        />
      </div>
      <footer className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
        <Button onClick={() => void onSend()} disabled={sending || !to.trim() || !subject.trim()}>
          <Send size={14} className="mr-1" /> {sending ? "Sending…" : "Send"}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void onSchedule()}><Clock size={14} className="mr-1" />Schedule</Button>
        <Button variant="ghost" size="sm" disabled aria-disabled title="Attach (coming soon)"><Paperclip size={14} /></Button>
        <div className="ml-auto flex items-center gap-1 text-xs text-text-muted">
          {saving && <span>Saving…</span>}
          {!saving && draftId && <span>Saved</span>}
        </div>
        <div className="flex w-full flex-wrap gap-1">
          <Button variant="ghost" size="sm" onClick={() => void aiDraft()} disabled={aiBusy !== null}><Sparkles size={12} className="mr-1" />Draft with AI</Button>
          <Button variant="ghost" size="sm" onClick={() => void aiImprove("shorter")} disabled={aiBusy !== null}>Shorter</Button>
          <Button variant="ghost" size="sm" onClick={() => void aiImprove("friendlier")} disabled={aiBusy !== null}>Friendlier</Button>
          <Button variant="ghost" size="sm" onClick={() => void aiImprove("more-formal")} disabled={aiBusy !== null}>More formal</Button>
          <Button variant="ghost" size="sm" onClick={() => void aiImprove("fix-grammar")} disabled={aiBusy !== null}>Fix grammar</Button>
        </div>
      </footer>
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

function stripHtml(html: string): string {
  return html.replace(/<br\s*\/?>(?!\n)/gi, "\n").replace(/<[^>]+>/g, "");
}
