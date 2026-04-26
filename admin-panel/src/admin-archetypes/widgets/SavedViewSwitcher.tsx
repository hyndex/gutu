import * as React from "react";
import { Plus, Star, Pin, Trash2 } from "lucide-react";
import { Button } from "@/primitives/Button";
import { cn } from "@/lib/cn";
import { useUrlState } from "../hooks/useUrlState";

/** A saved view collapses filter / group / sort / period state into one
 *  named entry. The widget renders a pill bar of the user's saved views
 *  and a "+ Save current view" affordance.
 *
 *  This widget is intentionally storage-agnostic: it accepts a `views`
 *  array and a small set of mutation callbacks. Plugins wire it to the
 *  `saved-views-core` plugin (when available) or to in-memory state for
 *  reference / demo pages. */

export interface SavedView {
  id: string;
  label: string;
  /** Lucide icon name (optional). */
  icon?: string;
  /** When true, view appears with a star indicator. */
  pinned?: boolean;
  /** When true, view is shared with the team. */
  shared?: boolean;
  /** Description shown on hover. */
  description?: string;
}

export interface SavedViewSwitcherProps {
  /** Available views to switch between. */
  views: readonly SavedView[];
  /** Optional callback for "+ Save current view" — receives a label. */
  onCreate?: (label: string) => void | Promise<void>;
  /** Optional delete callback (receives the view id). */
  onDelete?: (id: string) => void | Promise<void>;
  /** Optional pin/unpin toggle. */
  onTogglePin?: (id: string) => void | Promise<void>;
  /** Override the URL state key used to track active view. Default: `view`. */
  urlKey?: string;
  className?: string;
}

/** Renders the pill-strip view switcher.
 *  The active view id round-trips through the URL (`?view=<id>` by default). */
export function SavedViewSwitcher({
  views,
  onCreate,
  onDelete,
  onTogglePin,
  urlKey = "view",
  className,
}: SavedViewSwitcherProps) {
  // We pass the literal "view" string through useUrlState — TypeScript
  // can't read `urlKey` at compile time, so we cast the key list.
  const [params, setParams] = useUrlState([urlKey] as readonly string[] as readonly never[]);
  const activeId = (params as Record<string, string | undefined>)[urlKey];

  const [creating, setCreating] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const sorted = React.useMemo(() => {
    return [...views].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  }, [views]);

  const select = (id: string | null) => {
    const patch = { [urlKey]: id ?? null } as Record<string, string | null>;
    setParams(patch as Record<string, string | undefined | null>, true);
  };

  const submitCreate = async () => {
    const label = draft.trim();
    if (!label || !onCreate) {
      setCreating(false);
      setDraft("");
      return;
    }
    setBusy(true);
    try {
      await onCreate(label);
    } finally {
      setBusy(false);
      setCreating(false);
      setDraft("");
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Saved views"
      className={cn("flex items-center gap-1 flex-wrap", className)}
    >
      {sorted.map((v) => {
        const active = v.id === activeId;
        return (
          <div key={v.id} className="group relative inline-flex items-center">
            <button
              type="button"
              role="tab"
              aria-selected={active}
              title={v.description}
              onClick={() => select(active ? null : v.id)}
              className={cn(
                "px-2 py-1 rounded-md text-xs inline-flex items-center gap-1 transition border",
                active
                  ? "bg-info-soft text-info-strong border-info/30"
                  : "bg-surface-1 text-text-muted border-transparent hover:text-text-primary hover:bg-surface-2",
              )}
            >
              {v.pinned && <Pin className="h-3 w-3 shrink-0" aria-hidden />}
              <span className="truncate max-w-[160px]">{v.label}</span>
              {v.shared && <Star className="h-2.5 w-2.5 text-warning shrink-0" aria-hidden />}
            </button>
            {(onTogglePin || onDelete) && (
              <div className="absolute hidden group-hover:flex right-0 top-full mt-1 z-10 rounded-md border border-border bg-surface-raised shadow-md p-0.5">
                {onTogglePin && (
                  <button
                    type="button"
                    onClick={() => void onTogglePin(v.id)}
                    className="p-1 rounded hover:bg-surface-1 text-text-muted hover:text-text-primary"
                    aria-label={v.pinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="h-3 w-3" aria-hidden />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => void onDelete(v.id)}
                    className="p-1 rounded hover:bg-danger-soft text-text-muted hover:text-danger-strong"
                    aria-label={`Delete view ${v.label}`}
                  >
                    <Trash2 className="h-3 w-3" aria-hidden />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {onCreate && !creating && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setCreating(true)}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" aria-hidden />
          Save view
        </Button>
      )}
      {creating && onCreate && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitCreate();
          }}
          className="inline-flex items-center gap-1"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="View name"
            autoFocus
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setCreating(false);
                setDraft("");
              }
            }}
            className="h-6 rounded border border-border bg-surface-0 px-2 text-xs"
          />
          <Button size="sm" type="submit" disabled={busy || !draft.trim()}>
            Save
          </Button>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setCreating(false);
              setDraft("");
            }}
          >
            Cancel
          </Button>
        </form>
      )}
    </div>
  );
}
