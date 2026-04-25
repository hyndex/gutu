import * as React from "react";
import { ShieldAlert, Eye, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/primitives/Button";
import { clientSanitize } from "../../lib/sanitize-client";
import { useMailStore, trustImagesForThread } from "../../store";

export interface MessageBodyProps {
  threadId: string;
  bodyHtml?: string;
  bodyText?: string;
  trackerCount?: number;
  imageCount?: number;
  imageProxy?: "always" | "on-trust" | "never";
}

/** Renders an email's body inside a sandboxed iframe.
 *  - Sanitizes HTML on the client before injection.
 *  - Locks down via `sandbox="allow-popups allow-popups-to-escape-sandbox"` (no allow-scripts).
 *  - Auto-resizes to content height.
 *  - Splits visible-vs-trimmed-quote and offers a toggle for the quoted
 *    history (collapsed by default — common compositional convention). */
export function MessageBody(props: MessageBodyProps): React.ReactElement {
  const { threadId, bodyHtml, bodyText, trackerCount = 0, imageCount = 0, imageProxy = "always" } = props;
  const trustedThreads = useMailStore((s) => s.showAllImagesForThreads);
  const trusted = trustedThreads.has(threadId);
  const [showQuoted, setShowQuoted] = React.useState(false);

  const split = React.useMemo(() => {
    const raw = bodyHtml ?? (bodyText ? escapeAndLink(bodyText) : "");
    const safe = clientSanitize(raw);
    return splitQuotedHistory(safe);
  }, [bodyHtml, bodyText]);

  const showImages = imageProxy === "always" || (imageProxy === "on-trust" && trusted) || imageProxy !== "never";
  const visibleHtml = React.useMemo(() => {
    let html = split.head || "<p style='color:#888;font-style:italic'>(no content)</p>";
    if (showQuoted && split.tail) html += `<div data-quoted='1'>${split.tail}</div>`;
    if (!showImages) html = html.replace(/<img\b/gi, "<img data-blocked='1' style='display:none' ");
    return html;
  }, [split, showQuoted, showImages]);

  return (
    <div className="space-y-2">
      {(trackerCount > 0 || (imageCount > 0 && !showImages)) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {trackerCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-text-secondary">
              <ShieldAlert size={12} aria-hidden />
              Blocked {trackerCount} tracker{trackerCount === 1 ? "" : "s"}
            </span>
          )}
          {!showImages && imageCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => trustImagesForThread(threadId, true)}
              className="inline-flex items-center gap-1"
            >
              <ImageIcon size={12} aria-hidden /> Show {imageCount} image{imageCount === 1 ? "" : "s"}
            </Button>
          )}
          {trusted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Eye size={12} aria-hidden /> Images allowed
            </span>
          )}
        </div>
      )}
      <SandboxedFrame html={visibleHtml} />
      {split.tail && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowQuoted((v) => !v)}
          className="inline-flex items-center gap-1 text-xs"
        >
          {showQuoted ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showQuoted ? "Hide trimmed content" : "Show trimmed content"}
        </Button>
      )}
    </div>
  );
}

function SandboxedFrame({ html }: { html: string }): React.ReactElement {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = React.useState(120);

  const srcDoc = React.useMemo(() => buildSrcDoc(html), [html]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onLoad = (): void => {
      try {
        const doc = el.contentDocument;
        if (!doc) return;
        const h = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0);
        setHeight(Math.min(h + 16, 100_000));
        for (const a of doc.querySelectorAll("a")) {
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener noreferrer nofollow");
        }
      } catch { /* cross-origin */ }
    };
    el.addEventListener("load", onLoad);
    return (): void => el.removeEventListener("load", onLoad);
  }, [srcDoc]);

  return (
    <iframe
      ref={ref}
      title="Email body"
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
      style={{ width: "100%", height, border: 0, background: "transparent" }}
    />
  );
}

function buildSrcDoc(safeHtml: string): string {
  const css = `
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 14px; line-height: 1.55; color: #111; word-break: break-word; }
    img { max-width: 100%; height: auto; }
    a { color: #2563eb; }
    table { border-collapse: collapse; max-width: 100%; }
    blockquote { margin: 0; padding: 0.5em 0 0.5em 1em; border-left: 2px solid #cbd5e1; color: #475569; }
    pre, code { font-family: ui-monospace, SFMono-Regular, monospace; }
    [data-quoted="1"] { padding-top: 1em; border-top: 1px solid #e5e7eb; margin-top: 1em; }
    @media (prefers-color-scheme: dark) {
      body { color: #e5e7eb; background: transparent; }
      a { color: #93c5fd; }
      blockquote { border-color: #334155; color: #94a3b8; }
      [data-quoted="1"] { border-color: #1f2937; }
    }
  `;
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>${css}</style><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: cid:; style-src 'unsafe-inline'; font-src https: data:;"></head><body>${safeHtml}</body></html>`;
}

function escapeAndLink(s: string): string {
  const escaped = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const linked = escaped.replace(/(https?:\/\/[^\s<>"]+)/g, (m) => `<a href="${m}" target="_blank" rel="noopener noreferrer nofollow">${m}</a>`);
  return `<pre style="white-space:pre-wrap;font-family:inherit">${linked}</pre>`;
}

/** Identify the start of trimmed history and split.
 *  Heuristics:
 *    - First <blockquote> at top-level
 *    - "On <date>… wrote:" line followed by <blockquote>
 *    - "-- " signature line + everything after, plus quoted tail */
function splitQuotedHistory(html: string): { head: string; tail: string } {
  if (!html) return { head: "", tail: "" };
  const indices = [
    html.search(/<blockquote\b/i),
    findOnDateWrote(html),
    html.search(/<div class=["'](gmail_quote|outlook_quote)/i),
    html.search(/<hr\b[^>]*data-mail-original/i),
  ].filter((i) => i >= 0);
  if (indices.length === 0) return { head: html, tail: "" };
  const cut = Math.min(...indices);
  return { head: html.slice(0, cut).trim(), tail: html.slice(cut).trim() };
}

function findOnDateWrote(html: string): number {
  const m = html.match(/<p[^>]*>\s*On\s+[^<]{4,80}wrote:\s*<\/p>/i);
  return m && typeof m.index === "number" ? m.index : -1;
}
