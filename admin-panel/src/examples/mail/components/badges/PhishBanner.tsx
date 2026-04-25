import * as React from "react";
import { ShieldAlert } from "lucide-react";

export function PhishBanner({ score, reasons }: { score?: number; reasons?: string[] }): React.ReactElement | null {
  if (!score || score < 60) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200"
    >
      <ShieldAlert size={18} className="mt-0.5 flex-shrink-0" aria-hidden />
      <div>
        <div className="font-semibold">This message looks suspicious.</div>
        {reasons && reasons.length > 0 && (
          <ul className="ml-4 mt-1 list-disc space-y-0.5">
            {reasons.map((r) => (<li key={r}>{r}</li>))}
          </ul>
        )}
        <div className="mt-1 text-xs text-red-800/80 dark:text-red-300/80">Risk score: {score}/100</div>
      </div>
    </div>
  );
}
