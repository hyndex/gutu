import * as React from "react";
import { useConnections } from "../../../hooks/use-connections";

export function IdentitiesTab(): React.ReactElement {
  const { connections } = useConnections();
  return (
    <section className="space-y-3">
      <p className="text-sm text-text-muted">Each connected account is one identity. Per-identity signatures and "send as" addresses are configured under Signatures.</p>
      <ul className="divide-y divide-border rounded-md border border-border bg-surface-0">
        {connections.map((c) => (
          <li key={c.id} className="px-3 py-2 text-sm">
            <div className="font-medium">{c.email}</div>
            <div className="text-xs text-text-muted">{c.displayName ?? c.email}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
