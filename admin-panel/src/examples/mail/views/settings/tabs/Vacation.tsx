import * as React from "react";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Textarea } from "@/primitives/Textarea";
import { Switch } from "@/primitives/Switch";
import type { MailSettings } from "../../../lib/api";

export function VacationTab({ settings, save }: { settings: MailSettings; save: (s: MailSettings) => Promise<void> }): React.ReactElement {
  const [enabled, setEnabled] = React.useState(!!settings.vacation?.enabled);
  const [subject, setSubject] = React.useState(settings.vacation?.subject ?? "");
  const [body, setBody] = React.useState(settings.vacation?.body ?? "");
  const [from, setFrom] = React.useState(settings.vacation?.from ?? "");
  const [to, setTo] = React.useState(settings.vacation?.to ?? "");
  const [onlyContacts, setOnlyContacts] = React.useState(!!settings.vacation?.onlyContacts);
  const onSave = (): Promise<void> => save({ ...settings, vacation: { enabled, subject, body, from, to, onlyContacts } });
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enable" />
        <span className="text-sm">Auto-reply enabled</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div><label className="block text-xs text-text-muted">Start</label><Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="block text-xs text-text-muted">End</label><Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <Textarea rows={6} placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyContacts} onChange={(e) => setOnlyContacts(e.target.checked)} />
        Only auto-reply to senders in my contacts
      </label>
      <Button onClick={() => void onSave()}>Save</Button>
    </section>
  );
}
