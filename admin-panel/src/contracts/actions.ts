import type { ReactNode } from "react";

export type ActionContext = {
  /** Current records (1 for row action, N for bulk action, 0 for page action). */
  readonly records: readonly Record<string, unknown>[];
  /** Resource id this action was dispatched from. */
  readonly resource: string;
  /** Runtime hooks (toasts, nav, refresh). */
  readonly runtime: ActionRuntime;
};

export interface ActionRuntime {
  toast: (opts: {
    title: string;
    description?: string;
    intent?: "default" | "success" | "warning" | "danger" | "info";
  }) => void;
  navigate: (path: string) => void;
  refresh: (resource?: string) => void;
  confirm: (opts: {
    title: string;
    description?: string;
    destructive?: boolean;
  }) => Promise<boolean>;
  /** Resource mutations — plugins use these from action handlers. */
  update: (
    resource: string,
    id: string,
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  create: (
    resource: string,
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  delete: (resource: string, id: string) => Promise<void>;
}

export interface ActionDescriptor {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly intent?: "default" | "danger";
  /** Where the action surfaces. May combine multiple targets. */
  readonly placement?: ReadonlyArray<"row" | "bulk" | "page" | "detail">;
  /** Keyboard shortcut (Mac-style: "mod+k", "mod+shift+n"). */
  readonly shortcut?: string;
  /** Optional confirmation dialog. */
  readonly confirm?: {
    readonly title: string;
    readonly description?: string;
    readonly destructive?: boolean;
  };
  /** Guard — return false to hide / disable. */
  readonly guard?: (ctx: ActionContext) => boolean;
  /** Main handler. */
  readonly run: (ctx: ActionContext) => void | Promise<void>;
  /** Optional custom trigger renderer (rare — the framework renders buttons). */
  readonly renderTrigger?: (ctx: ActionContext) => ReactNode;
}
