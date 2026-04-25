/** Lightweight global store using React's useSyncExternalStore.
 *
 *  Keeps mail-wide UI state (selected thread ids, focus index, open
 *  composers, undo toasts) outside React's tree so non-rendering
 *  modules (keyboard handlers) can mutate it without prop drilling. */

import * as React from "react";

export interface ComposeWindow {
  id: string;
  mode: "new" | "reply" | "reply-all" | "forward";
  threadId?: string;
  inReplyToMessageId?: string;
  draftId?: string;
  minimized: boolean;
  openedAt: number;
}

export interface UndoToast {
  id: string;
  releaseAt: string;
  subject: string;
  recipients: string;
}

export interface MailState {
  selectedThreadIds: string[];
  focusIndex: number;
  composers: ComposeWindow[];
  undoQueue: UndoToast[];
  /** Last-known signature of the thread list for selection-rangeshift+click. */
  lastClickedThreadId: string | null;
  showAllImagesForThreads: Set<string>;
}

const initial: MailState = {
  selectedThreadIds: [],
  focusIndex: -1,
  composers: [],
  undoQueue: [],
  lastClickedThreadId: null,
  showAllImagesForThreads: new Set(),
};

let state: MailState = initial;
const listeners = new Set<() => void>();

function emit(): void { for (const l of listeners) l(); }

function setState(next: MailState): void {
  state = next;
  emit();
}

export function getMailState(): MailState { return state; }

export function setSelectedThreads(ids: string[]): void {
  setState({ ...state, selectedThreadIds: Array.from(new Set(ids)) });
}
export function toggleSelectThread(id: string): void {
  const set = new Set(state.selectedThreadIds);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  setState({ ...state, selectedThreadIds: Array.from(set), lastClickedThreadId: id });
}
export function setFocusIndex(i: number): void { setState({ ...state, focusIndex: i }); }

export function openComposer(c: Omit<ComposeWindow, "minimized" | "openedAt">): string {
  const id = c.id;
  setState({
    ...state,
    composers: [
      ...state.composers.filter((x) => x.id !== id),
      { ...c, minimized: false, openedAt: Date.now() },
    ],
  });
  return id;
}
export function closeComposer(id: string): void {
  setState({ ...state, composers: state.composers.filter((c) => c.id !== id) });
}
export function minimizeComposer(id: string, on: boolean): void {
  setState({ ...state, composers: state.composers.map((c) => (c.id === id ? { ...c, minimized: on } : c)) });
}

export function pushUndo(t: UndoToast): void {
  setState({ ...state, undoQueue: [...state.undoQueue, t] });
}
export function dropUndo(id: string): void {
  setState({ ...state, undoQueue: state.undoQueue.filter((u) => u.id !== id) });
}

export function trustImagesForThread(id: string, trust: boolean): void {
  const next = new Set(state.showAllImagesForThreads);
  if (trust) next.add(id); else next.delete(id);
  setState({ ...state, showAllImagesForThreads: next });
}

/* -------- React bindings -------- */

export function useMailStore<T>(selector: (s: MailState) => T): T {
  const subscribe = React.useCallback((cb: () => void) => {
    listeners.add(cb);
    return (): void => { listeners.delete(cb); };
  }, []);
  const getSnapshot = React.useCallback(() => selector(state), [selector]);
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
