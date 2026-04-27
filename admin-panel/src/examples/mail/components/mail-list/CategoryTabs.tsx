/** Category tab strip — Primary / Promotions / Social / Updates / Forums.
 *
 *  Tabs filter the active inbox view by `categoryAuto`. The thread list
 *  reads the active tab from the URL (?cat=...) so deep-links work and
 *  selection survives reload. */

import * as React from "react";
import { Inbox, Tag, Users, RefreshCcw, MessageCircle, type LucideIcon } from "lucide-react";

export type CategoryKey = "primary" | "promotions" | "social" | "updates" | "forums";

const CATEGORIES: { key: CategoryKey; label: string; icon: LucideIcon }[] = [
  { key: "primary", label: "Primary", icon: Inbox },
  { key: "promotions", label: "Promotions", icon: Tag },
  { key: "social", label: "Social", icon: Users },
  { key: "updates", label: "Updates", icon: RefreshCcw },
  { key: "forums", label: "Forums", icon: MessageCircle },
];

export interface CategoryCounts {
  primary?: number; promotions?: number; social?: number; updates?: number; forums?: number;
}

export function CategoryTabs(props: {
  active: CategoryKey;
  onChange: (cat: CategoryKey) => void;
  counts?: CategoryCounts;
}): React.ReactElement {
  return (
    <div role="tablist" aria-label="Inbox categories" className="flex border-b border-border">
      {CATEGORIES.map(({ key, label, icon: Icon }) => {
        const active = props.active === key;
        const count = props.counts?.[key] ?? 0;
        return (
          <button
            type="button"
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => props.onChange(key)}
            className={[
              "flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
              active ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary",
            ].join(" ")}
          >
            <Icon size={14} />
            <span className="truncate">{label}</span>
            {count > 0 && <span className="ml-1 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px]">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
