/** Archetype Events devtools — a real-time stream of every
 *  `gutu:archetype-event` and `gutu:widget-error` CustomEvent the
 *  admin-archetypes runtime emits. */

import * as React from "react";
import * as Lucide from "lucide-react";
import { Pause, Play, Trash2, Download } from "lucide-react";
import { Button } from "@/primitives/Button";
import { defineCustomView } from "@/builders";
import {
  TimelineLog,
  WidgetShell,
  CommandHints,
  useArchetypeKeyboard,
  useUrlState,
  onArchetypeEvent,
  type ArchetypeEvent,
} from "@/admin-archetypes";
import { cn } from "@/lib/cn";

interface RecordedEvent {
  id: number;
  ts: number;
  source: "archetype" | "widget-error";
  payload: ArchetypeEvent | { error: unknown; widgetId?: string; archetype?: string; label?: string };
}

const KIND_TONE: Record<string, string> = {
  "page-mount": "bg-info-soft text-info-strong",
  "page-unmount": "bg-surface-2 text-text-muted",
  "widget-render": "bg-success-soft text-success-strong",
  "interaction": "bg-warning-soft text-warning-strong",
  "widget-error": "bg-danger-soft text-danger-strong",
};

export function ArchetypeEventsPage() {
  const [params, setParams] = useUrlState(["filter", "live"] as const);
  const filter = params.filter ?? "";
  const live = params.live !== "false";

  const [events, setEvents] = React.useState<RecordedEvent[]>([]);
  const counterRef = React.useRef(0);

  // Subscribe to archetype events.
  React.useEffect(() => {
    if (!live) return;
    const off = onArchetypeEvent((e) => {
      counterRef.current += 1;
      setEvents((prev) => {
        const next = [
          { id: counterRef.current, ts: Date.now(), source: "archetype" as const, payload: e },
          ...prev,
        ];
        return next.slice(0, 500);
      });
    });
    return off;
  }, [live]);

  // Subscribe to widget errors.
  React.useEffect(() => {
    if (!live) return;
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      counterRef.current += 1;
      setEvents((prev) => {
        const next = [
          {
            id: counterRef.current,
            ts: Date.now(),
            source: "widget-error" as const,
            payload: detail,
          },
          ...prev,
        ];
        return next.slice(0, 500);
      });
    };
    window.addEventListener("gutu:widget-error", handler);
    return () => window.removeEventListener("gutu:widget-error", handler);
  }, [live]);

  const filtered = React.useMemo(() => {
    if (!filter) return events;
    const f = filter.toLowerCase();
    return events.filter((e) => JSON.stringify(e.payload).toLowerCase().includes(f));
  }, [events, filter]);

  useArchetypeKeyboard([
    {
      label: "Pause/resume live stream",
      combo: "l",
      run: () => setParams({ live: live ? "false" : null }),
    },
    {
      label: "Clear",
      combo: "c",
      run: () => {
        setEvents([]);
        counterRef.current = 0;
      },
    },
  ]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `archetype-events-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = React.useMemo(() => {
    const out: Record<string, number> = {};
    for (const e of events) {
      const k = e.source === "widget-error" ? "widget-error" : (e.payload as ArchetypeEvent).kind;
      out[k] = (out[k] ?? 0) + 1;
    }
    return out;
  }, [events]);

  return (
    <TimelineLog
      id="admin-tools.archetype-events"
      title="Archetype events"
      subtitle="Live stream of telemetry + widget-error events emitted by every archetype-aware page."
      actions={
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setParams({ live: live ? "false" : null })}
            aria-label={live ? "Pause" : "Resume"}
          >
            {live ? <Pause className="h-4 w-4 mr-1" aria-hidden /> : <Play className="h-4 w-4 mr-1" aria-hidden />}
            {live ? "Pause" : "Resume"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setEvents([]); counterRef.current = 0; }}
          >
            <Trash2 className="h-4 w-4 mr-1" aria-hidden /> Clear
          </Button>
          <Button size="sm" variant="outline" onClick={exportJson} disabled={events.length === 0}>
            <Download className="h-4 w-4 mr-1" aria-hidden /> Export JSON
          </Button>
        </>
      }
      toolbarStart={
        <div className="flex items-center gap-3 text-xs">
          {Object.keys(KIND_TONE).map((k) => (
            <span key={k} className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5", KIND_TONE[k])}>
              {k}
              <span className="font-mono tabular-nums">{counts[k] ?? 0}</span>
            </span>
          ))}
        </div>
      }
      toolbarEnd={
        <>
          <input
            type="search"
            value={filter}
            onChange={(e) => setParams({ filter: e.target.value || null }, true)}
            placeholder="Filter…"
            className="h-8 w-48 rounded-md border border-border bg-surface-0 px-2 text-sm"
          />
          <CommandHints
            hints={[
              { keys: "L", label: "Pause/Live" },
              { keys: "C", label: "Clear" },
            ]}
          />
        </>
      }
    >
      <WidgetShell
        label="Events"
        state={events.length === 0 ? { status: "empty" } : { status: "ready" }}
        skeleton="list"
        empty={{
          title: live ? "Listening…" : "Stream paused",
          description: live
            ? "Trigger any archetype to see events here. Try opening /settings/archetypes or any reference page."
            : "Press Resume to start collecting again.",
          icon: <Lucide.Activity className="h-6 w-6" aria-hidden />,
        }}
      >
        <ol role="list" className="rounded-lg border border-border bg-surface-0 divide-y divide-border-subtle font-mono text-xs">
          {filtered.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </ol>
      </WidgetShell>
    </TimelineLog>
  );
}

function EventRow({ event }: { event: RecordedEvent }) {
  const [open, setOpen] = React.useState(false);
  const kind =
    event.source === "widget-error"
      ? "widget-error"
      : (event.payload as ArchetypeEvent).kind;
  const tone = KIND_TONE[kind] ?? "bg-surface-2 text-text-muted";

  let summary = "";
  if (event.source === "archetype") {
    const p = event.payload as ArchetypeEvent;
    if (p.kind === "page-mount") summary = `${p.archetype} · ${p.pageId}`;
    else if (p.kind === "page-unmount") summary = `${p.archetype} · ${p.pageId} · ${p.lifetimeMs}ms`;
    else if (p.kind === "widget-render") summary = `${p.archetype} · ${p.widgetId} · ${p.ms}ms`;
    else if (p.kind === "interaction") summary = `${p.archetype} · ${p.action}`;
  } else {
    const p = event.payload as { error: unknown; widgetId?: string; archetype?: string; label?: string };
    summary = `${p.archetype ?? "?"} · ${p.widgetId ?? p.label ?? "?"} · ${
      p.error instanceof Error ? p.error.message : String(p.error ?? "")
    }`;
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-surface-1 text-left"
      >
        <span className="tabular-nums text-text-muted whitespace-nowrap">
          {new Date(event.ts).toISOString().slice(11, 23)}
        </span>
        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide font-semibold", tone)}>
          {kind}
        </span>
        <span className="text-text-primary truncate flex-1">{summary}</span>
      </button>
      {open && (
        <pre className="text-[10px] text-text-muted bg-surface-1 px-4 py-2 overflow-auto max-h-48">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      )}
    </li>
  );
}

export const archetypeEventsView = defineCustomView({
  id: "admin-tools.archetype-events.view",
  title: "Archetype events",
  description: "Live telemetry stream from the admin-archetypes runtime.",
  resource: "platform.archetypes-catalog",
  archetype: "timeline",
  density: "compact",
  render: () => <ArchetypeEventsPage />,
});
