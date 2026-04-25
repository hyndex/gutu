import * as React from "react";
import { Button } from "@/primitives/Button";
import { Switch } from "@/primitives/Switch";
import type { MailSettings } from "../../../lib/api";

export function NotificationsTab({ settings, save }: { settings: MailSettings; save: (s: MailSettings) => Promise<void> }): React.ReactElement {
  const [push, setPush] = React.useState(settings.notifications?.push ?? true);
  const [inApp, setInApp] = React.useState(settings.notifications?.inApp ?? true);
  const [digest, setDigest] = React.useState<"off" | "daily" | "weekly">(settings.notifications?.emailDigest ?? "off");
  return (
    <section className="space-y-3">
      <Row label="Push notifications" right={<Switch checked={push} onCheckedChange={setPush} aria-label="Push" />} />
      <Row label="In-app notifications" right={<Switch checked={inApp} onCheckedChange={setInApp} aria-label="In-app" />} />
      <Row label="Email digest" right={
        <select className="rounded-md border border-border bg-surface-1 px-2 py-1 text-sm" value={digest} onChange={(e) => setDigest(e.target.value as "off" | "daily" | "weekly")}>
          <option value="off">Off</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      } />
      <Button onClick={() => void save({ ...settings, notifications: { push, inApp, emailDigest: digest } })}>Save</Button>
      <Button variant="ghost" onClick={() => void requestPushPermission()}>Enable browser push</Button>
    </section>
  );
}

function Row({ label, right }: { label: string; right: React.ReactNode }): React.ReactElement {
  return (<div className="flex items-center justify-between gap-2"><span className="text-sm">{label}</span>{right}</div>);
}

async function requestPushPermission(): Promise<void> {
  if (!("Notification" in window)) {
    // eslint-disable-next-line no-alert
    alert("This browser does not support notifications.");
    return;
  }
  await Notification.requestPermission();
}
