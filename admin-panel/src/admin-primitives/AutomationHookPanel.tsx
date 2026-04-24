import * as React from "react";
import { Play, Plus, Settings2, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import { StatusDot } from "./StatusDot";
import { Button } from "@/primitives/Button";
import { Badge } from "@/primitives/Badge";
import { useRuntime } from "@/runtime/context";

export interface AutomationHook {
  id: string;
  label: string;
  trigger: string;
  enabled: boolean;
  lastRunAt?: string;
  lastRunIntent?: "success" | "warning" | "danger" | "neutral";
  runs24h?: number;
}

export interface AutomationHookPanelProps {
  title?: string;
  hooks: readonly AutomationHook[];
  onConfigure?: (id: string) => void;
  onRun?: (id: string) => void;
  onCreate?: () => void;
}

export function AutomationHookPanel({
  title = "Automation",
  hooks,
  onConfigure,
  onRun,
  onCreate,
}: AutomationHookPanelProps) {
  const { analytics } = useRuntime();

  const handleRun = (hook: AutomationHook) => {
    onRun?.(hook.id);
    analytics.emit("page.action.invoked", {
      actionId: `automation.run:${hook.id}`,
      placement: "panel",
      recordCount: 1,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-text-muted" />
            <CardTitle>{title}</CardTitle>
          </div>
          {onCreate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreate}
              iconLeft={<Plus className="h-3 w-3" />}
            >
              New
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {hooks.length === 0 ? (
          <div className="px-3 py-4 text-xs text-text-muted">
            No automations bound to this record.
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {hooks.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-3 py-2.5 group">
                <StatusDot intent={h.enabled ? h.lastRunIntent ?? "success" : "neutral"} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {h.label}
                  </div>
                  <div className="text-xs text-text-muted truncate">
                    on <code className="font-mono text-text-secondary">{h.trigger}</code>
                    {h.runs24h !== undefined && ` · ${h.runs24h} runs 24h`}
                  </div>
                </div>
                {!h.enabled && <Badge intent="neutral">disabled</Badge>}
                {onRun && (
                  <button
                    type="button"
                    onClick={() => handleRun(h)}
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-surface-2 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Run now"
                  >
                    <Play className="h-3 w-3" />
                  </button>
                )}
                {onConfigure && (
                  <button
                    type="button"
                    onClick={() => onConfigure(h.id)}
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-surface-2 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Configure"
                  >
                    <Settings2 className="h-3 w-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
