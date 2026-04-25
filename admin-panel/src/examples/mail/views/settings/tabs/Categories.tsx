import * as React from "react";
import type { MailSettings } from "../../../lib/api";

export function CategoriesTab({ settings, save }: { settings: MailSettings; save: (s: MailSettings) => Promise<void> }): React.ReactElement {
  void save;
  void settings;
  return (
    <section className="space-y-3">
      <p className="text-sm text-text-muted">Inbox categories — Primary, Promotions, Social, Updates, Forums — auto-route incoming mail. Toggle which categories you want as separate tabs.</p>
      <ul className="space-y-1">
        {(["primary", "promotions", "social", "updates", "forums"] as const).map((c) => (
          <li key={c} className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked aria-label={c} />
            <span className="capitalize">{c}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
