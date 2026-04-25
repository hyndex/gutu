import * as React from "react";
import { Spinner } from "@/primitives/Spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/primitives/Tabs";
import { mailApi, type MailSettings } from "../../lib/api";
import { GeneralTab } from "./tabs/General";
import { ConnectionsTab } from "./tabs/Connections";
import { IdentitiesTab } from "./tabs/Identities";
import { SignaturesTab } from "./tabs/Signatures";
import { VacationTab } from "./tabs/Vacation";
import { ForwardingTab } from "./tabs/Forwarding";
import { LabelsTab } from "./tabs/Labels";
import { CategoriesTab } from "./tabs/Categories";
import { NotificationsTab } from "./tabs/Notifications";
import { PrivacyTab } from "./tabs/Privacy";
import { SecurityTab } from "./tabs/Security";
import { ShortcutsTab } from "./tabs/Shortcuts";
import { AISettingsTab } from "./tabs/AI";
import { SharedInboxTab } from "./tabs/SharedInbox";
import { TenantPolicyTab } from "./tabs/TenantPolicy";
import { DangerZoneTab } from "./tabs/DangerZone";

export function MailSettingsPage(): React.ReactElement {
  const [s, setS] = React.useState<MailSettings | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => { void mailApi.getSettings().then(setS).catch(() => undefined); }, []);

  const save = React.useCallback(async (next: MailSettings): Promise<void> => {
    setSaving(true);
    try { setS(await mailApi.putSettings(next)); }
    finally { setSaving(false); }
  }, []);

  if (!s) return <div className="grid h-full place-items-center"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mail settings</h1>
        {saving && <span className="text-xs text-text-muted">Saving…</span>}
      </header>
      <Tabs defaultValue="general">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="connections">Accounts</TabsTrigger>
          <TabsTrigger value="identities">Identities</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
          <TabsTrigger value="vacation">Vacation</TabsTrigger>
          <TabsTrigger value="forwarding">Forwarding</TabsTrigger>
          <TabsTrigger value="labels">Labels</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="shared">Shared inbox</TabsTrigger>
          <TabsTrigger value="tenant">Tenant policy</TabsTrigger>
          <TabsTrigger value="danger">Danger zone</TabsTrigger>
        </TabsList>
        <TabsContent value="general"><GeneralTab settings={s} save={save} /></TabsContent>
        <TabsContent value="connections"><ConnectionsTab /></TabsContent>
        <TabsContent value="identities"><IdentitiesTab /></TabsContent>
        <TabsContent value="signatures"><SignaturesTab /></TabsContent>
        <TabsContent value="vacation"><VacationTab settings={s} save={save} /></TabsContent>
        <TabsContent value="forwarding"><ForwardingTab settings={s} save={save} /></TabsContent>
        <TabsContent value="labels"><LabelsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab settings={s} save={save} /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab settings={s} save={save} /></TabsContent>
        <TabsContent value="privacy"><PrivacyTab settings={s} save={save} /></TabsContent>
        <TabsContent value="security"><SecurityTab /></TabsContent>
        <TabsContent value="shortcuts"><ShortcutsTab settings={s} save={save} /></TabsContent>
        <TabsContent value="ai"><AISettingsTab settings={s} save={save} /></TabsContent>
        <TabsContent value="shared"><SharedInboxTab /></TabsContent>
        <TabsContent value="tenant"><TenantPolicyTab /></TabsContent>
        <TabsContent value="danger"><DangerZoneTab /></TabsContent>
      </Tabs>
    </div>
  );
}
