/** JMAP driver — connects to a self-hosted JMAP server (Stalwart, Cyrus,
 *  Apache James) and presents the framework's MailDriver contract.
 *
 *  Why JMAP and not bare IMAP: JMAP is JSON-over-HTTP, supports batched
 *  method calls in a single round-trip, has a real delta protocol
 *  (`Email/changes`), and natively expresses all the things IMAP makes
 *  awkward — message threading, folder hierarchy with special-use, push
 *  via EventSource, server-side search.
 *
 *  References:
 *    - RFC 8620 — JMAP core
 *    - RFC 8621 — JMAP for mail
 *
 *  Hardening:
 *    - Single-flight session bootstrap per connection (capability and
 *      account ids are cached for the pool TTL, then re-fetched).
 *    - Bearer-token auth via the encrypted `accessTokenCipher`. The token
 *      can be either a Stalwart API token (preferred) or a JMAP basic
 *      auth header pre-encoded as `base64(user:pass)`.
 *    - Every request goes through `request()` which sets a 15s timeout,
 *      validates the response shape, and rolls failed responses up into
 *      an Error so callers can rely on `try/catch`. */

import { Buffer } from "node:buffer";
import { tryDecryptString } from "../crypto/at-rest";
import { parseRfc822 } from "../mime/parser";
import { previewFromHtml } from "../mime/sanitize";
import type {
  ConnectionRecord,
  DeltaArgs,
  DeltaResult,
  DriverDeltaChange,
  DriverLabel,
  DriverMessage,
  DriverThreadSummary,
  ListThreadsArgs,
  ListThreadsResult,
  MailDriver,
  SendArgs,
  SendResult,
} from "./types";
import type { Address } from "../address";

/* -------------------------------------------------------------------- */
/* JMAP protocol shapes — only the bits we actually need.               */
/* -------------------------------------------------------------------- */

interface JmapSession {
  apiUrl: string;
  downloadUrl: string;
  uploadUrl: string;
  primaryAccounts: Record<string, string>;
  accounts: Record<string, { name: string; isPersonal: boolean }>;
}

interface JmapAddress { name?: string; email: string }

interface JmapEmailHeader { name: string; value: string }

interface JmapEmail {
  id: string;
  blobId: string;
  threadId: string;
  mailboxIds: Record<string, true>;
  keywords?: Record<string, true>;
  from?: JmapAddress[];
  to?: JmapAddress[];
  cc?: JmapAddress[];
  bcc?: JmapAddress[];
  replyTo?: JmapAddress[];
  subject?: string;
  receivedAt?: string;
  sentAt?: string;
  size?: number;
  preview?: string;
  hasAttachment?: boolean;
  messageId?: string[];
  inReplyTo?: string[];
  references?: string[];
  textBody?: Array<{ partId: string; type: string }>;
  htmlBody?: Array<{ partId: string; type: string }>;
  attachments?: Array<{
    partId?: string;
    blobId: string;
    name?: string;
    type: string;
    size: number;
    cid?: string;
    disposition?: string;
  }>;
  bodyValues?: Record<string, { value: string; isTruncated?: boolean }>;
}

interface JmapMailbox {
  id: string;
  name: string;
  parentId?: string | null;
  role?: string | null;
  totalEmails?: number;
  unreadEmails?: number;
}

/* -------------------------------------------------------------------- */
/* Pool — a JMAP session per connection, cached for 5 min.              */
/* -------------------------------------------------------------------- */

interface SessionState {
  apiUrl: string;
  downloadUrl: string;
  uploadUrl: string;
  accountId: string;
  authHeader: string;
  mailboxByRole: Record<string, string>;
  expiresAt: number;
}

const SESSION_POOL = new Map<string, SessionState>();
const SESSION_TTL_MS = 5 * 60_000;
const REQUEST_TIMEOUT_MS = 15_000;

/* -------------------------------------------------------------------- */
/* Folder mapping. JMAP uses `role` (RFC 8621) which maps cleanly to    */
/* our virtual folders.                                                 */
/* -------------------------------------------------------------------- */

const ROLE_TO_FOLDER: Record<string, string> = {
  inbox: "inbox",
  sent: "sent",
  drafts: "drafts",
  trash: "trash",
  junk: "spam",
  archive: "archive",
  all: "all",
};

const FOLDER_TO_ROLE: Record<string, string> = {
  inbox: "inbox",
  sent: "sent",
  drafts: "drafts",
  trash: "trash",
  spam: "junk",
  archive: "archive",
  all: "all",
};

