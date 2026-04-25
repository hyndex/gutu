/** Keyboard shortcut help overlay — opens on `?`.
 *
 *  Reads the canonical shortcut list from `shortcuts.ts`. Static for
 *  now; a future iteration could merge with user-customized bindings
 *  from `mail.hotkeys`. */

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/primitives/Dialog";

const SECTIONS: { title: string; shortcuts: { keys: string; label: string }[] }[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: "g i", label: "Go to inbox" },
      { keys: "g s", label: "Go to sent" },
      { keys: "g d", label: "Go to drafts" },
      { keys: "g t", label: "Go to trash" },
      { keys: "g a", label: "Go to all mail" },
      { keys: "g k", label: "Go to starred" },
      { keys: "j", label: "Next conversation" },
      { keys: "k", label: "Previous conversation" },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: "c", label: "Compose" },
      { keys: "r", label: "Reply" },
      { keys: "a", label: "Reply all" },
      { keys: "f", label: "Forward" },
      { keys: "e", label: "Archive" },
      { keys: "Shift 3", label: "Trash" },
      { keys: "Shift 1", label: "Mark spam" },
      { keys: "s", label: "Star" },
      { keys: "Shift I", label: "Mark read" },
      { keys: "Shift U", label: "Mark unread" },
      { keys: "b", label: "Snooze" },
      { keys: "/", label: "Search" },
      { keys: "?", label: "Show this help" },
    ],
  },
  {
    title: "Composer",
    shortcuts: [
      { keys: "⌘ Enter", label: "Send" },
      { keys: "⌘ B", label: "Bold" },
      { keys: "⌘ I", label: "Italic" },
      { keys: "⌘ U", label: "Underline" },
      { keys: "Esc", label: "Discard / minimize" },
    ],
  },
];

export function KeyboardHelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">{s.title}</h3>
              <ul className="space-y-1">
                {s.shortcuts.map((sc) => (
                  <li key={sc.keys} className="flex items-center justify-between gap-2 text-sm">
                    <span>{sc.label}</span>
                    <span className="font-mono text-xs">
                      {sc.keys.split(" ").map((k, i) => (
                        <kbd key={i} className="ml-1 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[11px]">{k}</kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
