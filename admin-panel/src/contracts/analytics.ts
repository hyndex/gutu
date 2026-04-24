/** Platform-wide analytics event contract.
 *
 * Every page, component, and plugin fires typed events through the emitter.
 * Sinks (console in dev, REST in prod) are pluggable. Events are rate-limited
 * and batched; no awaits on the hot path.
 */

export interface BaseEventMeta {
  route: string;
  pluginId?: string;
  tenantId?: string;
  userId?: string;
  role?: string;
  sessionId: string;
  /** ISO timestamp. */
  at: string;
}

export type AnalyticsEventMap = {
  "page.viewed": { variant?: string; viewId?: string };
  "page.filter.changed": { filterCount: number; hasAdvanced?: boolean };
  "page.saved_view.applied": { viewId: string; scope: "personal" | "team" | "tenant" };
  "page.saved_view.saved": { viewId: string; scope: string };
  "page.action.invoked": { actionId: string; placement: string; recordCount: number };
  "page.record.opened": { resource: string; id: string; via: "row" | "drawer" | "search" | "command" | "link" };
  "page.column.configured": { added: number; removed: number; reordered: boolean };
  "page.density.changed": { density: "comfortable" | "compact" | "dense" };
  "page.export.started": { resource: string; format: string; rows: number };
  "page.export.delivered": { resource: string; format: string; durationMs: number };
  "page.import.started": { resource: string; source: string };
  "page.import.committed": { resource: string; rows: number; errors: number };
  "page.import.rolled_back": { resource: string; rows: number };
  "page.ai.invoked": { actionId: string; modelId?: string; tokens?: number; latencyMs?: number };
  "page.ai.applied": { actionId: string };
  "page.automation.configured": { triggerId: string };
  "page.error.shown": { code: string; requestId?: string };
  "page.error.recovered": { strategy: "retry" | "refresh" | "contact" | "report" };
  "page.performance.lcp": { ms: number };
  "page.performance.table_render": { rows: number; ms: number; virtualized: boolean };
  "resource.created": { resource: string; id: string };
  "resource.updated": { resource: string; id: string; fields: readonly string[] };
  "resource.deleted": { resource: string; id: string };
  "resource.restored": { resource: string; id: string };
  "resource.bulk_update": { resource: string; count: number; fields: readonly string[] };
  "resource.bulk_delete": { resource: string; count: number };
  "resource.workflow_transition": { resource: string; id: string; from: string; to: string; reason?: string };
  "resource.ownership_changed": { resource: string; id: string; from?: string; to: string };
  "resource.mention": { resource: string; id: string; mentionedUserId: string };
  "shell.command_palette.opened": Record<string, never>;
  "shell.command_palette.invoked": { commandId: string };
  "shell.keyboard_shortcut": { key: string };
  "shell.permission_denied": { resource?: string; verb?: string; route?: string };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

export type AnalyticsEvent<N extends AnalyticsEventName = AnalyticsEventName> = {
  name: N;
  meta: BaseEventMeta;
  props: AnalyticsEventMap[N];
};

export interface AnalyticsSink {
  id: string;
  send(events: readonly AnalyticsEvent[]): void | Promise<void>;
}

export interface AnalyticsEmitter {
  emit<N extends AnalyticsEventName>(name: N, props: AnalyticsEventMap[N]): void;
  addSink(sink: AnalyticsSink): () => void;
  flush(): Promise<void>;
  /** Update rolling meta (route change, tenant switch). */
  setMeta(patch: Partial<BaseEventMeta>): void;
}
