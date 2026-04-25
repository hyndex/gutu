/** API client surface for routes that landed after the initial api.ts. */

import { apiFetch } from "@/runtime/auth";

export const mailApiExtras = {
  exportEml: (messageId: string): string => `/api/mail/export/eml/${encodeURIComponent(messageId)}`,
  exportThreadMbox: (threadId: string): string => `/api/mail/export/mbox/thread/${encodeURIComponent(threadId)}`,
  exportFolderMbox: (folder: string): string => `/api/mail/export/mbox/folder/${encodeURIComponent(folder)}`,

  importMbox: async (connectionId: string, file: File | Blob): Promise<{ imported: number }> => {
    const buf = await file.arrayBuffer();
    return apiFetch<{ imported: number }>(`/mail/export/import/${encodeURIComponent(connectionId)}?kind=mbox`, {
      method: "POST",
      headers: { "Content-Type": "application/mbox" },
      body: buf,
    });
  },
  importEml: async (connectionId: string, file: File | Blob): Promise<{ imported: number }> => {
    const buf = await file.arrayBuffer();
    return apiFetch<{ imported: number }>(`/mail/export/import/${encodeURIComponent(connectionId)}?kind=eml`, {
      method: "POST",
      headers: { "Content-Type": "message/rfc822" },
      body: buf,
    });
  },

  blockSender: (email: string, mode: "trash" | "spam" | "label" = "spam"): Promise<{ ruleId: string; alreadyBlocked: boolean; moved?: number }> =>
    apiFetch(`/mail/block/sender`, { method: "POST", body: JSON.stringify({ email, mode }) }),
  unblockSender: (email: string): Promise<{ ok: boolean; removed: number }> =>
    apiFetch(`/mail/block/sender/${encodeURIComponent(email)}`, { method: "DELETE" }),
  listBlockedSenders: (): Promise<{ rows: { id: string; email: string; createdAt: string }[] }> =>
    apiFetch(`/mail/block/senders`),

  issueReceipt: (messageId: string, threadId?: string): Promise<{ token: string; pixelUrl: string }> =>
    apiFetch(`/mail/receipts/issue`, { method: "POST", body: JSON.stringify({ messageId, threadId }) }),
  trackReceipt: (messageId: string): Promise<{ messageId: string; opens: { at: string; ip: string; user_agent: string }[] }> =>
    apiFetch(`/mail/receipts/track/${encodeURIComponent(messageId)}`),
};
