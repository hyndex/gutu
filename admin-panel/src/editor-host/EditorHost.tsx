/** Editor host — frames every editor into a same-origin iframe.
 *
 *  Mounts `/editor-frame.html?kind=…&id=…` in a sandboxed iframe so the
 *  embedded runtime (Univer or BlockSuite) doesn't run inside the shell's
 *  StrictMode. Same-origin → cookies + localStorage are shared → the
 *  iframe's `fetch()` calls are auth'd via the same `authStore` token.
 *
 *  The host listens on postMessage for save-status events from the iframe
 *  and forwards them into the visible header. Saves themselves are
 *  performed inside the iframe (it owns the Y.Doc), so the host never
 *  touches the editor's bytes — it just renders the frame and proxies
 *  status. */

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { EditorKind, EditorRecord } from "./types";
import { EditorErrorBoundary } from "./EditorErrorBoundary";

interface EditorHostProps {
  kind: EditorKind;
  record: EditorRecord;
  onClose?: () => void;
}

type SaveStatus = "loading" | "ready" | "saving" | "saved" | "retrying" | "error";

interface FrameMessage {
  type?: string;
  kind?: string;
  id?: string;
  status?: SaveStatus;
  error?: string;
}

function EditorHostInner({ kind, record, onClose }: EditorHostProps): React.JSX.Element {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MessageEvent<FrameMessage>) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data;
      if (!data || typeof data !== "object") return;
      switch (data.type) {
        case "editor-frame-ready":
          setStatus("ready");
          setErrorMsg(null);
          break;
        case "editor-frame-status":
          if (data.status) setStatus(data.status);
          if (data.status === "error" && data.error) setErrorMsg(data.error);
          if (data.status === "saved") setErrorMsg(null);
          break;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const triggerSave = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "editor-frame-save-now" },
      window.location.origin,
    );
  }, []);

  const src = `/editor-frame.html?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(record.id)}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 16px",
          borderBottom: "1px solid #e5e5e5",
          fontSize: 14,
          background: "#fafafa",
          flexShrink: 0,
        }}
      >
        <strong style={{ flex: 1 }}>{record.title}</strong>
        <span
          aria-live="polite"
          role="status"
          style={{ marginRight: 12, color: statusColor(status), minWidth: 84, textAlign: "right" }}
        >
          {statusLabel(status)}
        </span>
        <button
          type="button"
          onClick={triggerSave}
          disabled={status === "saving" || status === "retrying"}
          style={{ marginRight: 8, padding: "4px 10px", fontSize: 13 }}
        >
          Save now
        </button>
        {onClose && (
          <button onClick={onClose} type="button" style={{ padding: "4px 10px", fontSize: 13 }}>
            Close
          </button>
        )}
      </header>
      <iframe
        ref={iframeRef}
        title={`${kind} editor`}
        src={src}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
        style={{ flex: 1, border: 0, width: "100%", minHeight: 0, background: "#fff" }}
      />
      {errorMsg && (
        <div
          role="alert"
          style={{
            padding: 8,
            background: "#fee",
            color: "#900",
            fontSize: 13,
            borderTop: "1px solid #f3c2c2",
          }}
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
}

export function EditorHost(props: EditorHostProps): React.JSX.Element {
  return (
    <EditorErrorBoundary kind={props.kind} recordId={props.record.id}>
      <EditorHostInner {...props} />
    </EditorErrorBoundary>
  );
}

function statusColor(s: SaveStatus): string {
  switch (s) {
    case "saved": return "#3a9b3a";
    case "saving": return "#b58900";
    case "retrying": return "#d97706";
    case "error": return "#b00020";
    case "ready": return "#555";
    default: return "#999";
  }
}

function statusLabel(s: SaveStatus): string {
  switch (s) {
    case "loading": return "Loading…";
    case "ready": return "Ready";
    case "saving": return "Saving…";
    case "retrying": return "Retrying…";
    case "saved": return "Saved";
    case "error": return "Error";
    default: return s;
  }
}
