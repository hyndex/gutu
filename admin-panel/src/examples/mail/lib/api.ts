/** Typed client for `/api/mail/*`. Wraps `apiFetch` so every call carries
 *  the auth bearer + tenant header automatically. */

import { apiFetch } from "@/runtime/auth";

/* ---------------- types (kept minimal; routes return full records) ---------------- */

export interface MailConnection {
  id: string;
  userId: string;
  tenantId?: string;
  provider: "google" | "microsoft" | "imap" | "oidc";
  email: string;
  displayName?: string;
  status: "active" | "auth_required" | "error" | "disabled";
  isDefault?: boolean;
  isShared?: boolean;
  imapHost?: string;
  imapPort?: number;
  imapTLS?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpTLS?: boolean;
  username?: string;
  lastSyncAt?: string;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Address { name?: string; email: string }

export interface MailThread {
  id: string;
  threadId?: string;
  connectionId: string;
  userId: string;
  providerThreadId: string;
  subject: string;
  fromName?: string;
  fromEmail?: string;
  participants: Address[];
  labelIds: string[];
  folder: string;
  hasAttachment: boolean;
  hasCalendarInvite: boolean;
  unreadCount: number;
  messageCount: number;
  preview: string;
  lastMessageAt: string;
  starred: boolean;
  pinned?: boolean;
  muted?: boolean;
  snoozedUntil?: string | null;
  important?: boolean;
  categoryAuto?: string;
  phishScore?: number;
  sharedStatus?: "open" | "pending" | "closed";
  createdAt: string;
  updatedAt: string;
}

export interface MailMessage {
  id: string;
  threadId: string;
  connectionId: string;
  providerMessageId: string;
  providerThreadId: string;
  messageIdHeader?: string;
  inReplyTo?: string;
  references: string[];
  from?: Address;
  to: Address[];
  cc: Address[];
  bcc: Address[];
  replyTo: Address[];
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  receivedAt: string;
  sentAt?: string;
  attachments: { providerAttachmentId: string; filename: string; contentType: string; size: number; cid?: string; inline: boolean }[];
  labelIds: string[];
  folder: string;
  isRead: boolean;
  isStarred: boolean;
  isOutgoing?: boolean;
  wasEncrypted?: boolean;
  trackerCount?: number;
  imageCount?: number;
  linkCount?: number;
  phishScore?: number;
  headers?: Record<string, string>;
  unsubscribeMethods?: { post?: boolean; mailto?: boolean; http?: boolean };
  icsEventId?: string;
}

export interface MailLabel {
  id: string;
  userId: string;
  connectionId?: string;
  providerLabelId?: string;
  name: string;
  color?: string;
  parentId?: string;
  order?: number;
  system?: boolean;
}

export interface MailDraft {
  id: string;
  userId: string;
  connectionId?: string;
  threadId?: string;
  inReplyToMessageId?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  signatureId?: string;
  templateId?: string;
  attachmentIds?: string[];
  fromIdentityId?: string;
  lastSavedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MailContact {
  id: string;
  userId: string;
  email: string;
  name?: string;
  phone?: string;
  notes?: string;
  tags: string[];
  useCount: number;
}

export interface MailTemplate {
  id: string;
  userId: string;
  name: string;
  subject: string;
  bodyHtml: string;
  to?: string;
  cc?: string;
  bcc?: string;
  tags: string[];
}

export interface MailNote {
  id: string;
  userId: string;
  threadId: string;
  content: string;
  color: string;
  isPinned: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface MailSettings {
  id?: string;
  userId?: string;
  appearance?: { theme?: "light" | "dark" | "system"; density?: "comfortable" | "compact" };
  notifications?: { push?: boolean; inApp?: boolean; emailDigest?: "off" | "daily" | "weekly" };
  privacy?: { blockTrackers?: boolean; imageProxy?: "always" | "on-trust" | "never"; allowReadReceipts?: boolean };
  shortcuts?: Record<string, string[]>;
  ai?: { model?: string; customPrompt?: string; redactPII?: boolean; retentionDays?: number };
  vacation?: { enabled?: boolean; subject?: string; body?: string; from?: string; to?: string; onlyContacts?: boolean };
  forwarding?: { enabled?: boolean; to?: string; keepCopy?: boolean };
  defaultConnectionId?: string;
  composeShortcut?: string;
  undoSeconds?: number;
}

export interface ListThreadsResp {
  rows: MailThread[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface SendResult {
  id: string;
  status: "queued" | "sent" | "failed" | "cancelled";
  kind: "undo" | "scheduled";
  releaseAt: string;
  undoableUntil: string | null;
}

export interface ScheduledSendListItem {
  id: string;
  kind: string;
  status: string;
  releaseAt: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
  snapshot: { to?: string; cc?: string; bcc?: string; subject?: string };
}

/* ---------------- API surface ---------------- */

export const mailApi = {
  /* Connections */
  listConnections: (): Promise<{ rows: MailConnection[] }> =>
    apiFetch<{ rows: MailConnection[] }>("/mail/connections"),
  startOauth: (provider: "google" | "microsoft", returnTo?: string): Promise<{ url: string; state: string }> =>
    apiFetch<{ url: string; state: string }>(`/mail/connections/oauth/${provider}/start`, {
      method: "POST",
      body: JSON.stringify({ returnTo }),
    }),
  attachImap: (body: {
    email: string; displayName?: string;
    imapHost: string; imapPort?: number; imapTLS?: boolean;
    smtpHost: string; smtpPort?: number; smtpTLS?: boolean;
    username: string; password: string;
  }): Promise<MailConnection> =>
    apiFetch<MailConnection>("/mail/connections/imap", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setDefaultConnection: (id: string): Promise<MailConnection> =>
    apiFetch<MailConnection>(`/mail/connections/${encodeURIComponent(id)}/default`, { method: "POST" }),
  disableConnection: (id: string): Promise<MailConnection> =>
    apiFetch<MailConnection>(`/mail/connections/${encodeURIComponent(id)}/disable`, { method: "POST" }),
  removeConnection: (id: string): Promise<{ ok: boolean }> =>
    apiFetch<{ ok: boolean }>(`/mail/connections/${encodeURIComponent(id)}`, { method: "DELETE" }),

  /* Threads */
  listThreads: (params: {
    folder?: string; label?: string; connectionId?: string; limit?: number; cursor?: string;
  }): Promise<ListThreadsResp> => {
    const q = new URLSearchParams();
    if (params.folder) q.set("folder", params.folder);
    if (params.label) q.set("label", params.label);
    if (params.connectionId) q.set("connectionId", params.connectionId);
    if (params.limit) q.set("limit", String(params.limit));
    if (params.cursor) q.set("cursor", params.cursor);
    return apiFetch<ListThreadsResp>(`/mail/threads?${q.toString()}`);
  },
  getThread: (id: string): Promise<{ thread: MailThread; messages: MailMessage[] }> =>
    apiFetch(`/mail/threads/${encodeURIComponent(id)}`),
  syncThread: (id: string): Promise<{ ok: boolean; messageCount: number }> =>
    apiFetch(`/mail/threads/${encodeURIComponent(id)}/sync`, { method: "POST" }),
  archive: (ids: string[]): Promise<{ updated: number }> =>
    apiFetch(`/mail/threads/bulk/archive`, { method: "POST", body: JSON.stringify({ ids }) }),
  trash: (ids: string[]): Promise<{ updated: number }> =>
    apiFetch(`/mail/threads/bulk/trash`, { method: "POST", body: JSON.stringify({ ids }) }),
  spam: (ids: string[]): Promise<{ updated: number }> =>
    apiFetch(`/mail/threads/bulk/spam`, { method: "POST", body: JSON.stringify({ ids }) }),
  star: (ids: string[], starred: boolean): Promise<{ updated: number }> =>
    apiFetch(`/mail/threads/bulk/star`, { method: "POST", body: JSON.stringify({ ids, starred }) }),
  applyLabels: (ids: string[], add: string[], remove: string[]): Promise<{ updated: number }> =>
    apiFetch(`/mail/threads/bulk/labels`, { method: "POST", body: JSON.stringify({ ids, add, remove }) }),
  markRead: (ids: string[], read: boolean): Promise<{ updated: number }> =>
    apiFetch(`/mail/threads/bulk/read`, { method: "POST", body: JSON.stringify({ ids, read }) }),
  snooze: (ids: string[], wakeAt: string, reason?: string): Promise<{ updated: number }> =>
    apiFetch(`/mail/threads/bulk/snooze`, { method: "POST", body: JSON.stringify({ ids, wakeAt, reason }) }),
  mute: (ids: string[], muted: boolean): Promise<{ updated: number }> =>
    apiFetch(`/mail/threads/bulk/mute`, { method: "POST", body: JSON.stringify({ ids, muted }) }),

  /* Messages / drafts */
  listDrafts: (): Promise<{ rows: MailDraft[] }> => apiFetch(`/mail/messages/drafts`),
  saveDraft: (body: Partial<MailDraft>): Promise<MailDraft> =>
    apiFetch(`/mail/messages/drafts`, { method: "POST", body: JSON.stringify(body) }),
  patchDraft: (id: string, body: Partial<MailDraft>): Promise<MailDraft> =>
    apiFetch(`/mail/messages/drafts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteDraft: (id: string): Promise<{ ok: boolean }> =>
    apiFetch(`/mail/messages/drafts/${encodeURIComponent(id)}`, { method: "DELETE" }),
  send: (body: Partial<MailDraft> & { undoSeconds?: number; sendAt?: string }, idemKey?: string): Promise<SendResult> =>
    apiFetch(`/mail/messages/send`, {
      method: "POST",
      headers: idemKey ? { "Idempotency-Key": idemKey } : undefined,
      body: JSON.stringify(body),
    }),
  undoSend: (id: string): Promise<{ ok: boolean }> =>
    apiFetch(`/mail/messages/undo/${encodeURIComponent(id)}`, { method: "POST" }),
  cancelScheduled: (id: string): Promise<{ ok: boolean }> =>
    apiFetch(`/mail/messages/scheduled/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
  listScheduled: (): Promise<{ rows: ScheduledSendListItem[] }> => apiFetch(`/mail/messages/scheduled`),

  /* Labels */
  listLabels: (): Promise<{ rows: MailLabel[] }> => apiFetch(`/mail/labels`),
  createLabel: (body: { name: string; color?: string; parentId?: string; connectionId?: string }): Promise<MailLabel> =>
    apiFetch(`/mail/labels`, { method: "POST", body: JSON.stringify(body) }),
  updateLabel: (id: string, body: Partial<MailLabel>): Promise<MailLabel> =>
    apiFetch(`/mail/labels/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteLabel: (id: string): Promise<{ ok: boolean }> =>
    apiFetch(`/mail/labels/${encodeURIComponent(id)}`, { method: "DELETE" }),
  reorderLabels: (order: { id: string; order: number }[]): Promise<{ ok: boolean }> =>
    apiFetch(`/mail/labels/reorder`, { method: "POST", body: JSON.stringify({ order }) }),

  /* Search */
  search: (q: string, opts: { folder?: string; connectionId?: string; limit?: number; vector?: boolean } = {}): Promise<{ q: string; results: { messageId: string; threadId: string; score: number; snippet?: string }[] }> => {
    const p = new URLSearchParams({ q });
    if (opts.folder) p.set("folder", opts.folder);
    if (opts.connectionId) p.set("connectionId", opts.connectionId);
    if (opts.limit) p.set("limit", String(opts.limit));
    if (opts.vector === false) p.set("vector", "0");
    return apiFetch(`/mail/search?${p.toString()}`);
  },

  /* AI */
  aiSummary: (threadId: string): Promise<{ tldr: string; bullets: string[]; cached: boolean; raw: string }> =>
    apiFetch(`/mail/ai/summary`, { method: "POST", body: JSON.stringify({ threadId }) }),
  aiSmartReply: (threadId: string, styleHint?: string): Promise<{ suggestions: string[] }> =>
    apiFetch(`/mail/ai/smart-reply`, { method: "POST", body: JSON.stringify({ threadId, styleHint }) }),
  aiSubject: (bodyText: string): Promise<{ suggestions: string[] }> =>
    apiFetch(`/mail/ai/subject`, { method: "POST", body: JSON.stringify({ bodyText }) }),
  aiDraft: (brief: string, recipientName?: string, styleHint?: string): Promise<{ body: string }> =>
    apiFetch(`/mail/ai/draft`, { method: "POST", body: JSON.stringify({ brief, recipientName, styleHint }) }),
  aiImprove: (text: string, mode: "shorter" | "friendlier" | "more-formal" | "fix-grammar"): Promise<{ text: string }> =>
    apiFetch(`/mail/ai/improve`, { method: "POST", body: JSON.stringify({ text, mode }) }),
  aiClassify: (text: string): Promise<{ category: string; spam: boolean; spamScore: number; confidence: number; reasons: string[] }> =>
    apiFetch(`/mail/ai/classify`, { method: "POST", body: JSON.stringify({ text }) }),
  aiTranslate: (text: string, targetLocale: string): Promise<{ text: string }> =>
    apiFetch(`/mail/ai/translate`, { method: "POST", body: JSON.stringify({ text, targetLocale }) }),
  aiUsage: (): Promise<{ window: string; rows: Record<string, unknown>[] }> => apiFetch(`/mail/ai/usage`),

  /* Templates / Notes */
  listTemplates: (): Promise<{ rows: MailTemplate[] }> => apiFetch(`/mail/templates`),
  createTemplate: (body: Partial<MailTemplate>): Promise<MailTemplate> =>
    apiFetch(`/mail/templates`, { method: "POST", body: JSON.stringify(body) }),
  updateTemplate: (id: string, body: Partial<MailTemplate>): Promise<MailTemplate> =>
    apiFetch(`/mail/templates/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTemplate: (id: string): Promise<{ ok: boolean }> =>
    apiFetch(`/mail/templates/${encodeURIComponent(id)}`, { method: "DELETE" }),
  listNotes: (threadId: string): Promise<{ rows: MailNote[] }> =>
    apiFetch(`/mail/notes/thread/${encodeURIComponent(threadId)}`),
  createNote: (body: Partial<MailNote> & { threadId: string; content: string }): Promise<MailNote> =>
    apiFetch(`/mail/notes`, { method: "POST", body: JSON.stringify(body) }),
  updateNote: (id: string, body: Partial<MailNote>): Promise<MailNote> =>
    apiFetch(`/mail/notes/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteNote: (id: string): Promise<{ ok: boolean }> =>
    apiFetch(`/mail/notes/${encodeURIComponent(id)}`, { method: "DELETE" }),

  /* Settings */
  getSettings: (): Promise<MailSettings> => apiFetch(`/mail/settings`),
  putSettings: (body: MailSettings): Promise<MailSettings> =>
    apiFetch(`/mail/settings`, { method: "PUT", body: JSON.stringify(body) }),
  getTenantSettings: (): Promise<Record<string, unknown>> => apiFetch(`/mail/settings/tenant`),
  putTenantSettings: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    apiFetch(`/mail/settings/tenant`, { method: "PUT", body: JSON.stringify(body) }),
  listSignatures: (): Promise<{ rows: { id: string; name: string; bodyHtml: string; default: boolean }[] }> =>
    apiFetch(`/mail/settings/signatures`),
  saveSignature: (body: { id?: string; name: string; bodyHtml: string; default?: boolean }): Promise<{ id: string }> =>
    apiFetch(`/mail/settings/signatures`, { method: "POST", body: JSON.stringify(body) }),
  deleteSignature: (id: string): Promise<{ ok: boolean }> =>
    apiFetch(`/mail/settings/signatures/${encodeURIComponent(id)}`, { method: "DELETE" }),

  /* Rules */
  listRules: (): Promise<{ rows: { id: string; name: string; enabled: boolean; order: number; when: unknown; then: { kind: string; args?: Record<string, unknown> }[] }[] }> =>
    apiFetch(`/mail/rules`),
  createRule: (body: { name: string; when: unknown; then: { kind: string; args?: Record<string, unknown> }[]; enabled?: boolean; order?: number }): Promise<{ id: string }> =>
    apiFetch(`/mail/rules`, { method: "POST", body: JSON.stringify(body) }),
  updateRule: (id: string, body: Record<string, unknown>): Promise<{ id: string }> =>
    apiFetch(`/mail/rules/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteRule: (id: string): Promise<{ ok: boolean }> =>
    apiFetch(`/mail/rules/${encodeURIComponent(id)}`, { method: "DELETE" }),
  dryRunRule: (id: string): Promise<{ scanned: number; matched: number; sample: Record<string, unknown>[] }> =>
    apiFetch(`/mail/rules/dry-run/${encodeURIComponent(id)}`, { method: "POST" }),

  /* Shared inbox */
  assign: (threadId: string, assigneeUserId: string, dueAt?: string): Promise<{ id: string }> =>
    apiFetch(`/mail/shared/assign`, { method: "POST", body: JSON.stringify({ threadId, assigneeUserId, dueAt }) }),
  unassign: (threadId: string): Promise<{ ok: boolean }> =>
    apiFetch(`/mail/shared/assign/${encodeURIComponent(threadId)}`, { method: "DELETE" }),
  setSharedStatus: (threadId: string, status: "open" | "pending" | "closed"): Promise<{ ok: boolean }> =>
    apiFetch(`/mail/shared/status`, { method: "POST", body: JSON.stringify({ threadId, status }) }),
  postComment: (threadId: string, body: string, mentions?: string[]): Promise<{ id: string }> =>
    apiFetch(`/mail/shared/comments`, { method: "POST", body: JSON.stringify({ threadId, body, mentions }) }),
  listComments: (threadId: string): Promise<{ rows: Record<string, unknown>[] }> =>
    apiFetch(`/mail/shared/comments/${encodeURIComponent(threadId)}`),

  /* Contacts */
  listContacts: (q?: string, limit = 50): Promise<{ rows: MailContact[] }> => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    p.set("limit", String(limit));
    return apiFetch(`/mail/contacts?${p.toString()}`);
  },
  createContact: (body: Partial<MailContact> & { email: string }): Promise<MailContact> =>
    apiFetch(`/mail/contacts`, { method: "POST", body: JSON.stringify(body) }),
  updateContact: (id: string, body: Partial<MailContact>): Promise<MailContact> =>
    apiFetch(`/mail/contacts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteContact: (id: string): Promise<{ ok: boolean }> =>
    apiFetch(`/mail/contacts/${encodeURIComponent(id)}`, { method: "DELETE" }),

  /* Misc */
  rsvp: (messageId: string, partstat: "ACCEPTED" | "DECLINED" | "TENTATIVE"): Promise<{ ok: boolean; id: string }> =>
    apiFetch(`/mail/ical/rsvp/${encodeURIComponent(messageId)}`, { method: "POST", body: JSON.stringify({ partstat }) }),
  unsubscribe: (messageId: string): Promise<{ ok: boolean; method: string; status?: number; to?: string; subject?: string; body?: string }> =>
    apiFetch(`/mail/unsubscribe/${encodeURIComponent(messageId)}`, { method: "POST" }),
};

/** Build a clickable image-proxy URL on the client side without forging
 *  HMACs — sanitization happens server-side; this is just for compose. */
export function imageProxyHref(remoteUrl: string): string {
  const enc = btoa(unescape(encodeURIComponent(remoteUrl)));
  return `/api/mail/image-proxy?u=${encodeURIComponent(enc)}&h=clientside`;
}
