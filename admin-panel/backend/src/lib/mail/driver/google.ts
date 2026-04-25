/** Gmail driver — REST calls to googleapis.com/gmail/v1.
 *
 *  Authenticated via the connection's encrypted OAuth tokens. Refreshes
 *  JIT when an access token is expired. Rate-limited via the shared
 *  token bucket (`POLICIES.driverGoogle`). */

import { tryDecryptString } from "../crypto/at-rest";
import { refreshConnection } from "../oauth/refresh";
import { POLICIES, awaitToken } from "../rate-limit";
import { decodeEncodedWords, parseAddress, parseAddressList } from "../address";
import type {
  ConnectionRecord,
  DeltaArgs,
  DeltaResult,
  DriverAttachmentMeta,
  DriverLabel,
  DriverMessage,
  DriverThreadSummary,
  ListThreadsArgs,
  ListThreadsResult,
  MailDriver,
  PushSubscribeResult,
  SendArgs,
  SendResult,
} from "./types";
import { previewFromHtml } from "../mime/sanitize";

const API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

interface GmailHeader { name: string; value: string }
interface GmailPart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailPart[];
}
interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  sizeEstimate?: number;
  payload?: GmailPart;
  historyId?: string;
}
interface GmailThread { id: string; historyId?: string; messages?: GmailMessage[] }

const SYSTEM_LABEL_TO_FOLDER: Record<string, string> = {
  INBOX: "inbox",
  SENT: "sent",
  DRAFT: "drafts",
  TRASH: "trash",
  SPAM: "spam",
  CATEGORY_UPDATES: "inbox",
};

export class GoogleDriver implements MailDriver {
  readonly provider = "google";
  readonly connectionId: string;
  readonly tenantId: string;
  private connection: ConnectionRecord;

  constructor(connection: ConnectionRecord, tenantId: string) {
    this.connection = connection;
    this.connectionId = connection.id;
    this.tenantId = tenantId;
  }

  private async accessToken(): Promise<string> {
    const expiresAt = this.connection.tokenExpiresAt ? new Date(this.connection.tokenExpiresAt).getTime() : 0;
    if (!expiresAt || expiresAt - Date.now() < 60_000) {
      const refreshed = await refreshConnection(this.connectionId);
      if (!refreshed) {
        throw new GoogleAuthError("connection refresh failed");
      }
      return refreshed.accessToken;
    }
    const tok = tryDecryptString(base64ToBytes(this.connection.accessTokenCipher));
    if (!tok) {
      const refreshed = await refreshConnection(this.connectionId);
      if (!refreshed) throw new GoogleAuthError("connection access-token unreadable");
      return refreshed.accessToken;
    }
    return tok;
  }

