/** Performance budget enforcer.
 *
 *  Subscribes to `gutu:archetype-event` (specifically `widget-render`
 *  and `interaction` durations) and emits `gutu:perf-budget-violation`
 *  when budgets are exceeded. The enforcer is best-effort: it does
 *  not throw, alert, or block; it surfaces the signal so the
 *  observability page or external monitor can act on it.
 *
 *  Budgets reference the design contract in
 *  `docs/PAGE-DESIGN-SYSTEM.md §8 Performance contract`. */

import type { ArchetypeEvent } from "../hooks/useArchetypeTelemetry";

export interface PerfBudget {
  /** Per-archetype "first KPI" budget in ms. Default 400. */
  firstKpiMs?: number;
  /** Per-widget render budget in ms. Default 200. */
  widgetRenderMs?: number;
  /** Per-interaction handler budget in ms (e.g., bulk-action commit). */
  interactionMs?: number;
  /** Custom rule. Returns a violation reason or null. */
  custom?: (event: ArchetypeEvent) => string | null;
}

export interface BudgetViolation {
  rule: string;
  archetype: string;
  pageId: string;
  widgetId?: string;
  action?: string;
  measuredMs: number;
  budgetMs: number;
  ts: number;
}

const DEFAULT_BUDGET: Required<Omit<PerfBudget, "custom">> & {
  custom?: PerfBudget["custom"];
} = {
  firstKpiMs: 400,
  widgetRenderMs: 200,
  interactionMs: 1000,
};

let installed: { detach: () => void } | null = null;

/** Install the budget watcher. Idempotent. Returns a `detach()`. */
export function installPerfBudget(
  budget: PerfBudget = {},
): { detach: () => void; getViolations: () => readonly BudgetViolation[] } {
  if (typeof window === "undefined") {
    return { detach: () => {}, getViolations: () => [] };
  }
  if (installed) installed.detach();
  const merged = { ...DEFAULT_BUDGET, ...budget };
  const violations: BudgetViolation[] = [];

  const onEvent = (e: Event) => {
    const detail = (e as CustomEvent<ArchetypeEvent>).detail;
    if (!detail) return;
    let violation: BudgetViolation | null = null;

    if (detail.kind === "widget-render" && detail.ms > merged.widgetRenderMs) {
      violation = {
        rule: "widget-render",
        archetype: detail.archetype,
        pageId: detail.pageId,
        widgetId: detail.widgetId,
        measuredMs: detail.ms,
        budgetMs: merged.widgetRenderMs,
        ts: detail.ts,
      };
    } else if (detail.kind === "interaction") {
      const declaredMs =
        typeof (detail.detail as Record<string, unknown> | undefined)?.ms === "number"
          ? ((detail.detail as Record<string, unknown>).ms as number)
          : undefined;
      if (declaredMs !== undefined && declaredMs > merged.interactionMs) {
        violation = {
          rule: "interaction",
          archetype: detail.archetype,
          pageId: detail.pageId,
          action: detail.action,
          measuredMs: declaredMs,
          budgetMs: merged.interactionMs,
          ts: detail.ts,
        };
      }
    }

    const customMsg = merged.custom?.(detail);
    if (customMsg) {
      violation = {
        rule: customMsg,
        archetype: (detail as ArchetypeEvent & { archetype?: string }).archetype ?? "unknown",
        pageId: (detail as ArchetypeEvent & { pageId?: string }).pageId ?? "unknown",
        measuredMs: (detail as ArchetypeEvent & { ms?: number }).ms ?? 0,
        budgetMs: 0,
        ts: detail.ts,
      };
    }

    if (violation) {
      violations.push(violation);
      try {
        window.dispatchEvent(
          new CustomEvent("gutu:perf-budget-violation", { detail: violation }),
        );
      } catch {/* ignore */}
    }
  };

  window.addEventListener("gutu:archetype-event", onEvent);

  const handle = {
    detach: () => {
      window.removeEventListener("gutu:archetype-event", onEvent);
      installed = null;
    },
    getViolations: () => violations as readonly BudgetViolation[],
  };
  installed = handle;
  return handle;
}

/** Subscribe to budget violations. Returns an unsubscribe function. */
export function onPerfBudgetViolation(
  handler: (violation: BudgetViolation) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<BudgetViolation>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener("gutu:perf-budget-violation", listener);
  return () => window.removeEventListener("gutu:perf-budget-violation", listener);
}
