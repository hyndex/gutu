import * as React from "react";
import { mailApi, type MailMessage, type MailThread } from "../lib/api";

export interface UseThreadResult {
  thread: MailThread | null;
  messages: MailMessage[];
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

export function useThread(id: string | null | undefined): UseThreadResult {
  const [thread, setThread] = React.useState<MailThread | null>(null);
  const [messages, setMessages] = React.useState<MailMessage[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const versionRef = React.useRef(0);

  const fetch = React.useCallback(async (): Promise<void> => {
    if (!id) { setThread(null); setMessages([]); return; }
    const v = ++versionRef.current;
    setLoading(true);
    try {
      const r = await mailApi.getThread(id);
      if (v !== versionRef.current) return;
      setThread(r.thread);
      setMessages(r.messages);
      setError(null);
      // Sync from provider in the background so updates land if any.
      void mailApi.syncThread(id).catch(() => undefined);
    } catch (err) {
      if (v !== versionRef.current) return;
      setError(err instanceof Error ? err : new Error("load failed"));
    } finally {
      if (v === versionRef.current) setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { void fetch(); }, [fetch]);

  React.useEffect(() => {
    const handler = (e: Event): void => {
      const detail = (e as CustomEvent<{ resource?: string; id?: string }>).detail;
      if (!detail) return;
      if (detail.resource === "mail.thread" && (detail.id === id || !detail.id)) void fetch();
      if (detail.resource === "mail.message") void fetch();
    };
    window.addEventListener("realtime:resource-changed", handler);
    return (): void => window.removeEventListener("realtime:resource-changed", handler);
  }, [fetch, id]);

  return { thread, messages, loading, error, reload: fetch };
}
