import * as React from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Pencil, RotateCcw, Save, X } from "lucide-react";
import type {
  DashboardView as DashboardViewDef,
  DashboardWidget,
} from "@/contracts/views";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/admin-primitives/Card";
import { Button } from "@/primitives/Button";
import { cn } from "@/lib/cn";

const STORAGE_PREFIX = "gutu-dashboard-";

interface Personalization {
  hidden?: string[];
  order?: string[];
}

function loadPersonalization(key: string): Personalization {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as Personalization) : {};
  } catch {
    return {};
  }
}

function savePersonalization(key: string, p: Personalization): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(p));
  } catch {
    /* quota */
  }
}

export function DashboardViewRenderer({ view }: { view: DashboardViewDef }) {
  const key = view.id;
  const [personalization, setPersonalization] = React.useState<Personalization>(
    () => loadPersonalization(key),
  );
  const [editMode, setEditMode] = React.useState(false);
  const [draft, setDraft] = React.useState<Personalization>(personalization);

  const orderedWidgets = React.useMemo(() => {
    const widgets = [...view.widgets];
    const hidden = new Set(personalization.hidden ?? []);
    const filtered = widgets.filter((w) => !hidden.has(w.id));
    const order = personalization.order;
    if (order) {
      const idx = new Map(order.map((id, i) => [id, i]));
      filtered.sort((a, b) => (idx.get(a.id) ?? filtered.length) - (idx.get(b.id) ?? filtered.length));
    }
    return filtered;
  }, [view.widgets, personalization]);

  const enterEdit = () => {
    setDraft(personalization);
    setEditMode(true);
  };
  const cancelEdit = () => {
    setDraft(personalization);
    setEditMode(false);
  };
  const saveEdit = () => {
    savePersonalization(key, draft);
    setPersonalization(draft);
    setEditMode(false);
  };
  const resetEdit = () => setDraft({});

  if (editMode) {
    return (
      <EditModeDashboard
        view={view}
        draft={draft}
        onDraftChange={setDraft}
        onCancel={cancelEdit}
        onSave={saveEdit}
        onReset={resetEdit}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={view.title}
        description={view.description}
        actions={
          view.widgets.length > 1 ? (
            <Button
              variant="ghost"
              size="xs"
              iconLeft={<Pencil className="h-3 w-3" />}
              onClick={enterEdit}
            >
              Customize
            </Button>
          ) : undefined
        }
      />
      <Grid widgets={orderedWidgets} />
    </div>
  );
}

function EditModeDashboard({
  view,
  draft,
  onDraftChange,
  onCancel,
  onSave,
  onReset,
}: {
  view: DashboardViewDef;
  draft: Personalization;
  onDraftChange: (next: Personalization) => void;
  onCancel: () => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = React.useMemo(() => {
    const stored = draft.order ?? [];
    const knownIds = new Set(stored);
    const tail = view.widgets.map((w) => w.id).filter((id) => !knownIds.has(id));
    return [...stored.filter((id) => view.widgets.some((w) => w.id === id)), ...tail];
  }, [draft.order, view.widgets]);

  const widgetsById = React.useMemo(() => {
    const m = new Map<string, DashboardWidget>();
    for (const w of view.widgets) m.set(w.id, w);
    return m;
  }, [view.widgets]);

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = ids.indexOf(String(e.active.id));
    const newIdx = ids.indexOf(String(e.over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    onDraftChange({ ...draft, order: arrayMove(ids, oldIdx, newIdx) });
  };

  const toggleHidden = (id: string) => {
    const hidden = new Set(draft.hidden ?? []);
    if (hidden.has(id)) hidden.delete(id);
    else hidden.add(id);
    onDraftChange({ ...draft, hidden: [...hidden] });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={view.title} description={view.description} />
      <div className="flex items-center justify-between gap-2 px-3 py-2 border border-accent/40 bg-accent-subtle rounded-md">
        <div className="text-sm font-medium text-text-primary">
          Customizing — drag to reorder, toggle eye to hide/show.
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="xs" iconLeft={<RotateCcw className="h-3 w-3" />} onClick={onReset}>
            Reset
          </Button>
          <Button variant="ghost" size="xs" iconLeft={<X className="h-3 w-3" />} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="xs" iconLeft={<Save className="h-3 w-3" />} onClick={onSave}>
            Done
          </Button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 auto-rows-[minmax(120px,auto)]">
            {ids.map((id) => {
              const w = widgetsById.get(id);
              if (!w) return null;
              const hidden = (draft.hidden ?? []).includes(id);
              return (
                <SortableDashboardTile
                  key={id}
                  widget={w}
                  hidden={hidden}
                  onToggleHidden={() => toggleHidden(id)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableDashboardTile({
  widget,
  hidden,
  onToggleHidden,
}: {
  widget: DashboardWidget;
  hidden: boolean;
  onToggleHidden: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : hidden ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        sizeToClass(widget.size),
        "relative",
        hidden ? "grayscale" : "",
      )}
    >
      <Card
        className={cn(
          "h-full border-2 border-dashed",
          hidden ? "border-border" : "border-accent/30 hover:border-accent",
        )}
      >
        <div className="absolute top-1 right-1 z-10 flex items-center gap-0.5 bg-surface-0/80 backdrop-blur rounded border border-border px-1 py-0.5">
          <button
            type="button"
            aria-label={hidden ? "Show widget" : "Hide widget"}
            onClick={onToggleHidden}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-surface-2 text-text-muted hover:text-text-primary"
          >
            {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <button
            type="button"
            aria-label="Drag widget"
            {...attributes}
            {...listeners}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-surface-2 text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-3 w-3" />
          </button>
        </div>
        {widget.title && (
          <CardHeader>
            <CardTitle>{widget.title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="pointer-events-none">{widget.render()}</CardContent>
      </Card>
    </div>
  );
}

function Grid({ widgets }: { widgets: readonly DashboardWidget[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 auto-rows-[minmax(120px,auto)]">
      {widgets.map((w) => (
        <Card key={w.id} className={sizeToClass(w.size)}>
          {w.title && (
            <CardHeader>
              <CardTitle>{w.title}</CardTitle>
            </CardHeader>
          )}
          <CardContent>{w.render()}</CardContent>
        </Card>
      ))}
    </div>
  );
}

function sizeToClass(size: DashboardWidget["size"]): string {
  return cn(
    size === "sm" && "col-span-1",
    size === "md" && "col-span-1 md:col-span-2",
    size === "lg" && "col-span-1 md:col-span-2 xl:col-span-3",
    size === "xl" && "col-span-1 md:col-span-2 xl:col-span-4",
    !size && "col-span-1",
  );
}
