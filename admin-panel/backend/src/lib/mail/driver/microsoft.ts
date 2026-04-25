/** Microsoft Graph driver — REST calls to graph.microsoft.com/v1.0/me.
 *
 *  Uses /messages, /mailFolders, /subscriptions for change-notifications.
 *  Folder model maps onto our virtual folders:
 *    inbox/sent/drafts/trash/spam/archive/junk → built-in Graph wellKnownNames.
 *  Custom user folders surface as labels (we treat folders as labels for
 *  cross-provider parity). */

import { POLICIES, awaitToken } from "../rate-limit";
import { tryDecryptString } from "../crypto/at-rest";
import { refreshConnection } from "../oauth/refresh";
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

const API_BASE = "https://graph.microsoft.com/v1.0/me";

interface GraphMessage {
  id: string;
  conversationId: string;
  subject?: string;
  bodyPreview?: string;
  parentFolderId?: string;
  internetMessageId?: string;
  receivedDateTime?: string;
  sentDateTime?: string;
  isRead?: boolean;
  flag?: { flagStatus?: string };
  hasAttachments?: boolean;
  importance?: string;
  inferenceClassification?: string;
  body?: { contentType?: string; content?: string };
  from?: { emailAddress: { address: string; name?: string } };
  toRecipients?: { emailAddress: { address: string; name?: string } }[];
  ccRecipients?: { emailAddress: { address: string; name?: string } }[];
  bccRecipients?: { emailAddress: { address: string; name?: string } }[];
  replyTo?: { emailAddress: { address: string; name?: string } }[];
  internetMessageHeaders?: { name: string; value: string }[];
  categories?: string[];
}

interface GraphFolder { id: string; displayName: string; wellKnownName?: string; parentFolderId?: string }

const WELL_KNOWN_TO_FOLDER: Record<string, string> = {
  inbox: "inbox",
  sentitems: "sent",
  drafts: "drafts",
  deleteditems: "trash",
  junkemail: "spam",
  archive: "archive",
};

const FOLDER_TO_WELL_KNOWN: Record<string, string> = {
  inbox: "inbox",
  sent: "sentitems",
  drafts: "drafts",
  trash: "deleteditems",
  spam: "junkemail",
  archive: "archive",
};

export class MicrosoftDriver implements MailDriver {
  readonly provider = "microsoft";
  readonly connectionId: string;
  readonly tenantId: string;
  private connection: ConnectionRecord;
  private folderCache: Map<string, GraphFolder> | null = null;

  constructor(connection: ConnectionRecord, tenantId: string) {
    this.connection = connection;
    this.connectionId = connection.id;
    this.tenantId = tenantId;
  }

  private async accessToken(): Promise<string> {
    const expiresAt = this.connection.tokenExpiresAt ? new Date(this.connection.tokenExpiresAt).getTime() : 0;
    if (!expiresAt || expiresAt - Date.now() < 60_000) {
      const refreshed = await refreshConnection(this.connectionId);
      if (!refreshed) throw new MicrosoftAuthError("connection refresh failed");
      return refreshed.accessToken;
    }
    const tok = tryDecryptString(base64ToBytes(this.connection.accessTokenCipher));
    if (!tok) {
      const refreshed = await refreshConnection(this.connectionId);
      if (!refreshed) throw new MicrosoftAuthError("connection access-token unreadable");
      return refreshed.accessToken;
    }
    return tok;
  }

