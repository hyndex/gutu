/** Inline help popover for the search bar — lists supported operators. */

import * as React from "react";
import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/primitives/Popover";

const OPS: { op: string; example: string; desc: string }[] = [
  { op: "from:", example: "from:alice@x.test", desc: "Sender address" },
  { op: "to:", example: "to:bob@x.test", desc: "Recipient address" },
  { op: "cc:", example: "cc:dev@x.test", desc: "Cc recipient" },
  { op: "subject:", example: 'subject:"Q4 plan"', desc: "Match subject" },
  { op: "label:", example: "label:bills", desc: "Threads with this label" },
  { op: "category:", example: "category:promotions", desc: "Category bucket" },
  { op: "filename:", example: "filename:pdf", desc: "Attachment filename" },
  { op: "in:", example: "in:trash", desc: "Folder name" },
  { op: "is:", example: "is:unread is:starred is:snoozed is:phishing", desc: "State flags" },
  { op: "has:", example: "has:attachment has:calendar", desc: "Content flags" },
  { op: "older_than:", example: "older_than:7d", desc: "Older than (s/m/h/d/w/M/y)" },
  { op: "newer_than:", example: "newer_than:24h", desc: "Newer than" },
  { op: "before:", example: "before:2026-01-01", desc: "Before date" },
  { op: "after:", example: "after:2026-01-01", desc: "After date" },
  { op: "larger:", example: "larger:5M", desc: "Size > N" },
  { op: "smaller:", example: "smaller:1M", desc: "Size < N" },
  { op: "list:", example: "list:devs.example.com", desc: "Mailing-list id" },
  { op: "OR / NOT", example: "from:alice OR from:bob NOT trash", desc: "Boolean combinators" },
  { op: "( )", example: "(from:a OR from:b) has:attachment", desc: "Group expressions" },
];

export function SearchOperatorHelp(): React.ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Search syntax" className="text-text-muted hover:text-text-primary">
          <HelpCircle size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[28rem] max-h-[60vh] overflow-y-auto p-3 text-sm">
        <h3 className="mb-2 text-sm font-semibold">Search syntax</h3>
        <ul className="space-y-1.5">
          {OPS.map((o) => (
            <li key={o.op} className="grid grid-cols-[6rem_1fr] gap-2">
              <code className="text-xs font-mono text-accent">{o.op}</code>
              <div>
                <div className="text-xs text-text-muted">{o.desc}</div>
                <code className="text-xs font-mono">{o.example}</code>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
