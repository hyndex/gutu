import * as React from "react";
import { Button } from "@/primitives/Button";
import { Switch } from "@/primitives/Switch";
import type { MailSettings } from "../../../lib/api";

export function PrivacyTab({ settings, save }: { settings: MailSettings; save: (s: MailSettings) => Promise<void> }): React.ReactElement {
  const [trackers, setTrackers] = React.useState(settings.privacy?.blockTrackers ?? true);
  const [proxy, setProxy] = React.useState<"always" | "on-trust" | "never">(settings.privacy?.imageProxy ?? "always");
  const [readReceipts, setReadReceipts] = React.useState(!!settings.privacy?.allowReadReceipts);
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">Block tracker pixels</span>
        <Switch checked={trackers} onCheckedChange={setTrackers} aria-label="Block trackers" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">Image proxy</span>
        <select className="rounded-md border border-border bg-surface-1 px-2 py-1 text-sm" value={proxy} onChange={(e) => setProxy(e.target.value as "always" | "on-trust" | "never")}>
          <option value="always">Always (recommended)</option>
          <option value="on-trust">Only when sender is trusted</option>
          <option value="never">Never load remote images</option>
        </select>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">Allow read receipts</span>
        <Switch checked={readReceipts} onCheckedChange={setReadReceipts} aria-label="Read receipts" />
      </div>
      <Button onClick={() => void save({ ...settings, privacy: { blockTrackers: trackers, imageProxy: proxy, allowReadReceipts: readReceipts } })}>Save</Button>
    </section>
  );
}
