/** Display helpers used across mail surfaces. */

import type { Address } from "./api";

export function formatAddress(addr: Address): string {
  if (addr.name && addr.name !== addr.email) return `${addr.name} <${addr.email}>`;
  return addr.email;
}

export function formatRecipientShort(addr?: Address): string {
  if (!addr) return "Unknown";
  return addr.name || addr.email.split("@")[0];
}

export function formatAddressList(list: Address[], max = 3): string {
  if (!list.length) return "";
  if (list.length <= max) return list.map(formatRecipientShort).join(", ");
  return `${list.slice(0, max).map(formatRecipientShort).join(", ")} +${list.length - max}`;
}

export function formatRelativeTime(iso: string | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const diffMs = now.getTime() - t.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24 && t.toDateString() === now.toDateString()) {
    return t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (diffHr < 24 * 7) {
    return t.toLocaleDateString(undefined, { weekday: "short" });
  }
  if (now.getFullYear() === t.getFullYear()) {
    return t.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return t.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatBytes(n: number | undefined): string {
  if (!n || n <= 0) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let val = n;
  while (val >= 1024 && i < u.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(val >= 10 ? 0 : 1)} ${u[i]}`;
}

const COLORS = [
  "#7C3AED", "#06B6D4", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#3B82F6",
];

export function avatarColor(seed: string | undefined): string {
  if (!seed) return COLORS[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function initials(seed: string | undefined): string {
  if (!seed) return "?";
  const trimmed = seed.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export function snoozePresets(now: Date = new Date()): { label: string; at: Date }[] {
  const today9pm = new Date(now);
  today9pm.setHours(21, 0, 0, 0);
  const tomorrow9 = new Date(now);
  tomorrow9.setDate(tomorrow9.getDate() + 1);
  tomorrow9.setHours(9, 0, 0, 0);
  const sat9 = new Date(now);
  sat9.setDate(sat9.getDate() + ((6 - sat9.getDay() + 7) % 7 || 7));
  sat9.setHours(9, 0, 0, 0);
  const monday9 = new Date(now);
  monday9.setDate(monday9.getDate() + ((1 - monday9.getDay() + 7) % 7 || 7));
  monday9.setHours(9, 0, 0, 0);
  return [
    { label: "Later today (9pm)", at: today9pm },
    { label: "Tomorrow (9am)", at: tomorrow9 },
    { label: "This weekend (Sat 9am)", at: sat9 },
    { label: "Next week (Mon 9am)", at: monday9 },
  ];
}
