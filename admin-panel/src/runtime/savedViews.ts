import type { SavedView, SavedViewStore } from "@/contracts/saved-views";

const STORAGE_KEY = "gutu-admin-saved-views";
const DEFAULT_KEY = "gutu-admin-default-views";

interface Persisted {
  views: Record<string, SavedView>;
}

function loadViews(): Persisted {
  if (typeof window === "undefined") return { views: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { views: {} };
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "views" in parsed) {
      return parsed as Persisted;
    }
  } catch {
    /* ignore */
  }
  return { views: {} };
}

function loadDefaults(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DEFAULT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

class SavedViewStoreImpl implements SavedViewStore {
  private state: Persisted = loadViews();
  private defaults: Record<string, string> = loadDefaults();
  private readonly listeners = new Set<() => void>();

  private persist(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      window.localStorage.setItem(DEFAULT_KEY, JSON.stringify(this.defaults));
    } catch {
      /* quota */
    }
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  list(resource: string): readonly SavedView[] {
    return Object.values(this.state.views)
      .filter((v) => v.resource === resource)
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return a.label.localeCompare(b.label);
      });
  }

  get(id: string): SavedView | null {
    return this.state.views[id] ?? null;
  }

  save(view: Omit<SavedView, "id" | "createdAt" | "updatedAt"> & { id?: string }): SavedView {
    const now = new Date().toISOString();
    const id = view.id ?? `view_${Math.random().toString(36).slice(2, 10)}`;
    const existing = this.state.views[id];
    const saved: SavedView = {
      ...view,
      id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } as SavedView;
    this.state.views[id] = saved;
    this.persist();
    this.notify();
    return saved;
  }

  delete(id: string): void {
    const view = this.state.views[id];
    if (!view) return;
    delete this.state.views[id];
    if (this.defaults[view.resource] === id) {
      delete this.defaults[view.resource];
    }
    this.persist();
    this.notify();
  }

  setDefault(resource: string, id: string | null): void {
    if (id === null) delete this.defaults[resource];
    else this.defaults[resource] = id;
    this.persist();
    this.notify();
  }

  getDefault(resource: string): SavedView | null {
    const id = this.defaults[resource];
    return id ? (this.state.views[id] ?? null) : null;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export function createSavedViewStore(): SavedViewStore {
  return new SavedViewStoreImpl();
}
