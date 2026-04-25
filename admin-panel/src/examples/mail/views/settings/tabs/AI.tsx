import * as React from "react";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Textarea } from "@/primitives/Textarea";
import { Switch } from "@/primitives/Switch";
import type { MailSettings } from "../../../lib/api";

export function AISettingsTab({ settings, save }: { settings: MailSettings; save: (s: MailSettings) => Promise<void> }): React.ReactElement {
  const [model, setModel] = React.useState(settings.ai?.model ?? "");
  const [prompt, setPrompt] = React.useState(settings.ai?.customPrompt ?? "");
  const [redact, setRedact] = React.useState(settings.ai?.redactPII !== false);
  const [retention, setRetention] = React.useState(settings.ai?.retentionDays ?? 90);
  return (
    <section className="space-y-3">
      <div><label className="block text-xs text-text-muted">Preferred model (override)</label><Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. gpt-4o-mini" /></div>
      <div><label className="block text-xs text-text-muted">Custom system prompt</label><Textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} /></div>
      <div className="flex items-center gap-2"><Switch checked={redact} onCheckedChange={setRedact} aria-label="Redact" /><span className="text-sm">Redact emails / phones / cards before sending to model</span></div>
      <div className="flex items-center gap-2"><label className="text-sm">AI cache retention (days)</label><Input type="number" min={0} max={3650} value={retention} onChange={(e) => setRetention(parseInt(e.target.value, 10) || 0)} className="w-24" /></div>
      <Button onClick={() => void save({ ...settings, ai: { model, customPrompt: prompt, redactPII: redact, retentionDays: retention } })}>Save</Button>
    </section>
  );
}
