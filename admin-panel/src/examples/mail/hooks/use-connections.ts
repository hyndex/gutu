import * as React from "react";
import { mailApi, type MailConnection } from "../lib/api";

export function useConnections(): {
  connections: MailConnection[];
  defaultConnection: MailConnection | undefined;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
} {
  const [connections, setConnections] = React.useState<MailConnection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const reload = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const r = await mailApi.listConnections();
      setConnections(r.rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("connections load failed"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void reload(); }, [reload]);

  React.useEffect(() => {
    const handler = (e: Event): void => {
      const detail = (e as CustomEvent<{ resource?: string }>).detail;
      if (detail?.resource === "mail.connection") void reload();
    };
    window.addEventListener("realtime:resource-changed", handler);
    return (): void => window.removeEventListener("realtime:resource-changed", handler);
  }, [reload]);

  const defaultConnection = connections.find((c) => c.isDefault) ?? connections[0];
  return { connections, defaultConnection, loading, error, reload };
}
