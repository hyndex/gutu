import * as React from "react";
import { ThreadRow } from "./ThreadRow";
import { EmptyInbox } from "../empty-states/EmptyInbox";
import { Spinner } from "@/primitives/Spinner";
import { useMailStore, setSelectedThreads, toggleSelectThread, getMailState } from "../../store";
import { mailApi, type MailThread } from "../../lib/api";

export interface ThreadListProps {
  rows: MailThread[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  onActivate: (threadId: string) => void;
  activeThreadId: string | null;
  folder: string;
  onChangeRef?: (refresh: () => void) => void;
}

export function ThreadList(props: ThreadListProps): React.ReactElement {
  const { rows, loading, hasMore, loadMore, onActivate, activeThreadId, folder } = props;
  const selectedIds = useMailStore((s) => s.selectedThreadIds);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (): void => {
      if (el.scrollTop + el.clientHeight + 200 >= el.scrollHeight) {
        if (hasMore && !loading) loadMore();
      }
    };
    el.addEventListener("scroll", handler);
    return (): void => el.removeEventListener("scroll", handler);
  }, [hasMore, loading, loadMore]);

  const onToggleSelect = React.useCallback((id: string, e: React.MouseEvent): void => {
    e.stopPropagation();
    if (e.shiftKey && getMailState().lastClickedThreadId) {
      const idx = rows.findIndex((r) => r.id === id);
      const lastIdx = rows.findIndex((r) => r.id === getMailState().lastClickedThreadId);
      if (idx >= 0 && lastIdx >= 0) {
        const range = rows.slice(Math.min(idx, lastIdx), Math.max(idx, lastIdx) + 1).map((r) => r.id);
        setSelectedThreads([...new Set([...getMailState().selectedThreadIds, ...range])]);
        return;
      }
    }
    toggleSelectThread(id);
  }, [rows]);

  const onClick = React.useCallback((id: string): void => onActivate(id), [onActivate]);
  const onStar = React.useCallback(async (id: string, starred: boolean): Promise<void> => {
    try { await mailApi.star([id], starred); } catch { /* swallow */ }
  }, []);

  if (rows.length === 0 && !loading) {
    return <div className="grid h-full place-items-center"><EmptyInbox folder={folder} /></div>;
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto" role="list" aria-label="Conversations">
      {rows.map((t) => (
        <ThreadRow
          key={t.id}
          thread={t}
          selected={selectedIds.includes(t.id)}
          active={t.id === activeThreadId}
          onToggleSelect={onToggleSelect}
          onClick={onClick}
          onStar={(id, s) => void onStar(id, s)}
        />
      ))}
      {hasMore && (
        <div className="flex items-center justify-center gap-2 p-4 text-sm text-text-muted">
          {loading ? <Spinner size={14} /> : <button type="button" onClick={loadMore} className="text-accent">Load more</button>}
        </div>
      )}
      {loading && rows.length === 0 && <div className="grid h-full place-items-center"><Spinner /></div>}
    </div>
  );
}
