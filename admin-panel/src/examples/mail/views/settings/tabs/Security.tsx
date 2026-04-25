import * as React from "react";
import { ShieldCheck, KeyRound } from "lucide-react";

export function SecurityTab(): React.ReactElement {
  return (
    <section className="space-y-3 text-sm">
      <p className="text-text-muted">Encryption-at-rest is enforced for OAuth tokens, drafts, and message bodies. PGP/SMIME end-to-end encryption is available behind a feature flag.</p>
      <div className="flex items-center gap-2 rounded-md border border-border bg-surface-0 p-3"><ShieldCheck size={16} aria-hidden /> AES-256-GCM at rest</div>
      <div className="flex items-center gap-2 rounded-md border border-border bg-surface-0 p-3"><KeyRound size={16} aria-hidden /> PGP / S/MIME — manage keys (coming via mail.security-key resource)</div>
    </section>
  );
}
