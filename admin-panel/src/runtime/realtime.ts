import type { ResourceClient } from "./resourceClient";
import type { Emitter } from "@/lib/emitter";
import type { RuntimeEvents } from "./context";

/** Subscribe the runtime to backend WebSocket events. Every `resource.changed`
 *  frame invalidates the matching query cache entries, so any open view
 *  re-fetches. Reconnects with exponential backoff. */
export function startRealtime(
  resources: ResourceClient,
  bus: Emitter<RuntimeEvents>,
): () => void {
  let ws: WebSocket | null = null;
  let closed = false;
  let backoff = 1000;

  const connect = () => {
    if (closed) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/api/ws`;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      console.warn("[realtime] failed to open socket", err);
      scheduleReconnect();
      return;
    }

    ws.addEventListener("open", () => {
      backoff = 1000;
      console.info("[realtime] connected");
    });
    ws.addEventListener("message", (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "resource.changed" && msg.resource) {
          resources.cache.invalidateResource(msg.resource);
          bus.emit("realtime:resource-changed", {
            resource: msg.resource,
            id: msg.id,
            op: msg.op,
            actor: msg.actor,
            at: msg.at,
          });
        }
      } catch {
        /* ignore malformed frames */
      }
    });
    ws.addEventListener("close", () => {
      ws = null;
      scheduleReconnect();
    });
    ws.addEventListener("error", () => {
      ws?.close();
    });
  };

  const scheduleReconnect = () => {
    if (closed) return;
    const delay = Math.min(30_000, backoff);
    backoff = Math.min(30_000, backoff * 2);
    setTimeout(connect, delay);
  };

  connect();

  return () => {
    closed = true;
    ws?.close();
  };
}
