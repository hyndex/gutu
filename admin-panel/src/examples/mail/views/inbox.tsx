import * as React from "react";
import { Inbox, Send as SendIcon, FileText, Archive, Trash2, AlertOctagon, Star, Clock, Tag, Plus, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/primitives/Badge";
import { Button } from "@/primitives/Button";
import { Spinner } from "@/primitives/Spinner";
import { ThreadList } from "../components/mail-list/ThreadList";
import { ThreadView } from "../components/thread-view/ThreadView";
import { ComposerHost } from "../components/composer/ComposerHost";
import { UndoToastHost } from "../components/composer/UndoToastHost";
import { useThreads } from "../hooks/use-threads";
import { useConnections } from "../hooks/use-connections";
import { useLabels } from "../hooks/use-labels";
import { mailApi } from "../lib/api";
import { openComposer, useMailStore, setSelectedThreads } from "../store";

interface RouteParts {
  folder: string;
  labelId?: string;
  category?: string;
  threadId?: string;
  connectionId?: string;
}

const SYSTEM_FOLDERS: { id: string; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "starred", label: "Starred", icon: Star },
  { id: "snoozed", label: "Snoozed", icon: Clock },
  { id: "sent", label: "Sent", icon: SendIcon },
  { id: "drafts", label: "Drafts", icon: FileText },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "spam", label: "Spam", icon: AlertOctagon },
  { id: "trash", label: "Trash", icon: Trash2 },
];

export function MailInboxPage(): React.ReactElement {
  const route = useHashRoute();
  const { connections, defaultConnection, loading: connsLoading } = useConnections();
  const { labels } = useLabels();

  const folder = route.folder;
  const labelId = route.labelId;
  const connectionId = route.connectionId ?? defaultConnection?.id;
  const activeThreadId = route.threadId ?? null;

  const { rows, loading, hasMore, loadMore, reload } = useThreads({ folder, label: labelId, connectionId });

  const onActivate = React.useCallback((threadId: string) => {
    setHash(buildHash({ ...route, threadId }));
  }, [route]);

  const navigate = React.useCallback((next: Partial<RouteParts>) => {
    setHash(buildHash({ ...route, threadId: undefined, ...next }));
    setSelectedThreads([]);
  }, [route]);

  if (connsLoading) {
    return <div className="grid h-full place-items-center"><Spinner /></div>;
  }
  if (connections.length === 0) {
    return <ConnectAccountEmpty />;
  }

  return (
    <div className="grid h-full" style={{ gridTemplateColumns: "240px 380px 1fr" }}>
      {/* Pane A — folder rail */}
      <aside className="flex flex-col gap-1 border-r border-border bg-surface-0 p-2 text-sm">
        <Button onClick={() => openComposer({ id: `new-${Date.now()}`, mode: "new" })} className="mb-2">
          <Plus size={14} className="mr-1" /> Compose
        </Button>
        <ScopeSwitcher
          connections={connections}
          activeConnectionId={connectionId}
          onChange={(id) => navigate({ connectionId: id, folder: "inbox", labelId: undefined })}
        />
        {SYSTEM_FOLDERS.map((f) => {
          const Icon = f.icon;
          const isActive = !labelId && folder === f.id;
          return (
            <button
              type="button"
              key={f.id}
              onClick={() => navigate({ folder: f.id, labelId: undefined })}
              className={[
                "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left",
                isActive ? "bg-accent/15 font-semibold" : "hover:bg-surface-1",
              ].join(" ")}
            >
              <span className="flex items-center gap-2"><Icon size={14} /> {f.label}</span>
            </button>
          );
        })}
        {labels.length > 0 && (
          <>
            <div className="mt-3 px-2 text-xs uppercase text-text-muted">Labels</div>
            {labels.map((l) => {
              const isActive = labelId === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => navigate({ folder: "all", labelId: l.id })}
                  className={[
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-left",
                    isActive ? "bg-accent/15 font-semibold" : "hover:bg-surface-1",
                  ].join(" ")}
                >
                  <Tag size={14} style={{ color: l.color }} />
                  <span className="truncate">{l.name}</span>
                </button>
              );
            })}
          </>
        )}
        <div className="mt-3 px-2 text-xs uppercase text-text-muted">Workspace</div>
        <NavLink hash="/mail/labels" icon={Tag} label="Manage labels" />
        <NavLink hash="/mail/filters" icon={Zap} label="Filters & rules" />
        <NavLink hash="/mail/contacts" icon={Tag} label="Contacts" />
        <NavLink hash="/mail/dashboard" icon={Sparkles} label="Dashboard" />
      </aside>

      {/* Pane B — thread list */}
      <section className="flex flex-col border-r border-border bg-surface-0">
        <ListToolbar folder={folder} reload={reload} />
        <ThreadList
          rows={rows}
          loading={loading}
          hasMore={hasMore}
          loadMore={loadMore}
          onActivate={onActivate}
          activeThreadId={activeThreadId}
          folder={labelId ?? folder}
        />
      </section>

      {/* Pane C — reader */}
      <section className="flex flex-col bg-surface-1">
        {activeThreadId ? (
          <ThreadView
            threadId={activeThreadId}
            imageProxy="always"
            onCloseRequest={() => navigate({ threadId: undefined })}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-text-muted">
            <div className="space-y-1 text-center">
              <div className="text-base">Select a conversation</div>
              <div className="text-xs">Press <kbd className="rounded bg-surface-2 px-1">c</kbd> to compose · <kbd className="rounded bg-surface-2 px-1">/</kbd> to search</div>
            </div>
          </div>
        )}
      </section>

      <ComposerHost />
      <UndoToastHost />
    </div>
  );
}

