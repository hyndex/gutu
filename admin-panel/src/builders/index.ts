import type {
  ListView,
  FormView,
  DetailView,
  DashboardView,
  CustomView,
  KanbanView,
} from "@/contracts/views";
import type { ResourceDefinition } from "@/contracts/resources";

/** Fluent view/resource builders.
 *  Intentionally thin: `defineX` is an `identity + validation` pass.
 *  The payoff is inference — plugins get strict types without extra generics.
 *
 *  For plugin authoring, import `definePlugin` from `@/contracts/plugin-v2`.
 *  This module no longer exports a legacy `Plugin` shape — v2 is the only
 *  supported contract. */

export function defineListView(view: Omit<ListView, "type">): ListView {
  return { ...view, type: "list" };
}

export function defineFormView(view: Omit<FormView, "type">): FormView {
  return { ...view, type: "form" };
}

export function defineDetailView(view: Omit<DetailView, "type">): DetailView {
  return { ...view, type: "detail" };
}

export function defineDashboard(view: Omit<DashboardView, "type">): DashboardView {
  return { ...view, type: "dashboard" };
}

export function defineCustomView(view: Omit<CustomView, "type">): CustomView {
  return { ...view, type: "custom" };
}

export function defineKanbanView(view: Omit<KanbanView, "type">): KanbanView {
  return { ...view, type: "kanban" };
}

export function defineResource<R extends ResourceDefinition>(resource: R): R {
  validateResource(resource);
  return resource;
}

/* ---- Validation ---------------------------------------------------------- */

function validateResource(r: ResourceDefinition): void {
  if (!r.id || typeof r.id !== "string") {
    throw new Error(`[defineResource] resource.id is required`);
  }
  if (!r.schema || typeof (r.schema as { parse?: unknown }).parse !== "function") {
    throw new Error(`[defineResource] resource "${r.id}" missing zod schema`);
  }
}
