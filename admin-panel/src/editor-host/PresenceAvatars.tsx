/** Avatar stack showing every user currently editing or viewing the
 *  document. Driven by `editor-frame-presence` postMessages from the
 *  iframe (which listens to the y-websocket awareness channel).
 *
 *  Each peer renders as a circular badge with the user's initial,
 *  background color matching their cursor color in the editor, and a
 *  hover tooltip showing the full name. Self is excluded — peers are
 *  filtered by the iframe before they ever reach this component. */
import React from "react";

export interface PresencePeer {
  clientId: number;
  user: {
    id?: string;
    name: string;
    email?: string;
    color: string;
  };
}

interface Props {
  peers: PresencePeer[];
  /** Connection status — drives the small status dot next to the
   *  stack. "connecting" → amber, "connected" → green, otherwise gray. */
  status?: "connecting" | "connected" | "disconnected";
  max?: number;
}

export function PresenceAvatars({ peers, status, max = 5 }: Props): React.JSX.Element | null {
  if (!peers || peers.length === 0) {
    // Show just the status dot when no peers (the editor is solo).
    return (
      <span
        title={status === "connected" ? "Live: connected" : status === "connecting" ? "Connecting…" : "Offline"}
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background:
            status === "connected" ? "#10b981" :
            status === "connecting" ? "#f59e0b" :
            "#9ca3af",
          marginRight: 8,
        }}
      />
    );
  }
  // Dedupe by user.id (a single user with multiple tabs counts once).
  const seen = new Set<string>();
  const unique: PresencePeer[] = [];
  for (const p of peers) {
    const k = p.user.id ?? `cid:${p.clientId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(p);
  }
  const visible = unique.slice(0, max);
  const overflow = unique.length - visible.length;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 0, marginRight: 8 }}>
      {visible.map((p, i) => {
        const initial = (p.user.name || p.user.email || "?").trim().charAt(0).toUpperCase();
        return (
          <span
            key={p.clientId}
            title={p.user.email ? `${p.user.name} <${p.user.email}>` : p.user.name}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: p.user.color,
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              border: "2px solid #fafafa",
              marginLeft: i === 0 ? 0 : -8,
              userSelect: "none",
            }}
          >
            {initial}
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          title={unique
            .slice(max)
            .map((p) => p.user.name || p.user.email || "")
            .join(", ")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "#9ca3af",
            color: "#fff",
            fontSize: 10,
            fontWeight: 600,
            border: "2px solid #fafafa",
            marginLeft: -8,
            userSelect: "none",
          }}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