  private async fetch<T>(path: string, init: RequestInit & { retry?: boolean } = {}): Promise<T> {
    await awaitToken(`microsoft:${this.connectionId}`, POLICIES.driverMicrosoft);
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
      if (!init.retry) {
        await refreshConnection(this.connectionId);
        return this.fetch(path, { ...init, retry: true });
      }
      throw new MicrosoftAuthError("401");
    }
    if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
      const retryAfter = parseInt(res.headers.get("retry-after") ?? "0", 10) * 1000;
      throw new MicrosoftRetryableError(`microsoft ${res.status}`, retryAfter || 1000);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`microsoft ${res.status}: ${text.slice(0, 500)}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private async ensureFolders(): Promise<Map<string, GraphFolder>> {
    if (this.folderCache) return this.folderCache;
    interface ListResp { value?: GraphFolder[]; "@odata.nextLink"?: string }
    const map = new Map<string, GraphFolder>();
    let url = `/mailFolders?$top=200`;
    while (url) {
      const resp: ListResp = await this.fetch<ListResp>(url);
      for (const f of resp.value ?? []) map.set(f.id, f);
      url = resp["@odata.nextLink"] ?? "";
    }
    this.folderCache = map;
    return map;
  }

  private async folderIdFor(folder: string | undefined): Promise<string | null> {
    if (!folder) return null;
    const wkName = FOLDER_TO_WELL_KNOWN[folder];
    if (wkName) return wkName; // Graph accepts wellKnownName.
    const folders = await this.ensureFolders();
    for (const f of folders.values()) {
      if (f.displayName.toLowerCase() === folder.toLowerCase()) return f.id;
    }
    return folder; // Best effort — caller passed an arbitrary id.
  }

  async listThreads(args: ListThreadsArgs): Promise<ListThreadsResult> { // eslint-disable-line
    const params = new URLSearchParams();
    params.set("$top", String(Math.min(args.limit ?? 25, 50)));
    if (args.cursor) params.set("$skiptoken", args.cursor);
    if (args.query) params.set("$search", `"${args.query.replace(/"/g, '""')}"`);
    params.set("$select", "id,conversationId,subject,bodyPreview,parentFolderId,receivedDateTime,from,toRecipients,ccRecipients,hasAttachments,isRead,flag,importance,inferenceClassification,categories");
    params.set("$orderby", "receivedDateTime desc");
    const folderId = await this.folderIdFor(args.folder);
    const path = folderId ? `/mailFolders/${encodeURIComponent(folderId)}/messages?${params.toString()}` : `/messages?${params.toString()}`;
    interface ListResp { value?: GraphMessage[]; "@odata.nextLink"?: string }
    const resp = await this.fetch<ListResp>(path);
    const byThread = new Map<string, GraphMessage[]>();
    for (const m of resp.value ?? []) {
      const arr = byThread.get(m.conversationId) ?? [];
      arr.push(m);
      byThread.set(m.conversationId, arr);
    }
    const items: DriverThreadSummary[] = [];
    for (const [conversationId, msgs] of byThread.entries()) {
      const last = msgs[0];
      const folder = await this.folderToVirtual(last.parentFolderId);
      items.push({
        providerThreadId: conversationId,
        providerLastMessageId: last.id,
        subject: last.subject ?? "(no subject)",
        from: last.from ? { name: last.from.emailAddress.name, email: last.from.emailAddress.address } : undefined,
        participants: dedupeAddresses(msgs.flatMap((m) => [...(m.from ? [{ name: m.from.emailAddress.name, email: m.from.emailAddress.address }] : []), ...(m.toRecipients ?? []).map(r => ({ name: r.emailAddress.name, email: r.emailAddress.address })), ...(m.ccRecipients ?? []).map(r => ({ name: r.emailAddress.name, email: r.emailAddress.address }))])),
        labelIds: last.categories ?? [],
        folder,
        hasAttachment: msgs.some((m) => !!m.hasAttachments),
        hasCalendarInvite: false,
        unreadCount: msgs.filter((m) => m.isRead === false).length,
        messageCount: msgs.length,
        preview: last.bodyPreview ?? "",
        lastMessageAt: last.receivedDateTime ?? new Date().toISOString(),
        starred: last.flag?.flagStatus === "flagged",
      });
    }
    const next = resp["@odata.nextLink"];
    let nextCursor: string | undefined;
    if (next) {
      const sk = new URL(next).searchParams.get("$skiptoken");
      if (sk) nextCursor = sk;
    }
    return { items, nextCursor };
  }

  private async folderToVirtual(folderId: string | undefined): Promise<string> {
    if (!folderId) return "inbox";
    const folders = await this.ensureFolders();
    const f = folders.get(folderId);
    if (!f) return "archive";
    return WELL_KNOWN_TO_FOLDER[(f.wellKnownName ?? "").toLowerCase()] ?? f.displayName;
  }

  async getThread(providerThreadId: string): Promise<{ summary: DriverThreadSummary; messages: DriverMessage[] }> {
    const params = new URLSearchParams({
      $filter: `conversationId eq '${providerThreadId.replace(/'/g, "''")}'`,
      $top: "100",
      $orderby: "receivedDateTime asc",
      $expand: "attachments($select=id,name,contentType,size,isInline,contentId)",
    });
    interface ListResp { value?: (GraphMessage & { attachments?: { id: string; name?: string; contentType?: string; size?: number; isInline?: boolean; contentId?: string }[] })[] }
    const resp = await this.fetch<ListResp>(`/messages?${params.toString()}`);
    // Resolve all folder ids up front (async); then synchronously build messages.
    const messageRows = resp.value ?? [];
    const folderIds = Array.from(new Set(messageRows.map((m) => m.parentFolderId ?? "")));
    const folderMap = new Map<string, string>();
    for (const fid of folderIds) folderMap.set(fid, await this.folderToVirtual(fid));
    const messages: DriverMessage[] = messageRows.map((m) => ({
      providerMessageId: m.id,
      providerThreadId,
      messageIdHeader: cleanMessageId(m.internetMessageId),
      inReplyTo: undefined,
      references: [],
      from: m.from ? { name: m.from.emailAddress.name, email: m.from.emailAddress.address } : undefined,
      to: (m.toRecipients ?? []).map((r) => ({ name: r.emailAddress.name, email: r.emailAddress.address })),
      cc: (m.ccRecipients ?? []).map((r) => ({ name: r.emailAddress.name, email: r.emailAddress.address })),
      bcc: (m.bccRecipients ?? []).map((r) => ({ name: r.emailAddress.name, email: r.emailAddress.address })),
      replyTo: (m.replyTo ?? []).map((r) => ({ name: r.emailAddress.name, email: r.emailAddress.address })),
      subject: m.subject,
      receivedAt: m.receivedDateTime ?? new Date().toISOString(),
      sentAt: m.sentDateTime,
      bodyText: (m.body?.contentType ?? "").toLowerCase() === "text" ? m.body?.content : undefined,
      bodyHtml: (m.body?.contentType ?? "").toLowerCase() === "html" ? m.body?.content : undefined,
      headers: Object.fromEntries((m.internetMessageHeaders ?? []).map((h) => [h.name.toLowerCase(), h.value])),
      size: 0,
      attachments: (m.attachments ?? []).map<DriverAttachmentMeta>((a) => ({
        providerAttachmentId: a.id,
        filename: a.name ?? "attachment",
        contentType: a.contentType ?? "application/octet-stream",
        size: a.size ?? 0,
        cid: a.contentId,
        inline: !!a.isInline,
      })),
      labelIds: m.categories ?? [],
      folder: folderMap.get(m.parentFolderId ?? "") ?? "inbox",
      isRead: !!m.isRead,
      isStarred: m.flag?.flagStatus === "flagged",
    }));
    const last = messages[messages.length - 1];
    return {
      summary: {
        providerThreadId,
        providerLastMessageId: last?.providerMessageId,
        subject: last?.subject ?? "(no subject)",
        from: last?.from,
        participants: dedupeAddresses([...(last ? [last.from].filter(Boolean) as Address[] : []), ...messages.flatMap((m) => [...m.to, ...m.cc])]),
        labelIds: Array.from(new Set(messages.flatMap((m) => m.labelIds))),
        folder: last?.folder ?? "inbox",
        hasAttachment: messages.some((m) => m.attachments.length > 0),
        hasCalendarInvite: messages.some((m) => m.attachments.some((a) => a.contentType.startsWith("text/calendar"))),
        unreadCount: messages.filter((m) => !m.isRead).length,
        messageCount: messages.length,
        preview: previewFromHtml(last?.bodyHtml ?? last?.bodyText ?? "", 240),
        lastMessageAt: last?.receivedAt ?? new Date().toISOString(),
        starred: messages.some((m) => m.isStarred),
      },
      messages,
    };
  }

  async getAttachmentBytes(providerMessageId: string, providerAttachmentId: string): Promise<Uint8Array> {
    interface AttResp { contentBytes?: string; "@odata.type"?: string }
    const r = await this.fetch<AttResp>(`/messages/${encodeURIComponent(providerMessageId)}/attachments/${encodeURIComponent(providerAttachmentId)}`);
    if (!r.contentBytes) return new Uint8Array(0);
    return new Uint8Array(Buffer.from(r.contentBytes, "base64"));
  }

  async modifyLabels(threadIds: string[], add: string[], remove: string[]): Promise<void> {
    // Graph maps "labels" → categories on each message.
    for (const cid of threadIds) {
      const messages = await this.fetch<{ value?: { id: string; categories?: string[] }[] }>(
        `/messages?$filter=conversationId eq '${cid.replace(/'/g, "''")}'&$select=id,categories&$top=50`,
      );
      for (const m of messages.value ?? []) {
        const cats = new Set(m.categories ?? []);
        for (const a of add) cats.add(a);
        for (const r of remove) cats.delete(r);
        await this.fetch(`/messages/${encodeURIComponent(m.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories: Array.from(cats) }),
        });
      }
    }
  }

  async markRead(messageIds: string[], read: boolean): Promise<void> {
    for (const id of messageIds) {
      await this.fetch(`/messages/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: read }),
      });
    }
  }

  async trash(threadIds: string[]): Promise<void> { await this.moveThreadsTo(threadIds, "deleteditems"); }
  async untrash(threadIds: string[]): Promise<void> { await this.moveThreadsTo(threadIds, "inbox"); }
  async spam(threadIds: string[]): Promise<void> { await this.moveThreadsTo(threadIds, "junkemail"); }
  async archive(threadIds: string[]): Promise<void> { await this.moveThreadsTo(threadIds, "archive"); }
  async delete(threadIds: string[]): Promise<void> {
    for (const cid of threadIds) {
      const messages = await this.fetch<{ value?: { id: string }[] }>(
        `/messages?$filter=conversationId eq '${cid.replace(/'/g, "''")}'&$select=id&$top=50`,
      );
      for (const m of messages.value ?? []) {
        await this.fetch(`/messages/${encodeURIComponent(m.id)}`, { method: "DELETE" });
      }
    }
  }

  private async moveThreadsTo(threadIds: string[], wellKnown: string): Promise<void> {
    for (const cid of threadIds) {
      const messages = await this.fetch<{ value?: { id: string }[] }>(
        `/messages?$filter=conversationId eq '${cid.replace(/'/g, "''")}'&$select=id&$top=50`,
      );
      for (const m of messages.value ?? []) {
        await this.fetch(`/messages/${encodeURIComponent(m.id)}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destinationId: wellKnown }),
        });
      }
    }
  }

  async star(threadIds: string[], starred: boolean): Promise<void> {
    for (const cid of threadIds) {
      const messages = await this.fetch<{ value?: { id: string }[] }>(
        `/messages?$filter=conversationId eq '${cid.replace(/'/g, "''")}'&$select=id&$top=50`,
      );
      for (const m of messages.value ?? []) {
        await this.fetch(`/messages/${encodeURIComponent(m.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flag: { flagStatus: starred ? "flagged" : "notFlagged" } }),
        });
      }
    }
  }

  async send(args: SendArgs): Promise<SendResult> {
    const res = await this.fetchRaw(`/sendMail`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: Buffer.from(args.raw).toString("base64"),
    });
    if (!res.ok && res.status !== 202) {
      throw new Error(`microsoft.send ${res.status}: ${await res.text()}`);
    }
    // Graph doesn't return ids on /sendMail. Best effort: emit a transient
    // id; the next sync fetches the persisted message.
    return { providerMessageId: `pending-${Date.now()}`, providerThreadId: args.threadProviderId ?? `pending-${Date.now()}` };
  }

  private async fetchRaw(path: string, init: RequestInit): Promise<Response> {
    const tok = await this.accessToken();
    return fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${tok}` },
    });
  }

  async saveDraft(raw: Uint8Array): Promise<{ providerDraftId: string }> {
    interface Resp { id: string }
    const r = await this.fetch<Resp>(`/messages`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: Buffer.from(raw).toString("base64"),
    });
    return { providerDraftId: r.id };
  }
  async deleteDraft(providerDraftId: string): Promise<void> {
    await this.fetch(`/messages/${encodeURIComponent(providerDraftId)}`, { method: "DELETE" });
  }

  async listLabels(): Promise<DriverLabel[]> {
    interface ListResp { value?: { id: string; displayName: string; color?: string }[] }
    const r = await this.fetch<ListResp>(`/outlook/masterCategories`);
    return (r.value ?? []).map((c) => ({ providerLabelId: c.id, name: c.displayName, color: c.color }));
  }
  async createLabel(label: { name: string; color?: string }): Promise<DriverLabel> {
    interface Resp { id: string; displayName: string; color?: string }
    const r = await this.fetch<Resp>(`/outlook/masterCategories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: label.name, color: label.color ?? "preset0" }),
    });
    return { providerLabelId: r.id, name: r.displayName, color: r.color };
  }
  async updateLabel(id: string, patch: { name?: string; color?: string }): Promise<DriverLabel> {
    interface Resp { id: string; displayName: string; color?: string }
    const r = await this.fetch<Resp>(`/outlook/masterCategories/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(patch.name && { displayName: patch.name }),
        ...(patch.color && { color: patch.color }),
      }),
    });
    return { providerLabelId: r.id, name: r.displayName, color: r.color };
  }
  async deleteLabel(id: string): Promise<void> {
    await this.fetch(`/outlook/masterCategories/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async delta(args: DeltaArgs): Promise<DeltaResult> {
    const url = args.cursor ? args.cursor : `/mailFolders/inbox/messages/delta`;
    interface DeltaResp {
      value?: { id: string; conversationId?: string; "@removed"?: object }[];
      "@odata.nextLink"?: string;
      "@odata.deltaLink"?: string;
    }
    try {
      const r = await this.fetch<DeltaResp>(url);
      const changes: DeltaResult["changes"] = (r.value ?? []).map((m) => ({
        kind: m["@removed"] ? ("thread.delete" as const) : ("thread.upsert" as const),
        providerThreadId: m.conversationId,
        providerMessageId: m.id,
      }));
      const nextCursor = r["@odata.deltaLink"] ?? r["@odata.nextLink"] ?? args.cursor ?? "";
      return { changes, nextCursor };
    } catch (err) {
      if (err instanceof Error && err.message.includes("410")) {
        // Delta token expired; request full rescan.
        return { changes: [], nextCursor: "", fullRescanRequired: true };
      }
      throw err;
    }
  }

  async subscribePush(): Promise<PushSubscribeResult> {
    const notificationUrl = process.env.MAIL_GRAPH_WEBHOOK_URL;
    if (!notificationUrl) throw new Error("MAIL_GRAPH_WEBHOOK_URL missing");
    const clientState = crypto.randomUUID();
    const expiration = new Date(Date.now() + 50 * 60_000).toISOString(); // 50 min (Graph max ~1h for messages).
    interface Resp { id: string; expirationDateTime: string }
    const r = await this.fetch<Resp>(`https://graph.microsoft.com/v1.0/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        changeType: "created,updated,deleted",
        notificationUrl,
        resource: "me/mailFolders('inbox')/messages",
        expirationDateTime: expiration,
        clientState,
      }),
    });
    return { externalId: r.id, expiresAt: r.expirationDateTime, clientState };
  }

  async unsubscribePush(externalId: string): Promise<void> {
    await this.fetch(`https://graph.microsoft.com/v1.0/subscriptions/${encodeURIComponent(externalId)}`, { method: "DELETE" });
  }
}

export class MicrosoftAuthError extends Error {}
export class MicrosoftRetryableError extends Error {
  constructor(msg: string, public retryAfterMs: number) { super(msg); }
}

interface Address { name?: string; email: string }

function dedupeAddresses(list: Address[]): Address[] {
  const seen = new Set<string>();
  const out: Address[] = [];
  for (const a of list) {
    const k = a.email.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

function base64ToBytes(s: string | undefined | null): Uint8Array | null {
  if (!s) return null;
  try { return new Uint8Array(Buffer.from(s, "base64")); } catch { return null; }
}

function cleanMessageId(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const m = input.match(/<([^>]+)>/);
  return (m ? m[1] : input).trim() || undefined;
}
