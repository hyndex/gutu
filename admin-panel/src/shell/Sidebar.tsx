import * as React from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { NavIcon } from "./NavIcon";
import type { AdminRegistry } from "./registry";
import type { NavItem, NavSection } from "@/contracts/nav";
import { navigateTo } from "@/views/useRoute";

export interface SidebarProps {
  registry: AdminRegistry;
  currentPath: string;
}

export function Sidebar({ registry, currentPath }: SidebarProps) {
  const grouped = groupBySection(registry.nav, registry.navSections);
  const [filter, setFilter] = React.useState("");

  const needle = filter.trim().toLowerCase();
  const filteredGroups = needle
    ? grouped
        .map(({ section, items }) => ({
          section,
          items: items.filter(
            (i) =>
              i.label.toLowerCase().includes(needle) ||
              (i.path?.toLowerCase().includes(needle) ?? false),
          ),
        }))
        .filter((g) => g.items.length > 0)
    : grouped;

  return (
    <aside
      className="w-sidebar-w shrink-0 h-full bg-surface-1 border-r border-border flex flex-col"
      aria-label="Primary navigation"
    >
      <div className="flex items-center gap-2 px-4 h-topbar-h border-b border-border shrink-0">
        <div
          className="w-7 h-7 rounded-md bg-accent text-accent-fg flex items-center justify-center text-xs font-bold"
          aria-hidden
        >
          G
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-text-primary">Gutu</span>
          <span className="text-[10px] text-text-muted uppercase tracking-wider">
            Admin
          </span>
        </div>
      </div>

      <div className="px-2 pt-2 shrink-0">
        <label className="relative block">
          <span className="sr-only">Filter navigation</span>
          <Search
            className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted"
            aria-hidden
          />
          <input
            type="text"
            placeholder="Filter…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full h-7 pl-7 pr-2 rounded-md border border-border bg-surface-0 text-sm outline-none placeholder:text-text-muted focus:shadow-focus focus:border-accent"
          />
        </label>
      </div>

      <nav className="p-2 flex flex-col gap-3 overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="px-2 py-3 text-xs text-text-muted">
            No matches for “{filter}”.
          </div>
        ) : (
          filteredGroups.map(({ section, items }) => (
            <Section
              key={section?.id ?? "__default"}
              section={section}
              items={items}
              currentPath={currentPath}
              forceOpen={!!needle}
            />
          ))
        )}
      </nav>
    </aside>
  );
}

function Section({
  section,
  items,
  currentPath,
  forceOpen,
}: {
  section?: NavSection;
  items: NavItem[];
  currentPath: string;
  forceOpen: boolean;
}) {
  const containsActive = items.some(
    (i) =>
      !!i.path &&
      (currentPath === i.path || currentPath.startsWith(i.path + "/")),
  );
  const [open, setOpen] = React.useState<boolean>(
    forceOpen || containsActive || !section,
  );
  React.useEffect(() => {
    if (forceOpen || containsActive) setOpen(true);
  }, [forceOpen, containsActive]);

  return (
    <div className="flex flex-col gap-0.5">
      {section && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider hover:text-text-secondary transition-colors"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              !open && "-rotate-90",
            )}
            aria-hidden
          />
          {section.label}
        </button>
      )}
      {open &&
        items.map((item) => (
          <NavEntry
            key={item.id}
            item={item}
            currentPath={currentPath}
            depth={0}
          />
        ))}
    </div>
  );
}

function NavEntry({
  item,
  currentPath,
  depth,
}: {
  item: NavItem;
  currentPath: string;
  depth: number;
}) {
  const active =
    !!item.path &&
    (currentPath === item.path || currentPath.startsWith(item.path + "/"));
  const hasChildren = (item.children?.length ?? 0) > 0;
  const [open, setOpen] = React.useState<boolean>(active || depth === 0);

  if (!item.path && hasChildren) {
    return (
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-text-secondary",
            "hover:text-text-primary hover:bg-surface-2 transition-colors",
          )}
        >
          <NavIcon name={item.icon} className="h-4 w-4" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform text-text-muted",
              !open && "-rotate-90",
            )}
            aria-hidden
          />
        </button>
        {open && (
          <div className="pl-4 flex flex-col gap-0.5">
            {item.children!.map((c) => (
              <NavEntry
                key={c.id}
                item={c}
                currentPath={currentPath}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <a
      href={item.path ? `#${item.path}` : undefined}
      onClick={(e) => {
        if (!item.path) return;
        e.preventDefault();
        navigateTo(item.path);
      }}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
        active
          ? "bg-accent-subtle text-accent font-medium"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-2",
      )}
      aria-current={active ? "page" : undefined}
    >
      <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
      <span className="flex-1 min-w-0 truncate">{item.label}</span>
      {item.badge != null && (
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-medium",
            active
              ? "bg-accent text-accent-fg"
              : "bg-surface-3 text-text-secondary",
          )}
        >
          {item.badge}
        </span>
      )}
    </a>
  );
}

function groupBySection(
  nav: AdminRegistry["nav"],
  sections: readonly NavSection[],
) {
  const sectionMap = new Map(sections.map((s) => [s.id, s]));
  const groups = new Map<string | undefined, NavItem[]>();
  for (const item of nav) {
    const key = item.section ?? undefined;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  const out: { section?: NavSection; items: NavItem[] }[] = [];
  if (groups.has(undefined)) out.push({ items: groups.get(undefined)! });
  for (const s of sections) {
    if (groups.has(s.id)) out.push({ section: s, items: groups.get(s.id)! });
  }
  for (const [k, items] of groups) {
    if (k === undefined) continue;
    if (!sectionMap.has(k))
      out.push({ section: { id: k, label: k }, items });
  }
  return out;
}
