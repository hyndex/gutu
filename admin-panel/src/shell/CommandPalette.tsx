import * as React from "react";
import { Command } from "cmdk";
import { Dialog, DialogContent, DialogPortal, DialogOverlay } from "@/primitives/Dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { NavIcon } from "./NavIcon";
import type { AdminRegistry } from "./registry";
import { navigateTo } from "@/views/useRoute";
import { authStore } from "@/runtime/auth";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registry: AdminRegistry;
}

interface SearchHit {
  resource: string;
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
  matchedField?: string;
  matchedSnippet?: string;
}
interface SearchGroup { resource: string; label: string; hits: SearchHit[]; }

export function CommandPalette({
  open,
  onOpenChange,
  registry,
}: CommandPaletteProps) {
  const [query, setQuery] = React.useState("");
  const [searchGroups, setSearchGroups] = React.useState<SearchGroup[]>([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setSearchGroups([]);
    }
  }, [open]);

  // Global record search — debounced to avoid hitting the API on
  // every keystroke. Backend caps results at 20; we group by
  // resource for rendering. ACL filtering happens server-side so
  // we always get a safe-to-show result set.
  React.useEffect(() => {
    if (!open || query.trim().length < 2) {
      setSearchGroups([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const headers: Record<string, string> = {};
        if (authStore.token) headers.Authorization = `Bearer ${authStore.token}`;
        if (authStore.activeTenant?.id) headers["x-tenant"] = authStore.activeTenant.id;
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}&limit=20`,
          { headers, credentials: "include" },
        );
        if (!res.ok) {
          setSearchGroups([]);
          return;
        }
        const data = (await res.json()) as { groups: SearchGroup[] };
        setSearchGroups(data.groups ?? []);
      } catch {
        setSearchGroups([]);
      } finally {
        setSearching(false);
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [open, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2",
            "rounded-lg border border-border bg-surface-0 shadow-lg overflow-hidden animate-scale-in",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Command palette
          </DialogPrimitive.Title>
          <Command
            shouldFilter
            className="flex flex-col bg-transparent"
            filter={(value, search) => {
              const v = value.toLowerCase();
              const q = search.toLowerCase();
              if (!q) return 1;
              // Server-side search hits are prefixed `record` — they're
              // already filtered by the API, so let them through
              // regardless of the cmdk client-filter.
              if (v.startsWith("record")) return 1;
              if (v.includes(q)) return 1;
              return 0;
            }}
          >
            <Command.Input
              autoFocus
              placeholder="Search navigation, actions, records…"
              value={query}
              onValueChange={setQuery}
              className="w-full h-11 px-4 bg-transparent text-sm outline-none border-b border-border placeholder:text-text-muted"
            />
            <Command.List className="max-h-[360px] overflow-y-auto p-1">
              <Command.Empty className="py-6 text-center text-sm text-text-muted">
                No results found.
              </Command.Empty>

              <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group-heading]]:font-semibold">
                {flattenNav(registry.nav).map((n) =>
                  n.path ? (
                    <CommandItem
                      key={n.id}
                      onSelect={() => {
                        navigateTo(n.path!);
                        onOpenChange(false);
                      }}
                      value={`nav ${n.label} ${n.path}`}
                    >
                      <NavIcon name={n.icon} className="h-4 w-4" />
                      <span>{n.label}</span>
                      <span className="ml-auto text-xs text-text-muted font-mono">
                        {n.path}
                      </span>
                    </CommandItem>
                  ) : null,
                )}
              </Command.Group>

              {registry.commands.length > 0 && (
                <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group-heading]]:font-semibold">
                  {registry.commands.map((c) => (
                    <CommandItem
                      key={c.id}
                      onSelect={async () => {
                        onOpenChange(false);
                        await c.run();
                      }}
                      value={`cmd ${c.label} ${(c.keywords ?? []).join(" ")}`}
                    >
                      <NavIcon name={c.icon ?? "Sparkles"} className="h-4 w-4" />
                      <span>{c.label}</span>
                      {c.shortcut && (
                        <span className="ml-auto text-xs text-text-muted font-mono">
                          {c.shortcut}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </Command.Group>
              )}

              {/*  Live record-search results — fetched from /api/search.
                   Each resource is its own cmdk group so headings
                   (Contacts / Opportunities / Tasks / …) match the
                   user's mental model. Click navigates to the record
                   detail. ACL filtering happens server-side. */}
              {searchGroups.map((g) => (
                <Command.Group
                  key={g.resource}
                  heading={g.label}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group-heading]]:font-semibold"
                >
                  {g.hits.map((h) => (
                    <CommandItem
                      key={`${g.resource}:${h.id}`}
                      value={`record ${g.label} ${h.title} ${h.subtitle ?? ""} ${h.matchedSnippet ?? ""}`}
                      onSelect={() => {
                        if (h.url) navigateTo(h.url);
                        onOpenChange(false);
                      }}
                    >
                      <NavIcon name="FileText" className="h-4 w-4" />
                      <span className="truncate flex-1">{h.title}</span>
                      {h.subtitle && (
                        <span className="ml-2 text-xs text-text-muted truncate">{h.subtitle}</span>
                      )}
                    </CommandItem>
                  ))}
                </Command.Group>
              ))}
              {searching && query.trim().length >= 2 && searchGroups.length === 0 && (
                <div className="py-4 text-center text-xs text-text-muted">Searching…</div>
              )}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function CommandItem({
  onSelect,
  value,
  children,
}: {
  onSelect: () => void;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-text-primary cursor-pointer",
        "data-[selected=true]:bg-surface-2",
      )}
    >
      {children}
    </Command.Item>
  );
}

function flattenNav(
  nav: AdminRegistry["nav"],
  out: AdminRegistry["nav"][number][] = [],
): AdminRegistry["nav"][number][] {
  for (const item of nav) {
    out.push(item);
    if (item.children) flattenNav(item.children, out);
  }
  return out;
}
