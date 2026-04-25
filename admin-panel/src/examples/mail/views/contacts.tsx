import * as React from "react";
import { Plus, Trash2, Save, Search } from "lucide-react";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Spinner } from "@/primitives/Spinner";
import { mailApi, type MailContact } from "../lib/api";

export function MailContactsPage(): React.ReactElement {
  const [contacts, setContacts] = React.useState<MailContact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");

  const reload = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const r = await mailApi.listContacts(q, 200);
      setContacts(r.rows);
    } finally { setLoading(false); }
  }, [q]);

  React.useEffect(() => {
    const t = setTimeout(() => { void reload(); }, 250);
    return (): void => clearTimeout(t);
  }, [reload]);

  const create = async (): Promise<void> => {
    if (!email.trim()) return;
    await mailApi.createContact({ email: email.trim(), name: name.trim() || undefined });
    setName(""); setEmail("");
    await reload();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Contacts</h1>
      <section className="flex items-end gap-2">
        <Search size={14} aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
      </section>
      <section className="flex items-end gap-2 rounded-md border border-border bg-surface-0 p-3">
        <div className="flex-1"><label className="block text-xs text-text-muted">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="flex-1"><label className="block text-xs text-text-muted">Email</label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <Button onClick={() => void create()}><Plus size={14} className="mr-1" />Add</Button>
      </section>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-text-muted"><Spinner size={14} /> Loading…</div>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-surface-0">
          {contacts.map((c) => <Row key={c.id} contact={c} reload={reload} />)}
          {contacts.length === 0 && <li className="px-3 py-2 text-sm text-text-muted">No contacts.</li>}
        </ul>
      )}
    </div>
  );
}

function Row({ contact, reload }: { contact: MailContact; reload: () => Promise<void> }): React.ReactElement {
  const [n, setN] = React.useState(contact.name ?? "");
  const [e, setE] = React.useState(contact.email);
  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <Input className="w-44" value={n} onChange={(ev) => setN(ev.target.value)} />
      <Input className="flex-1" value={e} onChange={(ev) => setE(ev.target.value)} />
      <Button size="sm" variant="ghost" onClick={async () => { await mailApi.updateContact(contact.id, { name: n, email: e }); await reload(); }}><Save size={14} /></Button>
      <Button size="sm" variant="ghost" onClick={async () => { await mailApi.deleteContact(contact.id); await reload(); }}><Trash2 size={14} /></Button>
    </li>
  );
}
