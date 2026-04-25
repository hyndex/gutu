/** Workflow types — frontend-side mirror of
 *  `admin-panel/backend/src/lib/workflow/types.ts`.
 *
 *  Why mirror? The frontend `tsconfig` only includes `src/`, so importing
 *  the backend file directly would either pull the backend's full
 *  dependency surface into the browser bundle or fail TypeScript
 *  resolution. The two declarations describe the same JSON shape — the
 *  source of truth is the backend file; this file exists so the editor /
 *  REST client gets compile-time safety without coupling the build
 *  trees.
 *
 *  Keep in sync when the backend types change. The fields used by the UI
 *  are intentionally narrower than the backend's full shape — anything
 *  not consumed here is omitted to keep the surface small. */

export interface DatabaseEventTrigger {
  kind: "database-event";
  resource: string;
  on: Array<"created" | "updated" | "deleted" | "restored" | "destroyed">;
  fields?: string[];
}

export interface ManualTrigger {
  kind: "manual";
  availability?: "global" | "record-detail" | "api-only";
  resource?: string;
}

export interface CronTrigger {
  kind: "cron";
  cron?: string;
  intervalMs?: number;
  lastFiredAt?: string;
}

export interface WebhookTrigger {
  kind: "webhook";
  apiKey?: string;
}

export type WorkflowTrigger =
  | DatabaseEventTrigger
  | ManualTrigger
  | CronTrigger
  | WebhookTrigger;

export type WorkflowActionType =
  | "record.create"
  | "record.update"
  | "record.delete"
  | "record.find"
  | "http.request"
  | "mail.send"
  | "webhook.outbound"
  | "delay"
  | "if-else"
  | "iterator"
  | "code"
  | "log";

export interface WorkflowGraphNode {
  id: string;
  type: WorkflowActionType;
  label?: string;
  params: Record<string, unknown>;
}

export interface WorkflowGraphEdge {
  id?: string;
  from: string;
  to: string;
  branch?: "true" | "false" | "each" | "after" | "default";
}

export interface WorkflowDefinition {
  trigger: WorkflowTrigger;
  nodes: WorkflowGraphNode[];
  edges: WorkflowGraphEdge[];
  variables: { initial: Record<string, unknown> };
  meta?: {
    lastFiredAt?: string;
    lastRunAt?: string;
    totalRuns?: number;
  };
}

export type WorkflowStatus = "draft" | "active" | "paused" | "archived";
export type WorkflowRunStatus =
  | "pending"
  | "running"
  | "success"
  | "failure"
  | "skipped";