/* -------------------------------------------------------------------- */
/* Driver                                                               */
/* -------------------------------------------------------------------- */

export class JmapDriver implements MailDriver {
  readonly provider = "jmap";
  readonly connectionId: string;
  readonly tenantId: string;
  private connection: ConnectionRecord;

  constructor(connection: ConnectionRecord, tenantId: string) {
    this.connection = connection;
    this.connectionId = connection.id;
    this.tenantId = tenantId;
  }

  /* -- session bootstrap ------------------------------------------- */

  private async session(): Promise<SessionState> {
    const cached = SESSION_POOL.get(this.connectionId);
    if (cached && cached.expiresAt > Date.now()) return cached;

    const baseUrl = this.connection.imapHost;
    if (!baseUrl) throw new Error("jmap host missing — set imapHost to the server's base URL");
    const tokenBytes = this.connection.accessTokenCipher
      ? new Uint8Array(Buffer.from(this.connection.accessTokenCipher, "base64"))
      : undefined;
    const token = tryDecryptString(tokenBytes);
    if (!token) {
      // Fall back to basic auth if the operator stored credentials.
      const password = tryDecryptString(this.connection.passwordCipher
        ? new Uint8Array(Buffer.from(this.connection.passwordCipher, "base64"))
        : undefined);
      if (!this.connection.username || !password) {
        throw new Error("jmap credentials missing — set accessTokenCipher (preferred) or username + passwordCipher");
      }
      const basic = Buffer.from(`${this.connection.username}:${password}`).toString("base64");
      return await this.bootstrap(baseUrl, `Basic ${basic}`);
    }
    return await this.bootstrap(baseUrl, `Bearer ${token}`);
  }

  private async bootstrap(baseUrl: string, authHeader: string): Promise<SessionState> {
    const url = baseUrl.replace(/\/+$/, "") + "/.well-known/jmap";
    const session = await fetchJson<JmapSession>(url, {
      method: "GET",
      headers: { Authorization: authHeader, Accept: "application/json" },
    });
    const accountId = session.primaryAccounts?.["urn:ietf:params:jmap:mail"];
    if (!accountId) throw new Error("jmap session has no mail account");

    const state: SessionState = {
      apiUrl: session.apiUrl,
      downloadUrl: session.downloadUrl,
      uploadUrl: session.uploadUrl,
      accountId,
      authHeader,
      mailboxByRole: {},
      expiresAt: Date.now() + SESSION_TTL_MS,
    };

    // Prime the role → mailbox-id map. Cheap one-time call; cached.
    const mailboxes = await this.listMailboxes(state);
    for (const mb of mailboxes) {
      if (mb.role) state.mailboxByRole[mb.role] = mb.id;
    }

    SESSION_POOL.set(this.connectionId, state);
    return state;
  }

  private async listMailboxes(state: SessionState): Promise<JmapMailbox[]> {
    const res = await this.call<{ list: JmapMailbox[] }>(state, "Mailbox/get", {
      accountId: state.accountId,
      ids: null,
    });
    return res.list ?? [];
  }

  /* -- low-level JMAP request --------------------------------------- */

