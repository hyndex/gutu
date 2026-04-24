import * as React from "react";
import { Sparkles, Check, X, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import { Button } from "@/primitives/Button";
import { Badge } from "@/primitives/Badge";
import { useRuntime } from "@/runtime/context";

export interface AIInsight {
  id: string;
  title: string;
  body: React.ReactNode;
  /** 0–1 confidence score. Low confidence shows a warning badge. */
  confidence?: number;
  citations?: { label: string; href: string }[];
  /** Quick actions the user can take (apply/dismiss or domain-specific). */
  actions?: { id: string; label: string; intent?: "primary" | "ghost"; onClick: () => void }[];
}

export interface AIInsightPanelProps {
  title?: string;
  insights: readonly AIInsight[];
  loading?: boolean;
  onDismiss?: (id: string) => void;
  className?: string;
}

export function AIInsightPanel({
  title = "AI insights",
  insights,
  loading,
  onDismiss,
  className,
}: AIInsightPanelProps) {
  const { analytics } = useRuntime();

  const handleApply = (insight: AIInsight, actionId: string, handler: () => void) => {
    handler();
    analytics.emit("page.ai.applied", { actionId });
    void insight;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="px-3 py-4 text-xs text-text-muted">Generating insights…</div>
        ) : insights.length === 0 ? (
          <div className="px-3 py-4 text-xs text-text-muted">
            No insights — this record looks normal.
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {insights.map((ins) => (
              <li key={ins.id} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-text-primary">
                        {ins.title}
                      </div>
                      {ins.confidence !== undefined && ins.confidence < 0.6 && (
                        <Badge intent="warning">
                          {Math.round(ins.confidence * 100)}% confidence
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-text-secondary mt-1">{ins.body}</div>
                    {ins.citations && ins.citations.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {ins.citations.map((c, i) => (
                          <a
                            key={i}
                            href={c.href}
                            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {c.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {onDismiss && (
                    <button
                      type="button"
                      onClick={() => onDismiss(ins.id)}
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-surface-2 text-text-muted"
                      aria-label="Dismiss insight"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {ins.actions && ins.actions.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {ins.actions.map((a) => (
                      <Button
                        key={a.id}
                        variant={a.intent === "primary" ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => handleApply(ins, a.id, a.onClick)}
                        iconLeft={a.intent === "primary" ? <Check className="h-3 w-3" /> : undefined}
                      >
                        {a.label}
                      </Button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
