import type { KeyboardShortcut } from "@/contracts/plugin-v2";
import { mailApi } from "./lib/api";
import { openComposer, getMailState } from "./store";

function activeThreadId(): string | null {
  const m = window.location.hash.match(/\/mail\/.*?\/(?:thread|t)\/([^/?#]+)/);
  return m ? m[1] : null;
}

function selectedOrActive(): string[] {
  const sel = getMailState().selectedThreadIds;
  if (sel.length > 0) return sel;
  const id = activeThreadId();
  return id ? [id] : [];
}

export const MAIL_SHORTCUTS: KeyboardShortcut[] = [
  { keys: "c", label: "Compose", run: () => openComposer({ id: `kb-${Date.now()}`, mode: "new" }) },
  { keys: "g i", label: "Go to inbox", run: () => { window.location.hash = "/mail"; } },
  { keys: "g s", label: "Go to sent", run: () => { window.location.hash = "/mail/sent"; } },
  { keys: "g d", label: "Go to drafts", run: () => { window.location.hash = "/mail/drafts"; } },
  { keys: "g t", label: "Go to trash", run: () => { window.location.hash = "/mail/trash"; } },
  { keys: "g a", label: "Go to all mail", run: () => { window.location.hash = "/mail/all"; } },
  { keys: "g k", label: "Go to starred", run: () => { window.location.hash = "/mail/starred"; } },
  { keys: "/", label: "Search mail", run: () => {
    const q = window.prompt("Search mail:");
    if (q) window.location.hash = `/mail/search?q=${encodeURIComponent(q)}`;
  } },
  { keys: "e", label: "Archive", run: async () => {
    const ids = selectedOrActive();
    if (ids.length) await mailApi.archive(ids);
  } },
  { keys: "shift+3", label: "Trash", run: async () => {
    const ids = selectedOrActive();
    if (ids.length) await mailApi.trash(ids);
  } },
  { keys: "shift+1", label: "Mark spam", run: async () => {
    const ids = selectedOrActive();
    if (ids.length) await mailApi.spam(ids);
  } },
  { keys: "s", label: "Star toggle", run: async () => {
    const ids = selectedOrActive();
    if (ids.length) await mailApi.star(ids, true);
  } },
  { keys: "shift+i", label: "Mark read", run: async () => {
    const ids = selectedOrActive();
    if (ids.length) await mailApi.markRead(ids, true);
  } },
  { keys: "shift+u", label: "Mark unread", run: async () => {
    const ids = selectedOrActive();
    if (ids.length) await mailApi.markRead(ids, false);
  } },
];
