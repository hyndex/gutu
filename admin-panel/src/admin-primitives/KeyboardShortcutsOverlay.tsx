import * as React from "react";
import { Dialog, DialogContent } from "@/primitives/Dialog";

export interface Shortcut {
  keys: string[];
  description: string;
  category?: string;
}

export interface KeyboardShortcutsOverlayProps {
  shortcuts: readonly Shortcut[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_SHORTCUTS: readonly Shortcut[] = [
  { keys: ["⌘", "K"], description: "Open command palette", category: "Global" },
  { keys: ["/"], description: "Focus search", category: "Global" },
  { keys: ["?"], description: "Show this help", category: "Global" },
  { keys: ["G", "H"], description: "Go to Home", category: "Navigation" },
  { keys: ["G", "I"], description: "Go to Inbox", category: "Navigation" },
  { keys: ["G", "S"], description: "Go to Settings", category: "Navigation" },
  { keys: ["J"], description: "Next row", category: "Table" },
  { keys: ["K"], description: "Previous row", category: "Table" },
  { keys: ["Enter"], description: "Open selected row", category: "Table" },
  { keys: ["E"], description: "Edit selected row", category: "Table" },
  { keys: ["Shift", "Click"], description: "Range-select rows", category: "Table" },
  { keys: ["X"], description: "Toggle row selection", category: "Table" },
  { keys: ["Esc"], description: "Close drawer/dialog", category: "General" },
];

export function KeyboardShortcutsOverlay({
  shortcuts = DEFAULT_SHORTCUTS,
  open,
  onOpenChange,
}: KeyboardShortcutsOverlayProps) {
  const grouped = React.useMemo(() => {
    const m = new Map<string, Shortcut[]>();
    for (const s of shortcuts) {
      const cat = s.category ?? "General";
      const list = m.get(cat) ?? [];
      list.push(s);
      m.set(cat, list);
    }
    return m;
  }, [shortcuts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <div className="px-5 py-4 border-b border-border">
          <div className="text-sm font-semibold text-text-primary">
            Keyboard shortcuts
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            Press{" "}
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-2 border border-border rounded">
              ?
            </kbd>{" "}
            anywhere to open this dialog.
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
          {Array.from(grouped.entries()).map(([cat, items]) => (
            <div key={cat}>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                {cat}
              </div>
              <ul className="flex flex-col gap-1.5">
                {items.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-text-secondary">{s.description}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {s.keys.map((k, j) => (
                        <React.Fragment key={j}>
                          {j > 0 && (
                            <span className="text-xs text-text-muted">+</span>
                          )}
                          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-2 border border-border rounded">
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { DEFAULT_SHORTCUTS };
