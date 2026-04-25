import * as React from "react";
import { BookmarkPlus, Check, ChevronDown, MoreHorizontal, Pin, Star, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/primitives/Popover";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/primitives/DropdownMenu";
import { cn } from "@/lib/cn";
import { useRuntime } from "@/runtime/context";
import { useFavorites } from "@/runtime/useFavorites";
import type { SavedView } from "@/contracts/saved-views";

export interface SavedViewManagerProps {
  resource: string;
  /** Current view state — used when user clicks "Save as". */
  currentState: {
    filter?: SavedView["filter"];
    sort?: SavedView["sort"];
    columns?: readonly string[];
    grouping?: string;
    density?: SavedView["density"];
    pageSize?: number;
  };
  /** Active view id (if one is applied). */
  activeId?: string | null;
  /** Called when user selects a saved view. */
  onSelect: (view: SavedView | null) => void;
  /** Called after user creates a new view so the parent can refresh. */
  onSaved?: (view: SavedView) => void;
  className?: string;
}

export function SavedViewManager({
  resource,
  currentState,
  activeId,
  onSelect,
  onSaved,
  className,
}: SavedViewManagerProps) {
  const { savedViews, analytics } = useRuntime();
  const favorites = useFavorites();
  const [, rerender] = React.useReducer((n) => n + 1, 0);
  const [creating, setCreating] = React.useState(false);
  const [label, setLabel] = React.useState("");

  React.useEffect(() => {
    return savedViews.subscribe(() => rerender());
  }, [savedViews]);

  const views = savedViews.list(resource);
  const active = activeId ? savedViews.get(activeId) : null;

  const handleSelect = (view: SavedView | null) => {
    onSelect(view);
    if (view) {
      analytics.emit("page.saved_view.applied", { viewId: view.id, scope: view.scope });
    }
  };

  const handleSave = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const saved = savedViews.save({
      resource,
      label: trimmed,
      scope: "personal",
      ...currentState,
    });
    analytics.emit("page.saved_view.saved", { viewId: saved.id, scope: saved.scope });
    setLabel("");
    setCreating(false);
    onSaved?.(saved);
    handleSelect(saved);
  };

  return (
    <div className={cn("inline-flex items-center", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            iconRight={<ChevronDown className="h-3 w-3" />}
          >
            {active ? active.label : "All records"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              Saved views
            </div>
            <button
              type="button"
              className="text-xs text-text-muted hover:text-text-primary inline-flex items-center gap-1"
              onClick={() => setCreating((c) => !c)}
            >
              <BookmarkPlus className="h-3 w-3" />
              New
            </button>
          </div>
          {creating && (
            <div className="p-2 border-b border-border flex items-center gap-2">
              <Input
                autoFocus
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="View name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setCreating(false);
                }}
              />
              <Button size="sm" variant="primary" onClick={handleSave} disabled={!label.trim()}>
                Save
              </Button>
            </div>
          )}
          <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
            <li>
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-surface-1",
                  !active && "text-accent",
                )}
              >
                {!active && <Check className="h-3.5 w-3.5" />}
                <span className={cn(active && "ml-[22px]")}>All records (default)</span>
              </button>
            </li>
            {views.map((v) => {
              const starred = favorites.isFavorite("view", v.id);
              return (
              <li key={v.id} className="group">
                <div className="flex items-center gap-1 pr-1 hover:bg-surface-1">
                  <button
                    type="button"
                    onClick={() => handleSelect(v)}
                    className={cn(
                      "flex-1 flex items-center gap-2 px-3 py-1.5 text-sm text-left",
                      active?.id === v.id && "text-accent",
                    )}
                  >
                    {active?.id === v.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : v.pinned ? (
                      <Pin className="h-3.5 w-3.5 text-text-muted" />
                    ) : (
                      <span className="w-3.5" />
                    )}
                    <span className="flex-1 truncate">{v.label}</span>
                    {v.scope !== "personal" && (
                      <span className="text-xs text-text-muted uppercase">
                        {v.scope}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (starred) {
                        void favorites.remove("view", v.id);
                      } else {
                        void favorites.add({
                          kind: "view",
                          targetId: v.id,
                          label: v.label,
                        });
                      }
                    }}
                    aria-pressed={starred}
                    aria-label={
                      starred
                        ? `Unstar ${v.label}`
                        : `Star ${v.label}`
                    }
                    title={
                      starred
                        ? "Remove from sidebar Favorites"
                        : "Add to sidebar Favorites"
                    }
                    className={cn(
                      "h-7 w-7 flex items-center justify-center rounded transition-colors",
                      starred
                        ? "text-amber-500 opacity-100"
                        : "text-text-muted opacity-0 group-hover:opacity-100 hover:text-text-primary",
                    )}
                  >
                    <Star
                      className={cn(
                        "h-3.5 w-3.5",
                        starred && "fill-current",
                      )}
                      aria-hidden
                    />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-surface-2 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Manage ${v.label}`}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() =>
                          savedViews.save({ ...v, pinned: !v.pinned, id: v.id })
                        }
                      >
                        <Pin className="h-3.5 w-3.5 mr-2" />
                        {v.pinned ? "Unpin" : "Pin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => savedViews.setDefault(resource, v.id)}
                      >
                        <Star className="h-3.5 w-3.5 mr-2" />
                        Set as default
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          savedViews.delete(v.id);
                          if (active?.id === v.id) handleSelect(null);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2 text-intent-danger" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
              );
            })}
            {views.length === 0 && !creating && (
              <li className="px-3 py-4 text-xs text-text-muted text-center">
                No saved views yet
              </li>
            )}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
