/** Provider-agnostic driver contract.
 *
 *  Implementations: GoogleDriver (Gmail API), MicrosoftDriver (Graph),
 *  ImapDriver (IMAP + SMTP). The shell never branches on provider — every
 *  message comes back through this normalized shape. */

import type { Address } from "../address";

export type Folder = "inbox" | "sent" | "drafts" | "archive" | "spam" | "trash" | "all" | string;

export interface DriverThreadSummary {
  providerThreadId: string;
  providerLastMessageId?: string;
  subject: string;
  from?: Address;
  participants: Address[];
  labelIds: string[];
  folder: Folder;
  hasAttachment: boolean;
  hasCalendarInvite: boolean;
  unreadCount: number;
  messageCount: number;
  preview: string;
  lastMessageAt: string;
  starred: boolean;
}

export interface DriverMessage {
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
  receivedAt: string;
  sentAt?: string;
  bodyText?: string;
  bodyHtml?: string;
  headers: Record<string, string>;
  size: number;
  attachments: DriverAttachmentMeta[];
  labelIds: string[];
  folder: Folder;
  isRead: boolean;
  isStarred: boolean;
  rawBytes?: Uint8Array;
}

export interface DriverAttachmentMeta {
  providerAttachmentId: string;
  filename: string;
  contentType: string;
  size: number;
  cid?: string;
  inline: boolean;
}

export interface DriverLabel {
  providerLabelId: string;
  name: string;
  color?: string;
  parentId?: string;
  system?: boolean;
}

export interface ListThreadsArgs {
  folder?: Folder;
  labelIds?: string[];
  query?: string;
  cursor?: string;
  limit?: number;
}

export interface ListThreadsResult {
  items: DriverThreadSummary[];
  nextCursor?: string;
  totalEstimate?: number;
}

export interface DeltaArgs {
  cursor?: string;
}

export interface DeltaResult {
  changes: DriverDeltaChange[];
  nextCursor: string;
  fullRescanRequired?: boolean;
}

export interface DriverDeltaChange {
  kind: "thread.upsert" | "thread.delete" | "message.upsert" | "label.changed" | "label.delete";
  providerThreadId?: string;
  providerMessageId?: string;
  providerLabelId?: string;
}

export interface SendArgs {
  raw: Uint8Array;
  inReplyToProviderId?: string;
  threadProviderId?: string;
  envelope: { from: string; to: string[]; cc: string[]; bcc: string[] };
}

export interface SendResult {
  providerMessageId: string;
  providerThreadId: string;
}

export interface PushSubscribeResult {
  externalId: string;
  expiresAt?: string;
  topic?: string;
  clientState?: string;
}

export interface MailDriver {
  readonly provider: string;
  readonly connectionId: string;
  readonly tenantId: string;
  /** List threads for a folder + optional query. */
  listThreads(args: ListThreadsArgs): Promise<ListThreadsResult>;
  /** Fetch a single thread with all messages + attachment meta. */
  getThread(providerThreadId: string): Promise<{ summary: DriverThreadSummary; messages: DriverMessage[] }>;
  /** Stream a single attachment's bytes. */
  getAttachmentBytes(providerMessageId: string, providerAttachmentId: string): Promise<Uint8Array>;
  /** Apply / remove labels (Gmail). For Graph + IMAP we map to folders. */
  modifyLabels(threadIds: string[], add: string[], remove: string[]): Promise<void>;
  /** Mark read/unread in bulk. */
  markRead(messageIds: string[], read: boolean): Promise<void>;
  /** Move to trash. */
  trash(threadIds: string[]): Promise<void>;
  /** Restore from trash to inbox. */
  untrash(threadIds: string[]): Promise<void>;
  /** Mark spam. */
  spam(threadIds: string[]): Promise<void>;
  /** Archive — Gmail removes inbox label; IMAP/Graph move to archive. */
  archive(threadIds: string[]): Promise<void>;
  /** Permanently delete. */
  delete(threadIds: string[]): Promise<void>;
  /** Star / unstar. */
  star(threadIds: string[], starred: boolean): Promise<void>;
  /** Send a built MIME message. */
  send(args: SendArgs): Promise<SendResult>;
  /** Save as draft (returns provider draft id). */
  saveDraft(raw: Uint8Array): Promise<{ providerDraftId: string }>;
  /** Delete a draft. */
  deleteDraft(providerDraftId: string): Promise<void>;
  /** List labels / folders. */
  listLabels(): Promise<DriverLabel[]>;
  createLabel(label: { name: string; color?: string; parentId?: string }): Promise<DriverLabel>;
  updateLabel(providerLabelId: string, patch: { name?: string; color?: string }): Promise<DriverLabel>;
  deleteLabel(providerLabelId: string): Promise<void>;
  /** Delta sync. Returns batched changes since the last cursor. */
  delta(args: DeltaArgs): Promise<DeltaResult>;
  /** Subscribe to provider push (Pub/Sub for Gmail, change-notifications for Graph). */
  subscribePush?(): Promise<PushSubscribeResult>;
  /** Tear down a push subscription. */
  unsubscribePush?(externalId: string): Promise<void>;
  /** Optional: gracefully close any pooled resources (used by IMAP). */
  close?(): Promise<void>;
}

export interface DriverFactoryArgs {
  connection: ConnectionRecord;
  tenantId: string;
}

export interface ConnectionRecord {
  id: string;
  userId: string;
  provider: string;
  email: string;
  displayName?: string;
  status: string;
  accessTokenCipher?: string;
  refreshTokenCipher?: string;
  tokenExpiresAt?: string;
  imapHost?: string;
  imapPort?: number;
  imapTLS?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpTLS?: boolean;
  username?: string;
  passwordCipher?: string;
}