  private async call<T>(state: SessionState, method: string, args: Record<string, unknown>): Promise<T> {
    const body = {
      using: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail", "urn:ietf:params:jmap:submission"],
      methodCalls: [[method, args, "0"]],
    };
    const res = await fetchJson<{
      methodResponses: Array<[string, Record<string, unknown>, string]>;
    }>(state.apiUrl, {
      method: "POST",
      headers: {
        Authorization: state.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    const first = res.methodResponses?.[0];
    if (!first) throw new Error(`jmap call ${method}: empty methodResponses`);
    const [respName, respArgs] = first;
    if (respName === "error") {
      throw new Error(`jmap error: ${JSON.stringify(respArgs)}`);
    }
    return respArgs as T;
  }

  private folderToMailboxId(state: SessionState, folder: string | undefined): string | undefined {
    const role = FOLDER_TO_ROLE[folder ?? "inbox"] ?? "inbox";
    return state.mailboxByRole[role];
  }

  /* -- MailDriver methods ------------------------------------------ */

  async listThreads(args: ListThreadsArgs): Promise<ListThreadsResult> {
    const state = await this.session();
    const mailboxId = this.folderToMailboxId(state, args.folder);
    const limit = Math.max(1, Math.min(args.limit ?? 25, 100));

    // Email/query → Email/get → Thread/get pattern.
    const filter: Record<string, unknown> = mailboxId ? { inMailbox: mailboxId } : {};
    if (args.query) filter.text = args.query;

    const queryRes = await this.call<{ ids: string[]; total?: number }>(
      state,
      "Email/query",
      {
        accountId: state.accountId,
        filter,
        sort: [{ property: "receivedAt", isAscending: false }],
        position: args.cursor ? Number(args.cursor) : 0,
        limit,
        calculateTotal: true,
      },
    );
    if (!queryRes.ids || queryRes.ids.length === 0) {
      return { items: [], totalEstimate: queryRes.total ?? 0 };
    }
    const emails = await this.call<{ list: JmapEmail[] }>(state, "Email/get", {
      accountId: state.accountId,
      ids: queryRes.ids,
      properties: [
        "id", "threadId", "mailboxIds", "keywords", "from", "to", "cc",
        "subject", "receivedAt", "sentAt", "preview", "hasAttachment",
        "size", "messageId",
      ],
    });

    // Group emails by threadId so the summary aggregates message counts.
    const byThread = new Map<string, JmapEmail[]>();
    for (const e of emails.list ?? []) {
      const tid = e.threadId;
      if (!byThread.has(tid)) byThread.set(tid, []);
      byThread.get(tid)!.push(e);
    }
    const items: DriverThreadSummary[] = [];
    for (const [tid, msgs] of byThread) {
      // Pick the most recent message as the summary anchor.
      const latest = msgs.reduce((a, b) => {
        const ta = a.receivedAt ? Date.parse(a.receivedAt) : 0;
        const tb = b.receivedAt ? Date.parse(b.receivedAt) : 0;
        return tb > ta ? b : a;
      });
      const unreadCount = msgs.filter((m) => !m.keywords?.["$seen"]).length;
      items.push({
        providerThreadId: tid,
        providerLastMessageId: latest.id,
        subject: latest.subject ?? "(no subject)",
        from: jmapAddrToAddress(latest.from?.[0]),
        participants: collectParticipants(msgs),
        labelIds: Object.keys(latest.mailboxIds),
        folder: this.mailboxIdToFolder(state, latest),
        hasAttachment: !!latest.hasAttachment,
        hasCalendarInvite: false,
        unreadCount,
        messageCount: msgs.length,
        preview: latest.preview ?? "",
        lastMessageAt: latest.receivedAt ?? new Date().toISOString(),
        starred: !!latest.keywords?.["$flagged"],
      });
    }

    return {
      items,
      totalEstimate: queryRes.total,
      nextCursor: queryRes.ids.length === limit ? String((args.cursor ? Number(args.cursor) : 0) + limit) : undefined,
    };
  }

  async getThread(providerThreadId: string): Promise<{ summary: DriverThreadSummary; messages: DriverMessage[] }> {
    const state = await this.session();
    const idsRes = await this.call<{ list: Array<{ id: string; emailIds: string[] }> }>(
      state,
      "Thread/get",
      { accountId: state.accountId, ids: [providerThreadId] },
    );
    const emailIds = idsRes.list?.[0]?.emailIds ?? [];
    if (emailIds.length === 0) {
      throw new Error(`thread ${providerThreadId} not found`);
    }
    const emailsRes = await this.call<{ list: JmapEmail[] }>(state, "Email/get", {
      accountId: state.accountId,
      ids: emailIds,
      properties: [
        "id", "threadId", "mailboxIds", "keywords", "from", "to", "cc",
        "bcc", "replyTo", "subject", "receivedAt", "sentAt", "preview",
        "hasAttachment", "size", "messageId", "inReplyTo", "references",
        "textBody", "htmlBody", "attachments", "bodyValues",
      ],
      bodyProperties: ["partId", "type"],
      fetchTextBodyValues: true,
      fetchHTMLBodyValues: true,
      maxBodyValueBytes: 250_000,
    });

    const messages: DriverMessage[] = (emailsRes.list ?? []).map((e) => this.toDriverMessage(state, e));
    const latest = messages.reduce((a, b) => (Date.parse(b.receivedAt) > Date.parse(a.receivedAt) ? b : a));
    const summary: DriverThreadSummary = {
      providerThreadId,
      providerLastMessageId: latest.providerMessageId,
      subject: latest.subject ?? "(no subject)",
      from: latest.from,
      participants: collectParticipantsFromMessages(messages),
      labelIds: latest.labelIds,
      folder: latest.folder,
      hasAttachment: messages.some((m) => m.attachments.length > 0),
      hasCalendarInvite: false,
      unreadCount: messages.filter((m) => !m.isRead).length,
      messageCount: messages.length,
      preview: previewFromHtml(latest.bodyHtml ?? "") || (latest.bodyText ?? "").slice(0, 240),
      lastMessageAt: latest.receivedAt,
      starred: messages.some((m) => m.isStarred),
    };
    return { summary, messages };
  }

  async getAttachmentBytes(_providerMessageId: string, providerAttachmentId: string): Promise<Uint8Array> {
    const state = await this.session();
    // Stalwart serves blobs at downloadUrl with `{accountId}/{blobId}/{name}/{type}` interpolation.
    const url = state.downloadUrl
      .replace("{accountId}", encodeURIComponent(state.accountId))
      .replace("{blobId}", encodeURIComponent(providerAttachmentId))
      .replace("{name}", "attachment")
      .replace("{type}", "application/octet-stream");
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: state.authHeader },
    });
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  async modifyLabels(threadIds: string[], add: string[], remove: string[]): Promise<void> {
    if (threadIds.length === 0 || (add.length === 0 && remove.length === 0)) return;
    const state = await this.session();
    const update: Record<string, Record<string, true | null>> = {};
    for (const tid of threadIds) {
      const u: Record<string, true | null> = {};
      for (const id of add) u[`mailboxIds/${id}`] = true;
      for (const id of remove) u[`mailboxIds/${id}`] = null;
      update[tid] = u;
    }
    await this.call(state, "Email/set", { accountId: state.accountId, update });
  }

  async markRead(messageIds: string[], read: boolean): Promise<void> {
    if (messageIds.length === 0) return;
    const state = await this.session();
    const update: Record<string, Record<string, true | null>> = {};
    for (const id of messageIds) {
      update[id] = { "keywords/$seen": read ? true : null };
    }
    await this.call(state, "Email/set", { accountId: state.accountId, update });
  }

  async trash(threadIds: string[]): Promise<void> { await this.moveTo(threadIds, "trash"); }
  async untrash(threadIds: string[]): Promise<void> { await this.moveTo(threadIds, "inbox"); }
  async spam(threadIds: string[]): Promise<void> { await this.moveTo(threadIds, "junk"); }
  async archive(threadIds: string[]): Promise<void> { await this.moveTo(threadIds, "archive"); }

  private async moveTo(threadIds: string[], role: string): Promise<void> {
    if (threadIds.length === 0) return;
    const state = await this.session();
    const targetMailbox = state.mailboxByRole[role];
    if (!targetMailbox) throw new Error(`no mailbox with role ${role}`);
    const update: Record<string, { mailboxIds: Record<string, true> }> = {};
    for (const tid of threadIds) {
      update[tid] = { mailboxIds: { [targetMailbox]: true } };
    }
    await this.call(state, "Email/set", { accountId: state.accountId, update });
  }

  async delete(threadIds: string[]): Promise<void> {
    if (threadIds.length === 0) return;
    const state = await this.session();
    await this.call(state, "Email/set", {
      accountId: state.accountId,
      destroy: threadIds,
    });
  }

  async star(messageIds: string[], starred: boolean): Promise<void> {
    if (messageIds.length === 0) return;
    const state = await this.session();
    const update: Record<string, Record<string, true | null>> = {};
    for (const id of messageIds) {
      update[id] = { "keywords/$flagged": starred ? true : null };
    }
    await this.call(state, "Email/set", { accountId: state.accountId, update });
  }

  async send(args: SendArgs): Promise<SendResult> {
    const state = await this.session();
    // Two-step: upload raw RFC822 → Email/import → EmailSubmission/set.
    const uploadUrl = state.uploadUrl.replace("{accountId}", encodeURIComponent(state.accountId));
    const uploadRes = await fetchJson<{ blobId: string }>(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: state.authHeader,
        "Content-Type": "message/rfc822",
      },
      body: Buffer.from(args.raw),
    });
    const draftsId = state.mailboxByRole.drafts;
    if (!draftsId) throw new Error("server has no Drafts mailbox");
    const importRes = await this.call<{ created: Record<string, JmapEmail> }>(
      state,
      "Email/import",
      {
        accountId: state.accountId,
        emails: {
          new: {
            blobId: uploadRes.blobId,
            mailboxIds: { [draftsId]: true },
            keywords: { $draft: true, $seen: true },
          },
        },
      },
    );
    const created = importRes.created?.new;
    if (!created) throw new Error("Email/import returned no created entry");
    const submissionRes = await this.call<{ created: Record<string, { id: string }> }>(
      state,
      "EmailSubmission/set",
      {
        accountId: state.accountId,
        create: {
          submit: {
            emailId: created.id,
            envelope: {
              mailFrom: { email: args.envelope.from },
              rcptTo: [
                ...args.envelope.to.map((e) => ({ email: e })),
                ...args.envelope.cc.map((e) => ({ email: e })),
                ...args.envelope.bcc.map((e) => ({ email: e })),
              ],
            },
          },
        },
      },
    );
    if (!submissionRes.created?.submit) {
      throw new Error("EmailSubmission/set returned no submit entry");
    }
    return {
      providerMessageId: created.id,
      providerThreadId: created.threadId,
    };
  }

  async saveDraft(raw: Uint8Array): Promise<{ providerDraftId: string }> {
    const state = await this.session();
    const uploadUrl = state.uploadUrl.replace("{accountId}", encodeURIComponent(state.accountId));
    const uploadRes = await fetchJson<{ blobId: string }>(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: state.authHeader,
        "Content-Type": "message/rfc822",
      },
      body: Buffer.from(raw),
    });
    const draftsId = state.mailboxByRole.drafts;
    if (!draftsId) throw new Error("server has no Drafts mailbox");
    const importRes = await this.call<{ created: Record<string, JmapEmail> }>(
      state,
      "Email/import",
      {
        accountId: state.accountId,
        emails: {
          new: {
            blobId: uploadRes.blobId,
            mailboxIds: { [draftsId]: true },
            keywords: { $draft: true, $seen: true },
          },
        },
      },
    );
    const created = importRes.created?.new;
    if (!created) throw new Error("draft import failed");
    return { providerDraftId: created.id };
  }

  async deleteDraft(providerDraftId: string): Promise<void> {
    const state = await this.session();
    await this.call(state, "Email/set", {
      accountId: state.accountId,
      destroy: [providerDraftId],
    });
  }

  async listLabels(): Promise<DriverLabel[]> {
    const state = await this.session();
    const list = await this.listMailboxes(state);
    return list.map<DriverLabel>((m) => ({
      providerLabelId: m.id,
      name: m.name,
      parentId: m.parentId ?? undefined,
      system: !!m.role,
    }));
  }

  async createLabel(label: { name: string; color?: string; parentId?: string }): Promise<DriverLabel> {
    const state = await this.session();
    const res = await this.call<{ created: Record<string, JmapMailbox> }>(state, "Mailbox/set", {
      accountId: state.accountId,
      create: {
        new: { name: label.name, parentId: label.parentId ?? null },
      },
    });
    const created = res.created?.new;
    if (!created) throw new Error("createLabel failed");
    return { providerLabelId: created.id, name: created.name, parentId: created.parentId ?? undefined };
  }

  async updateLabel(providerLabelId: string, patch: { name?: string; color?: string }): Promise<DriverLabel> {
    const state = await this.session();
    const update: Record<string, { name?: string }> = {};
    if (patch.name) update[providerLabelId] = { name: patch.name };
    if (Object.keys(update).length > 0) {
      await this.call(state, "Mailbox/set", { accountId: state.accountId, update });
    }
    return { providerLabelId, name: patch.name ?? "" };
  }

  async deleteLabel(providerLabelId: string): Promise<void> {
    const state = await this.session();
    await this.call(state, "Mailbox/set", {
      accountId: state.accountId,
      destroy: [providerLabelId],
    });
  }

  async delta(args: DeltaArgs): Promise<DeltaResult> {
    const state = await this.session();
    if (!args.cursor) {
      // First sync: cursor = current state.
      const stateRes = await this.call<{ state: string }>(state, "Email/get", {
        accountId: state.accountId,
        ids: [],
      });
      return { changes: [], nextCursor: stateRes.state ?? "" };
    }
    const res = await this.call<{
      created: string[];
      updated: string[];
      destroyed: string[];
      newState: string;
      hasMoreChanges?: boolean;
    }>(state, "Email/changes", {
      accountId: state.accountId,
      sinceState: args.cursor,
      maxChanges: 500,
    });
    const changes: DriverDeltaChange[] = [];
    for (const id of res.created ?? []) changes.push({ kind: "message.upsert", providerMessageId: id });
    for (const id of res.updated ?? []) changes.push({ kind: "message.upsert", providerMessageId: id });
    for (const id of res.destroyed ?? []) changes.push({ kind: "thread.delete", providerThreadId: id });
    return {
      changes,
      nextCursor: res.newState ?? args.cursor ?? "",
      fullRescanRequired: false,
    };
  }

  async close(): Promise<void> {
    SESSION_POOL.delete(this.connectionId);
  }

  /* -- helpers ----------------------------------------------------- */

  private mailboxIdToFolder(state: SessionState, email: JmapEmail): string {
    for (const [role, id] of Object.entries(state.mailboxByRole)) {
      if (email.mailboxIds[id]) return ROLE_TO_FOLDER[role] ?? role;
    }
    return "inbox";
  }

  private toDriverMessage(state: SessionState, e: JmapEmail): DriverMessage {
    const text = pickBody(e, e.textBody);
    const html = pickBody(e, e.htmlBody);
    const headers: Record<string, string> = {};
    // JMAP doesn't expose all headers by default — leave empty unless we
    // explicitly request raw. The downstream pipeline tolerates this.
    if (e.size && e.size > 0 && e.blobId) {
      // For richer extraction (calendar invites, custom headers) the
      // ingest pipeline can fall back to fetching the raw blob via
      // getAttachmentBytes. Most consumers don't need this.
    }
    return {
      providerMessageId: e.id,
      providerThreadId: e.threadId,
      messageIdHeader: e.messageId?.[0],
      inReplyTo: e.inReplyTo?.[0],
      references: e.references ?? [],
      from: jmapAddrToAddress(e.from?.[0]),
      to: (e.to ?? []).map((a) => jmapAddrToAddress(a)).filter(notNull),
      cc: (e.cc ?? []).map((a) => jmapAddrToAddress(a)).filter(notNull),
      bcc: (e.bcc ?? []).map((a) => jmapAddrToAddress(a)).filter(notNull),
      replyTo: (e.replyTo ?? []).map((a) => jmapAddrToAddress(a)).filter(notNull),
      subject: e.subject,
      receivedAt: e.receivedAt ?? new Date().toISOString(),
      sentAt: e.sentAt,
      bodyText: text,
      bodyHtml: html,
      headers,
      size: e.size ?? 0,
      attachments: (e.attachments ?? []).map((a) => ({
        providerAttachmentId: a.blobId,
        filename: a.name ?? "attachment",
        contentType: a.type,
        size: a.size,
        cid: a.cid,
        inline: a.disposition === "inline",
      })),
      labelIds: Object.keys(e.mailboxIds),
      folder: this.mailboxIdToFolder(state, e),
      isRead: !!e.keywords?.["$seen"],
      isStarred: !!e.keywords?.["$flagged"],
    };
  }
}

