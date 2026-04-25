/** Contenteditable rich-text editor.
 *
 *  Sanitizes pasted HTML on the way in and emits HTML on every input
 *  via `onChange`. Supports drag-drop / paste of images by emitting
 *  `onUpload(file, isInline)` callbacks. */

import * as React from "react";
import { clientSanitize } from "../../lib/sanitize-client";

export interface RichEditorHandle {
  focus(): void;
  insertHtml(html: string): void;
  insertImage(url: string, alt?: string): void;
}

export interface RichEditorProps {
  initialHtml?: string;
  onChange: (html: string, plain: string) => void;
  onUpload?: (file: File, kind: "inline" | "attachment") => Promise<void> | void;
  placeholder?: string;
  className?: string;
}

export const RichEditor = React.forwardRef<RichEditorHandle, RichEditorProps>((props, ref) => {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const initial = React.useRef(props.initialHtml ?? "");

  React.useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    insertHtml: (html) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const sanitized = clientSanitize(html);
      try { document.execCommand("insertHTML", false, sanitized); } catch { /* ignore */ }
      emit();
    },
    insertImage: (url, alt) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const html = `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt ?? "")}" style="max-width:100%;height:auto" />`;
      try { document.execCommand("insertHTML", false, html); } catch { /* ignore */ }
      emit();
    },
  }), []);

  const emit = React.useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = clientSanitize(el.innerHTML);
    const plain = el.innerText;
    props.onChange(html, plain);
  }, [props]);

  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (initial.current && el.innerHTML !== initial.current) {
      el.innerHTML = clientSanitize(initial.current);
    }
  }, []);

  const onPaste = React.useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    for (const it of items) {
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f) {
          e.preventDefault();
          await props.onUpload?.(f, f.type.startsWith("image/") ? "inline" : "attachment");
          emit();
          return;
        }
      }
    }
    // Sanitize HTML pastes.
    const html = e.clipboardData?.getData("text/html");
    if (html) {
      e.preventDefault();
      const safe = clientSanitize(html);
      try { document.execCommand("insertHTML", false, safe); } catch { /* ignore */ }
      emit();
    }
  }, [props, emit]);

  const onDrop = React.useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.files.length) return;
    e.preventDefault();
    for (const f of Array.from(e.dataTransfer.files)) {
      await props.onUpload?.(f, f.type.startsWith("image/") ? "inline" : "attachment");
    }
    emit();
  }, [props, emit]);

  return (
    <div
      ref={editorRef}
      contentEditable
      role="textbox"
      aria-label="Compose body"
      aria-multiline="true"
      data-placeholder={props.placeholder ?? "Write your message…"}
      className={[
        "min-h-[180px] max-h-[60vh] overflow-y-auto rounded-md border border-border bg-surface-0 px-3 py-2 text-sm leading-relaxed outline-none",
        "focus:ring-1 focus:ring-accent",
        "[&[data-placeholder]:empty]:before:pointer-events-none [&[data-placeholder]:empty]:before:text-text-muted [&[data-placeholder]:empty]:before:content-[attr(data-placeholder)]",
        props.className ?? "",
      ].join(" ")}
      onInput={emit}
      onPaste={onPaste}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      suppressContentEditableWarning
    />
  );
});
RichEditor.displayName = "RichEditor";

export function getRichEditorEl(handle: RichEditorHandle | null): HTMLElement | null {
  // Helper exported separately to avoid leaking the internal ref through
  // the public handle. Currently unused; reserved for keyboard helper.
  void handle;
  return null;
}

function escapeAttr(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
