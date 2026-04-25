import * as React from "react";
import { mailApi, type MailLabel } from "../lib/api";

export function useLabels(): { labels: MailLabel[]; reload: () => Promise<void>; loading: boolean } {
  const [labels, setLabels] = React.useState<MailLabel[]>([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const r = await mailApi.listLabels();
      setLabels(r.rows);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void reload(); }, [reload]);
  React.useEffect(() => {
    const handler = (e: Event): void => {
      const detail = (e as CustomEvent<{ resource?: string }>).detail;
      if (detail?.resource === "mail.label") void reload();
    };
    window.addEventListener("realtime:resource-changed", handler);
    return (): void => window.removeEventListener("realtime:resource-changed", handler);
  }, [reload]);
  return { labels, reload, loading };
}