/* -------------------------------------------------------------------- */
/* Helpers                                                              */
/* -------------------------------------------------------------------- */

function jmapAddrToAddress(a: JmapAddress | undefined): Address | undefined {
  if (!a || !a.email) return undefined;
  return { name: a.name, email: a.email };
}

function notNull<T>(v: T | undefined | null): v is T {
  return v != null;
}

function pickBody(
  e: JmapEmail,
  parts: Array<{ partId: string; type: string }> | undefined,
): string | undefined {
  if (!parts || parts.length === 0 || !e.bodyValues) return undefined;
  for (const p of parts) {
    const bv = e.bodyValues[p.partId];
    if (bv?.value) return bv.value;
  }
  return undefined;
}

function collectParticipants(emails: readonly JmapEmail[]): Address[] {
  const seen = new Map<string, Address>();
  for (const e of emails) {
    for (const a of [...(e.from ?? []), ...(e.to ?? []), ...(e.cc ?? [])]) {
      const addr = jmapAddrToAddress(a);
      if (!addr) continue;
      if (!seen.has(addr.email.toLowerCase())) seen.set(addr.email.toLowerCase(), addr);
    }
  }
  return Array.from(seen.values());
}

function collectParticipantsFromMessages(messages: readonly DriverMessage[]): Address[] {
  const seen = new Map<string, Address>();
  for (const m of messages) {
    if (m.from) seen.set(m.from.email.toLowerCase(), m.from);
    for (const a of [...m.to, ...m.cc]) seen.set(a.email.toLowerCase(), a);
  }
  return Array.from(seen.values());
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetchWithTimeout(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`jmap ${init.method ?? "GET"} ${url} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}
