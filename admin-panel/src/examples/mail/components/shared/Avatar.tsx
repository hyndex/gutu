import * as React from "react";
import { avatarColor, initials } from "../../lib/format";

export function MailAvatar({ name, email, size = 32 }: { name?: string; email?: string; size?: number }): React.ReactElement {
  const seed = name || email || "?";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        background: avatarColor(seed),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: size * 0.4,
        fontWeight: 600,
        flexShrink: 0,
      }}
      aria-hidden
    >
      {initials(seed)}
    </div>
  );
}
