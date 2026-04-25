import * as React from "react";
import { ChevronDown, Search, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { NavIcon } from "./NavIcon";
import type { AdminRegistry } from "./registry";
import type { NavItem, NavSection } from "@/contracts/nav";
import { navigateTo } from "@/views/useRoute";
import { useFavorites, type Favorite } from "@/runtime/useFavorites";

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
        {/* Favorites — fetched separately from /api/favorites; renders
         *  nothing when the user has none.                              */}
        <FavoritesSection
          registry={registry}
          currentPath={currentPath}
          filter={needle}
        />

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

/* ----------------------------------------------------------- */
/* Favorites — backed by /api/favorites (useFavorites hook).    */
/* drag-reorder is post-v1                                       */
/* ----------------------------------------------------------- */

function FavoritesSection({
  registry,
  currentPath,
  filter,
}: {
  registry: AdminRegistry;
  currentPath: string;
  filter: string;
}) {
  const fav = useFavorites();
  const rows = fav.list();

  // Build resource → base path map once per render — used to translate
  // record/view favorites into hash routes.
  const basePathMap = React.useMemo(
    () => buildBasePathMap(registry),
    [registry],
  );

  const resolved = React.useMemo(
    () =>
      rows
        .map((f) => resolveFavorite(f, basePathMap))
        .filter((x): x is ResolvedFavorite => !!x),
    [rows, basePathMap],
  );

  const filtered = filter
    ? resolved.filter(
        (r) =>
          r.label.toLowerCase().includes(filter) ||
          r.path.toLowerCase().includes(filter),
      )
    : resolved;

  // Empty: do not render the section header at all (per spec).
  if (filtered.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5">
      <div
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider"
        aria-label="Favorites"
      >
        <Star className="h-3 w-3" aria-hidden />
        Favorites
      </div>
      {filtered.map((f) => (
        <FavoriteEntry
          key={`${f.kind}:${f.targetId}`}
          fav={f}
          currentPath={currentPath}
        />
      ))}
    </div>
  );
}

interface ResolvedFavorite {
  kind: Favorite["kind"];
  targetId: string;
  label: string;
  icon: string | null;
  /** For internal routes — the hash path to navigate to. */
  path: string;
  /** True when the link is an absolute URL (kind=link); the entry uses
   *  a real anchor with target=_blank. */
  external: boolean;
}

function resolveFavorite(
  f: Favorite,
  basePathMap: Record<string, string>,
): ResolvedFavorite | null {
  const fallbackLabel = f.label ?? labelFromTarget(f);

  if (f.kind === "link") {
    return {
      kind: "link",
      targetId: f.targetId,
      label: fallbackLabel,
      icon: f.icon,
      path: f.targetId,
      external: true,
    };
  }
  if (f.kind === "page") {
    return {
      kind: "page",
      targetId: f.targetId,
      label: fallbackLabel,
      icon: f.icon,
      path: `/page/${f.targetId}`,
      external: false,
    };
  }
  if (f.kind === "record") {
    // targetId convention: "<resource>:<recordId>"
    const idx = f.targetId.indexOf(":");
    if (idx === -1) return null;
    const resource = f.targetId.slice(0, idx);
    const recordId = f.targetId.slice(idx + 1);
    const base = basePathMap[resource];
    if (!base) return null; // resource not contributed by any plugin in this build
    return {
      kind: "record",
      targetId: f.targetId,
      label: fallbackLabel,
      icon: f.icon,
      path: `${base}/${recordId}`,
      external: false,
    };
  }
  if (f.kind === "view") {
    // Saved view: navigate to the resource's list with ?view=<id>. We
    // need to know which resource the view belongs to — look it up via
    // the savedViews store synchronously cached on registry isn't
    // possible here; fall back to the view id by scanning the saved
    // views in localStorage. Cheap and read-only.
    const viewId = f.targetId;
    const resource = lookupViewResource(viewId);
    const base = resource ? basePathMap[resource] : undefined;
    if (!base) return null;
    return {
      kind: "view",
      targetId: f.targetId,
      label: fallbackLabel,
      icon: f.icon,
      path: `${base}?view=${encodeURIComponent(viewId)}`,
      external: false,
    };
  }
  return null;
}

function labelFromTarget(f: Favorite): string {
  if (f.kind === "record") {
    const idx = f.targetId.indexOf(":");
    return idx === -1 ? f.targetId : f.targetId.slice(idx + 1);
  }
  return f.targetId;
}

/** Read-through against the saved-views localStorage cache to find the
 *  resource that a view id belongs to. Avoids dragging the runtime
 *  context into the Sidebar.                                            */
function lookupViewResource(viewId: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem("gutu-admin-saved-views");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as {
      views?: Record<string, { resource?: string }>;
    };
    return parsed.views?.[viewId]?.resource;
  } catch {
    return undefined;
  }
}

function buildBasePathMap(registry: AdminRegistry): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (items: readonly NavItem[]) => {
    for (const n of items) {
      if (n.view && n.path) {
        const v = registry.views[n.view];
        if (
          v &&
          "resource" in v &&
          typeof v.resource === "string" &&
          v.type === "list"
        ) {
          out[v.resource] = n.path;
        }
      }
      if (n.children) walk(n.children);
    }
  };
  walk(registry.nav);
  return out;
}

function FavoriteEntry({
  fav,
  currentPath,
}: {
  fav: ResolvedFavorite;
  currentPath: string;
}) {
  const active =
    !fav.external &&
    (currentPath === fav.path ||
      currentPath.startsWith(fav.path.split("?")[0] + "/"));

  if (fav.external) {
    return (
      <a
        href={fav.path}
        target="_blank"
        rel="noreferrer noopener"
        className={cn(
          "group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
          "text-text-secondary hover:text-text-primary hover:bg-surface-2",
        )}
      >
        <NavIcon name={fav.icon ?? "Star"} className="h-4 w-4 shrink-0" />
        <span className="flex-1 min-w-0 truncate">{fav.label}</span>
      </a>
    );
  }
  return (
    <a
      href={`#${fav.path}`}
      onClick={(e) => {
        e.preventDefault();
        navigateTo(fav.path);
      }}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
        active
          ? "bg-accent-subtle text-accent font-medium"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-2",
      )}
      aria-current={active ? "page" : undefined}
    >
      <NavIcon name={fav.icon ?? "Star"} className="h-4 w-4 shrink-0" />
      <span className="flex-1 min-w-0 truncate">{fav.label}</span>
    </a>
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