function ListToolbar({ folder, reload }: { folder: string; reload: () => void }): React.ReactElement {
  const selected = useMailStore((s) => s.selectedThreadIds);
  const has = selected.length > 0;
  return (
    <div className="flex items-center gap-1 border-b border-border bg-surface-0 px-2 py-1.5 text-sm">
      <span className="font-semibold capitalize">{folder.replace(/-/g, " ")}</span>
      {has && <Badge intent="info">{selected.length} selected</Badge>}
      <div className="ml-auto flex items-center gap-1">
        {has && (
          <>
            <Button size="sm" variant="ghost" onClick={async () => { await mailApi.archive(selected); setSelectedThreads([]); reload(); }}>
              <Archive size={14} />
            </Button>
            <Button size="sm" variant="ghost" onClick={async () => { await mailApi.trash(selected); setSelectedThreads([]); reload(); }}>
              <Trash2 size={14} />
            </Button>
            <Button size="sm" variant="ghost" onClick={async () => { await mailApi.markRead(selected, true); setSelectedThreads([]); reload(); }}>
              Read
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" onClick={reload} aria-label="Refresh">↻</Button>
      </div>
    </div>
  );
}

function ScopeSwitcher({
  connections,
  activeConnectionId,
  onChange,
}: {
  connections: { id: string; email: string; status: string }[];
  activeConnectionId?: string;
  onChange: (id: string) => void;
}): React.ReactElement {
  return (
    <div className="mb-2">
      <select
        className="w-full rounded-md border border-border bg-surface-1 px-2 py-1 text-sm"
        value={activeConnectionId ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {connections.map((c) => (
          <option key={c.id} value={c.id}>{c.email}{c.status !== "active" ? " (auth)" : ""}</option>
        ))}
      </select>
    </div>
  );
}

function NavLink({ hash, icon: Icon, label }: { hash: string; icon: React.ComponentType<{ size?: number }>; label: string }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => { window.location.hash = hash; }}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-1"
    >
      <Icon size={14} /> {label}
    </button>
  );
}

function ConnectAccountEmpty(): React.ReactElement {
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="max-w-md space-y-3 rounded-lg border border-border bg-surface-0 p-6 text-center">
        <h2 className="text-lg font-semibold">Connect a mailbox</h2>
        <p className="text-sm text-text-secondary">Sign in with Google or Microsoft, or add an IMAP/SMTP account, to start using Gutu Mail.</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => connect("google")}>Connect Google</Button>
          <Button variant="secondary" onClick={() => connect("microsoft")}>Connect Microsoft</Button>
          <Button variant="ghost" onClick={() => { window.location.hash = "/settings/mail/connections"; }}>Use IMAP / SMTP</Button>
        </div>
      </div>
    </div>
  );
}

async function connect(provider: "google" | "microsoft"): Promise<void> {
  const { url } = await mailApi.startOauth(provider, window.location.hash);
  window.location.assign(url);
}

/* ---------------- hash routing helpers ---------------- */

function parseHash(): RouteParts {
  const raw = (window.location.hash.replace(/^#/, "") || "/mail/inbox").replace(/^\/mail\/?/, "/");
  const parts = raw.split("/").filter(Boolean);
  if (parts.length === 0) return { folder: "inbox" };
  if (parts[0] === "thread") return { folder: "inbox", threadId: parts[1] };
  if (parts[0] === "label") return { folder: "all", labelId: parts[1] };
  if (parts[0] === "category") return { folder: "inbox", category: parts[1] };
  if (parts[0] === "account") {
    const out: RouteParts = { folder: parts[2] ?? "inbox", connectionId: parts[1] };
    if (parts[3] === "thread") out.threadId = parts[4];
    return out;
  }
  return { folder: parts[0] ?? "inbox", threadId: parts[1] === "t" ? parts[2] : undefined };
}

function buildHash(parts: RouteParts): string {
  if (parts.connectionId) {
    const base = `/mail/account/${parts.connectionId}/${parts.folder}`;
    return parts.threadId ? `${base}/thread/${parts.threadId}` : base;
  }
  if (parts.labelId) return `/mail/label/${parts.labelId}${parts.threadId ? `/t/${parts.threadId}` : ""}`;
  if (parts.threadId) return `/mail/${parts.folder}/t/${parts.threadId}`;
  return `/mail/${parts.folder}`;
}

function setHash(h: string): void {
  if (window.location.hash !== `#${h}`) window.location.hash = h;
}

function useHashRoute(): RouteParts {
  const [parts, setParts] = React.useState<RouteParts>(() => parseHash());
  React.useEffect(() => {
    const h = (): void => setParts(parseHash());
    window.addEventListener("hashchange", h);
    return (): void => window.removeEventListener("hashchange", h);
  }, []);
  return parts;
}