  private async fetch<T>(path: string, init: RequestInit & { retry?: boolean } = {}): Promise<T> {
    await awaitToken(`google:${this.connectionId}`, POLICIES.driverGoogle);
    const tok = await this.accessToken();
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${tok}`,
        Accept: "application/json",
      },
    });
    if (res.status === 401) {
      // One retry with a fresh token.
      if (!init.retry) {
        await refreshConnection(this.connectionId);
        return this.fetch(path, { ...init, retry: true });
      }
      throw new GoogleAuthError("401");
    }
    if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
      const retryAfter = parseInt(res.headers.get("retry-after") ?? "0", 10) * 1000;
      throw new GoogleRetryableError(`google ${res.status}`, retryAfter || 1000);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`google ${res.status}: ${text.slice(0, 500)}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async listThreads(args: ListThreadsArgs): Promise<ListThreadsResult> {
    const params = new URLSearchParams();
    params.set("maxResults", String(Math.min(args.limit ?? 25, 100)));
    if (args.cursor) params.set("pageToken", args.cursor);
    const labelIds: string[] = [];
    if (args.labelIds) labelIds.push(...args.labelIds);
    if (args.folder) {
      const sys = folderToSystemLabel(args.folder);
      if (sys) labelIds.push(sys);
    }
    for (const l of labelIds) params.append("labelIds", l);
    if (args.query) params.set("q", args.query);
    interface ListResp {
      threads?: { id: string; historyId?: string; snippet?: string }[];
      nextPageToken?: string;
      resultSizeEstimate?: number;
    }
    const list = await this.fetch<ListResp>(`/threads?${params.toString()}`);
    const summaries: DriverThreadSummary[] = [];
    for (const t of list.threads ?? []) {
      try {
        const summary = await this.threadSummary(t.id);
        summaries.push(summary);
      } catch (err) {
        if (err instanceof GoogleAuthError) throw err;
        // Skip individual fetch failures.
      }
    }
    return {
      items: summaries,
      nextCursor: list.nextPageToken,
      totalEstimate: list.resultSizeEstimate,
    };
  }

  private async threadSummary(threadId: string): Promise<DriverThreadSummary> {
    const t = await this.fetch<GmailThread>(`/threads/${encodeURIComponent(threadId)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Date`);
    const messages = t.messages ?? [];
    const last = messages[messages.length - 1];
    const headers = headerMap(last?.payload?.headers ?? []);
    const labels = collectLabels(messages);
    return {
      providerThreadId: t.id,
      providerLastMessageId: last?.id,
      subject: decodeEncodedWords(headers.subject ?? "(no subject)"),
      from: parseAddress(decodeEncodedWords(headers.from ?? "")) ?? undefined,
      participants: parseAddressList(decodeEncodedWords([headers.from, headers.to, headers.cc].filter(Boolean).join(", "))),
      labelIds: labels,
      folder: detectFolder(labels),
      hasAttachment: messages.some((m) => (m.payload?.parts ?? []).some((p) => !!p.filename)),
      hasCalendarInvite: messages.some((m) => containsCalendar(m.payload)),
      unreadCount: messages.filter((m) => (m.labelIds ?? []).includes("UNREAD")).length,
      messageCount: messages.length,
      preview: last?.snippet ?? "",
      lastMessageAt: last?.internalDate ? new Date(parseInt(last.internalDate, 10)).toISOString() : new Date().toISOString(),
      starred: labels.includes("STARRED"),
    };
  }

  async getThread(providerThreadId: string): Promise<{ summary: DriverThreadSummary; messages: DriverMessage[] }> {
    const t = await this.fetch<GmailThread>(`/threads/${encodeURIComponent(providerThreadId)}?format=full`);
    const messages = (t.messages ?? []).map((m) => this.normalizeMessage(m));
    const last = messages[messages.length - 1];
    return {
      summary: {
        providerThreadId,
        providerLastMessageId: last?.providerMessageId,
        subject: last?.subject ?? "(no subject)",
        from: last?.from,
        participants: dedupeAddresses([
          ...(last ? [last.from].filter(Boolean) as Address[] : []),
          ...messages.flatMap((m) => [...m.to, ...m.cc]),
        ]),
        labelIds: collectLabels(t.messages ?? []),
        folder: detectFolder(collectLabels(t.messages ?? [])),
        hasAttachment: messages.some((m) => m.attachments.length > 0),
        hasCalendarInvite: messages.some((m) => m.attachments.some((a) => a.contentType.startsWith("text/calendar"))),
        unreadCount: (t.messages ?? []).filter((m) => (m.labelIds ?? []).includes("UNREAD")).length,
        messageCount: messages.length,
        preview: previewFromHtml(last?.bodyHtml ?? last?.bodyText ?? "", 240),
        lastMessageAt: last?.receivedAt ?? new Date().toISOString(),
        starred: (collectLabels(t.messages ?? []) ?? []).includes("STARRED"),
      },
      messages,
    };
  }

  private normalizeMessage(m: GmailMessage): DriverMessage {
    const headers = headerMap(m.payload?.headers ?? []);
    const { text, html, attachments } = walkParts(m.payload, m.id);
    return {
      providerMessageId: m.id,
      providerThreadId: m.threadId,
      messageIdHeader: cleanMessageId(headers["message-id"]),
      inReplyTo: cleanMessageId(headers["in-reply-to"]),
      references: parseRefs(headers["references"]),
      from: parseAddress(decodeEncodedWords(headers.from ?? "")) ?? undefined,
      to: parseAddressList(decodeEncodedWords(headers.to ?? "")),
      cc: parseAddressList(decodeEncodedWords(headers.cc ?? "")),
      bcc: parseAddressList(decodeEncodedWords(headers.bcc ?? "")),
      replyTo: parseAddressList(decodeEncodedWords(headers["reply-to"] ?? "")),
      subject: headers.subject ? decodeEncodedWords(headers.subject) : undefined,
      receivedAt: m.internalDate ? new Date(parseInt(m.internalDate, 10)).toISOString() : new Date().toISOString(),
      sentAt: headers.date ? safeDate(headers.date) : undefined,
      bodyText: text,
      bodyHtml: html,
      headers,
      size: m.sizeEstimate ?? 0,
      attachments,
      labelIds: m.labelIds ?? [],
      folder: detectFolder(m.labelIds ?? []),
      isRead: !((m.labelIds ?? []).includes("UNREAD")),
      isStarred: (m.labelIds ?? []).includes("STARRED"),
    };
  }

  async getAttachmentBytes(providerMessageId: string, providerAttachmentId: string): Promise<Uint8Array> {
    interface AttResp { data?: string; size?: number }
    const r = await this.fetch<AttResp>(`/messages/${encodeURIComponent(providerMessageId)}/attachments/${encodeURIComponent(providerAttachmentId)}`);
    if (!r.data) return new Uint8Array(0);
    return new Uint8Array(Buffer.from(r.data.replace(/-/g, "+").replace(/_/g, "/"), "base64"));
  }

  async modifyLabels(threadIds: string[], add: string[], remove: string[]): Promise<void> {
    for (const id of threadIds) {
      await this.fetch(`/threads/${encodeURIComponent(id)}/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addLabelIds: add, removeLabelIds: remove }),
      });
    }
  }

  async markRead(messageIds: string[], read: boolean): Promise<void> {
    const add = read ? [] : ["UNREAD"];
    const remove = read ? ["UNREAD"] : [];
    for (const id of messageIds) {
      await this.fetch(`/messages/${encodeURIComponent(id)}/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addLabelIds: add, removeLabelIds: remove }),
      });
    }
  }

  async trash(threadIds: string[]): Promise<void> {
    for (const id of threadIds) await this.fetch(`/threads/${encodeURIComponent(id)}/trash`, { method: "POST" });
  }
  async untrash(threadIds: string[]): Promise<void> {
    for (const id of threadIds) await this.fetch(`/threads/${encodeURIComponent(id)}/untrash`, { method: "POST" });
  }
  async spam(threadIds: string[]): Promise<void> {
    await this.modifyLabels(threadIds, ["SPAM"], ["INBOX"]);
  }
  async archive(threadIds: string[]): Promise<void> {
    await this.modifyLabels(threadIds, [], ["INBOX"]);
  }
  async delete(threadIds: string[]): Promise<void> {
    for (const id of threadIds) {
      await this.fetch(`/threads/${encodeURIComponent(id)}`, { method: "DELETE" });
    }
  }
  async star(threadIds: string[], starred: boolean): Promise<void> {
    if (starred) await this.modifyLabels(threadIds, ["STARRED"], []);
    else await this.modifyLabels(threadIds, [], ["STARRED"]);
  }

  async send(args: SendArgs): Promise<SendResult> {
    const raw = Buffer.from(args.raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const body: Record<string, string> = { raw };
    if (args.threadProviderId) body.threadId = args.threadProviderId;
    interface SendResp { id: string; threadId: string }
    const r = await this.fetch<SendResp>(`/messages/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { providerMessageId: r.id, providerThreadId: r.threadId };
  }

  async saveDraft(raw: Uint8Array): Promise<{ providerDraftId: string }> {
    const b64 = Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    interface DraftResp { id: string }
    const r = await this.fetch<DraftResp>(`/drafts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { raw: b64 } }),
    });
    return { providerDraftId: r.id };
  }

  async deleteDraft(providerDraftId: string): Promise<void> {
    await this.fetch(`/drafts/${encodeURIComponent(providerDraftId)}`, { method: "DELETE" });
  }

  async listLabels(): Promise<DriverLabel[]> {
    interface ListResp { labels?: { id: string; name: string; type?: string; color?: { backgroundColor?: string } }[] }
    const r = await this.fetch<ListResp>(`/labels`);
    return (r.labels ?? []).map((l) => ({
      providerLabelId: l.id,
      name: l.name,
      color: l.color?.backgroundColor,
      system: l.type === "system",
    }));
  }
  async createLabel(label: { name: string; color?: string }): Promise<DriverLabel> {
    interface Resp { id: string; name: string }
    const r = await this.fetch<Resp>(`/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: label.name, color: label.color ? { backgroundColor: label.color, textColor: "#ffffff" } : undefined }),
    });
    return { providerLabelId: r.id, name: r.name };
  }
  async updateLabel(id: string, patch: { name?: string; color?: string }): Promise<DriverLabel> {
    interface Resp { id: string; name: string }
    const r = await this.fetch<Resp>(`/labels/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(patch.name && { name: patch.name }),
        ...(patch.color && { color: { backgroundColor: patch.color, textColor: "#ffffff" } }),
      }),
    });
    return { providerLabelId: r.id, name: r.name };
  }
  async deleteLabel(id: string): Promise<void> {
    await this.fetch(`/labels/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async delta(args: DeltaArgs): Promise<DeltaResult> {
    const params = new URLSearchParams({ historyTypes: "messageAdded", historyTypes2: "labelAdded", historyTypes3: "labelRemoved" });
    if (args.cursor) params.set("startHistoryId", args.cursor);
    interface History { id: string }
    interface HistoryResp {
      history?: History[];
      historyId?: string;
      nextPageToken?: string;
    }
    try {
      const r = await this.fetch<HistoryResp>(`/history?${params.toString()}`);
      const changes: DeltaResult["changes"] = (r.history ?? []).flatMap((h) => [{ kind: "thread.upsert" as const, providerThreadId: h.id }]);
      return { changes, nextCursor: r.historyId ?? args.cursor ?? "" };
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) {
        return { changes: [], nextCursor: "", fullRescanRequired: true };
      }
      throw err;
    }
  }

  async subscribePush(): Promise<PushSubscribeResult> {
    const topic = process.env.MAIL_GOOGLE_PUBSUB_TOPIC;
    if (!topic) throw new Error("MAIL_GOOGLE_PUBSUB_TOPIC missing");
    interface Resp { historyId: string; expiration?: string }
    const r = await this.fetch<Resp>(`/watch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicName: topic, labelIds: ["INBOX"] }),
    });
    return {
      externalId: r.historyId,
      topic,
      expiresAt: r.expiration ? new Date(parseInt(r.expiration, 10)).toISOString() : undefined,
    };
  }

  async unsubscribePush(): Promise<void> {
    await this.fetch(`/stop`, { method: "POST" });
  }
}

