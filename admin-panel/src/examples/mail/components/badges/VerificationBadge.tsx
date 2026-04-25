import * as React from "react";
import { Badge } from "@/primitives/Badge";

export interface VerificationBadgesProps {
  spf?: string;
  dkim?: string;
  dmarc?: string;
}

export function VerificationBadges({ spf, dkim, dmarc }: VerificationBadgesProps): React.ReactElement {
  const items: { label: string; v?: string }[] = [
    { label: "SPF", v: spf },
    { label: "DKIM", v: dkim },
    { label: "DMARC", v: dmarc },
  ];
  return (
    <div className="inline-flex items-center gap-1">
      {items.map((it) => (
        <Badge
          key={it.label}
          intent={it.v === "pass" ? "success" : it.v === "fail" ? "danger" : "neutral"}
          title={`${it.label}: ${it.v ?? "unknown"}`}
        >
          {it.label}
        </Badge>
      ))}
    </div>
  );
}
