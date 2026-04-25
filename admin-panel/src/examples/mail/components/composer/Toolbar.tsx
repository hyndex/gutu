/** Composer rich-text toolbar — wraps a contenteditable element.
 *
 *  Uses `document.execCommand` (still universally supported for these
 *  basic operations on contenteditable surfaces) for: bold, italic,
 *  underline, ordered/unordered lists, blockquote, link, code, clear-
 *  formatting. Inline image insertion uses a direct DOM op so the
 *  composer can route the upload through the attachments resource. */

import * as React from "react";
import {
  Bold, Italic, Underline, List, ListOrdered, Quote, Link2, Code, Eraser, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/primitives/Button";

export interface ToolbarProps {
  /** ref to the contenteditable element. */
  editor: React.RefObject<HTMLElement | null>;
  onInsertImage: () => void;
  onLink: () => void;
}

export function Toolbar(props: ToolbarProps): React.ReactElement {
  const exec = React.useCallback((cmd: string, val?: string) => {
    const el = props.editor.current;
    if (!el) return;
    el.focus();
    try {
      // Maintain selection inside the editor before exec.
      document.execCommand(cmd, false, val);
    } catch {
      /* execCommand throws on unsupported commands in some browsers */
    }
  }, [props.editor]);

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1 text-xs">
      <Btn label="Bold (⌘B)" onClick={() => exec("bold")}><Bold size={14} /></Btn>
      <Btn label="Italic (⌘I)" onClick={() => exec("italic")}><Italic size={14} /></Btn>
      <Btn label="Underline (⌘U)" onClick={() => exec("underline")}><Underline size={14} /></Btn>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <Btn label="Bullet list" onClick={() => exec("insertUnorderedList")}><List size={14} /></Btn>
      <Btn label="Numbered list" onClick={() => exec("insertOrderedList")}><ListOrdered size={14} /></Btn>
      <Btn label="Quote" onClick={() => exec("formatBlock", "blockquote")}><Quote size={14} /></Btn>
      <Btn label="Code" onClick={() => exec("formatBlock", "pre")}><Code size={14} /></Btn>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <Btn label="Insert link" onClick={props.onLink}><Link2 size={14} /></Btn>
      <Btn label="Insert image" onClick={props.onInsertImage}><ImageIcon size={14} /></Btn>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <Btn label="Clear formatting" onClick={() => exec("removeFormat")}><Eraser size={14} /></Btn>
    </div>
  );
}

function Btn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }): React.ReactElement {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onMouseDown={(e) => { e.preventDefault(); /* keep selection */ }}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="h-7 w-7 p-0"
    >
      {children}
    </Button>
  );
}