export class GoogleAuthError extends Error {}
export class GoogleRetryableError extends Error {
  constructor(msg: string, public retryAfterMs: number) { super(msg); }
}

function base64ToBytes(s: string | undefined | null): Uint8Array | null {
  if (!s) return null;
  try { return new Uint8Array(Buffer.from(s, "base64")); } catch { return null; }
}

function headerMap(h: GmailHeader[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { name, value } of h) out[name.toLowerCase()] = value;
  return out;
}

function cleanMessageId(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const m = input.match(/<([^>]+)>/);
  return (m ? m[1] : input).trim() || undefined;
}

function parseRefs(input: string | undefined): string[] {
  if (!input) return [];
  const out: string[] = [];
  const re = /<([^>]+)>/g;
  let m;
  while ((m = re.exec(input)) !== null) out.push(m[1]);
  return out;
}

interface Address { name?: string; email: string }

function dedupeAddresses(list: Address[]): Address[] {
  const seen = new Set<string>();
  const out: Address[] = [];
  for (const a of list) {
    const key = a.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

function detectFolder(labelIds: string[] | undefined): string {
  for (const sys of Object.keys(SYSTEM_LABEL_TO_FOLDER)) {
    if ((labelIds ?? []).includes(sys)) return SYSTEM_LABEL_TO_FOLDER[sys];
  }
  return "archive";
}

function collectLabels(messages: GmailMessage[]): string[] {
  const out = new Set<string>();
  for (const m of messages) for (const l of m.labelIds ?? []) out.add(l);
  return Array.from(out);
}

function containsCalendar(p: GmailPart | undefined): boolean {
  if (!p) return false;
  if ((p.mimeType ?? "").startsWith("text/calendar")) return true;
  for (const c of p.parts ?? []) if (containsCalendar(c)) return true;
  return false;
}

interface WalkResult { text?: string; html?: string; attachments: DriverAttachmentMeta[] }

function walkParts(p: GmailPart | undefined, _msgId: string): WalkResult {
  const out: WalkResult = { attachments: [] };
  function walk(part: GmailPart | undefined): void {
    if (!part) return;
    const mimeType = (part.mimeType ?? "").toLowerCase();
    if (mimeType === "multipart/alternative" || mimeType === "multipart/related" || mimeType === "multipart/mixed" || mimeType.startsWith("multipart/")) {
      for (const c of part.parts ?? []) walk(c);
      return;
    }
    if (mimeType === "text/plain" && part.body?.data && !part.filename) {
      out.text = (out.text ?? "") + decodeBase64Url(part.body.data);
      return;
    }
    if (mimeType === "text/html" && part.body?.data && !part.filename) {
      out.html = (out.html ?? "") + decodeBase64Url(part.body.data);
      return;
    }
    if (part.filename || part.body?.attachmentId) {
      const cid = (part.headers ?? []).find((h) => h.name.toLowerCase() === "content-id")?.value?.replace(/[<>]/g, "");
      out.attachments.push({
        providerAttachmentId: part.body?.attachmentId ?? part.partId ?? "",
        filename: part.filename || "attachment",
        contentType: mimeType || "application/octet-stream",
        size: part.body?.size ?? 0,
        cid,
        inline: !!cid,
      });
      return;
    }
  }
  walk(p);
  return out;
}

function decodeBase64Url(s: string): string {
  const fixed = s.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(fixed, "base64").toString("utf8");
}

function safeDate(s: string): string | undefined {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function folderToSystemLabel(folder: string): string | null {
  switch (folder) {
    case "inbox": return "INBOX";
    case "sent": return "SENT";
    case "drafts": return "DRAFT";
    case "trash": return "TRASH";
    case "spam": return "SPAM";
    case "starred": return "STARRED";
    case "important": return "IMPORTANT";
    default: return null;
  }
}
