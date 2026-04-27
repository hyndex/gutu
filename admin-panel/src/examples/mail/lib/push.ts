/** Web Push subscription helpers (client-side).
 *
 *  Registers `/mail-sw.js`, requests notification permission, calls the
 *  backend for the VAPID public key, and POSTs the subscription to
 *  `/api/mail/push/subscribe`. */

import { apiFetch } from "@/runtime/auth";

export interface PushKey { configured: boolean; publicKey: string }

export async function getPushKey(): Promise<PushKey> {
  return apiFetch<PushKey>("/mail/push/key");
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/mail-sw.js", { scope: "/" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[mail.push] SW registration failed", err);
    return null;
  }
}

export async function subscribeToPush(): Promise<{ id: string } | { error: string }> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { error: "Notifications not supported by this browser" };
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { error: `Permission ${perm}` };
  const reg = await ensureServiceWorker();
  if (!reg) return { error: "Service worker not available" };
  const key = await getPushKey();
  if (!key.configured || !key.publicKey) return { error: "Server VAPID key not configured" };
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key.publicKey) as BufferSource,
  });
  const json = subscription.toJSON() as { endpoint?: string; expirationTime?: number | null; keys?: Record<string, string> };
  if (!json.endpoint || !json.keys) return { error: "Subscription missing endpoint or keys" };
  const result = await apiFetch<{ id: string }>("/mail/push/subscribe", {
    method: "POST",
    body: JSON.stringify({
      endpoint: json.endpoint,
      expirationTime: json.expirationTime,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      userAgent: navigator.userAgent,
    }),
  });
  return result;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await sub.unsubscribe().catch(() => undefined);
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
