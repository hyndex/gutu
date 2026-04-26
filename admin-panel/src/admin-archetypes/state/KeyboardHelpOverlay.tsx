import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ShortcutBinding } from "../hooks/useArchetypeKeyboard";

export interface KeyboardHelpOverlayProps {
  /** When true, the overlay is rendered open. */
  open: boolean;
  /** Bindings to show. Pass the array returned from useArchetypeKeyboard. */
  bindings: readonly ShortcutBinding[];
  /** Close handler. */
  onClose: () => void;
  /** Title shown at the top of the dialog. */
  title?: React.ReactNode;
  className?: string;
}

const isMac =
  typeof navigator !== "undefined" && /mac/i.test(navigator.platform);

/** Renders a single key combo as styled `<kbd>` glyphs. */
export function ComboGlyphs({ combo, className }: { combo: string; className?: string }) {
  const parts = combo.split("+").map((p) => p.trim().toLowerCase());
  const labels = parts.map((p) => {
    if (p === "cmd" || p === "meta") return isMac ? "⌘" : "Ctrl";
    if (p === "ctrl") return "Ctrl";
    if (p === "shift") return "⇧";
    if (p === "alt" || p === "option") return isMac ? "⌥" : "Alt";
    if (p === "enter") return "↵";
    if (p === "esc" || p === "escape") return "Esc";
    if (p === "up") return "↑";
    if (p === "down") return "↓";
    if (p === "left") return "←";
    if (p === "right") return "→";
    if (p === " ") return "Space";
    if (p === "?") return "?";
    return p.length === 1 ? p.toUpperCase() : p;
  });
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {labels.map((l, i) => (
        <kbd
          key={i}
          className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-primary font-mono text-[11px] leading-none"
        >
          {l}
        </kbd>
      ))}
    </span>
  );
}

/** A modal dialog that lists every keyboard binding registered for the
 *  current archetype. Plugins typically wire it to the `?` shortcut. */
export function KeyboardHelpOverlay({
  open,
  bindings,
  onClose,
  title = "Keyboard shortcuts",
  className,
}: KeyboardHelpOverlayProps) {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);

  // Esc to close + focus trap.
  React.useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        // Trivial trap: keep focus within the dialog.
        const root = dialogRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'a, button, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    // Move focus into the dialog.
    const t = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    }, 0);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Group bindings.
  const grouped = bindings.reduce<Record<string, ShortcutBinding[]>>(
    (acc, b) => {
      const g = b.group ?? "General";
      (acc[g] ??= []).push(b);
      return acc;
    },
    {},
  );
  const groupNames = Object.keys(grouped).sort();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-help-title"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4",
        className,
      )}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-surface-raised rounded-lg border border-border shadow-lg max-w-lg w-full max-h-[80vh] overflow-auto motion-reduce:transition-none"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-surface-raised">
          <h2 id="keyboard-help-title" className="text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded hover:bg-surface-1"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="p-4 space-y-4">
          {bindings.length === 0 ? (
            <p className="text-sm text-text-muted">
              No keyboard shortcuts registered on this page.
            </p>
          ) : (
            groupNames.map((g) => (
              <section key={g}>
                <h3 className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1.5">
                  {g}
                </h3>
                <ul className="rounded-md border border-border-subtle divide-y divide-border-subtle">
                  {grouped[g].map((b, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span className="text-text-primary truncate">{b.label}</span>
                      <ComboGlyphs combo={b.combo} className="shrink-0" />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
        <footer className="px-4 py-2 text-xs text-text-muted border-t border-border-subtle bg-surface-1/40">
          Press <ComboGlyphs combo="esc" /> to close.
        </footer>
      </div>
    </div>
  );
}

/** Convenience hook: wires `?` to open and `Esc` to close, returns
 *  `[open, setOpen]`. Pages call this and pass `open` + their bindings
 *  to <KeyboardHelpOverlay>. */
export function useKeyboardHelp(): [boolean, (next: boolean) => void] {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as { tagName?: string; isContentEditable?: boolean } | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return [open, setOpen];
}
