import * as React from "react";
import { Paperclip, Download } from "lucide-react";
import { formatBytes } from "../../lib/format";

export interface AttachmentListProps {
  attachments: { providerAttachmentId: string; filename: string; contentType: string; size: number; cid?: string; inline: boolean }[];
  messageId: string;
}

export function AttachmentList({ attachments, messageId }: AttachmentListProps): React.ReactElement | null {
  if (attachments.length === 0) return null;
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-xs text-text-muted">
        <Paperclip size={12} aria-hidden /> {attachments.length} attachment{attachments.length === 1 ? "" : "s"}
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {attachments.map((a) => (
          <li
            key={a.providerAttachmentId}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-1 px-2 py-1.5 text-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium" title={a.filename}>{a.filename}</div>
              <div className="text-xs text-text-muted">{a.contentType} · {formatBytes(a.size)}</div>
            </div>
            <button
              type="button"
              className="text-text-muted hover:text-text-primary"
              onClick={() => download(messageId, a.providerAttachmentId, a.filename)}
              aria-label={`Download ${a.filename}`}
              title="Download"
            >
              <Download size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function download(messageId: string, attId: string, filename: string): void {
  const url = `/api/mail/messages/attachments/${encodeURIComponent(messageId)}/${encodeURIComponent(attId)}`;
  // Best effort — backend route to stream attachments could be added; for
  // now we open in a new tab so the browser handles content-disposition.
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
