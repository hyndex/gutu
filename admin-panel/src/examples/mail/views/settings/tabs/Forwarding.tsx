import * as React from "react";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Switch } from "@/primitives/Switch";
import type { MailSettings } from "../../../lib/api";

export function ForwardingTab({ settings, save }: { settings: MailSettings; save: (s: MailSettings) => Promise<void> }): React.ReactElement {
  const [enabled, setEnabled] = React.useState(!!settings.forwarding?.enabled);
  const [to, setTo] = React.useState(settings.forwarding?.to ?? "");
  const [keep, setKeep] = React.useState(settings.forwarding?.keepCopy !== false);
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enable" />
        <span className="text-sm">Forward incoming mail</span>
      </div>
      <Input placeholder="Forward to email" value={to} onChange={(e) => setTo(e.target.value)} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
        Keep a copy in this mailbox
      </label>
      <Button onClick={() => void save({ ...settings, forwarding: { enabled, to, keepCopy: keep } })}>Save</Button>
    </section>
  );
}
