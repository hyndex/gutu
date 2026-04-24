import type { EnumOption } from "@/contracts/fields";

export const STATUS_ACTIVE: readonly EnumOption[] = [
  { value: "active", label: "Active", intent: "success" },
  { value: "inactive", label: "Inactive", intent: "neutral" },
  { value: "archived", label: "Archived", intent: "warning" },
];

export const STATUS_LIFECYCLE: readonly EnumOption[] = [
  { value: "draft", label: "Draft", intent: "neutral" },
  { value: "pending", label: "Pending", intent: "warning" },
  { value: "approved", label: "Approved", intent: "info" },
  { value: "published", label: "Published", intent: "success" },
  { value: "archived", label: "Archived", intent: "neutral" },
];

export const STATUS_TICKET: readonly EnumOption[] = [
  { value: "open", label: "Open", intent: "info" },
  { value: "in_progress", label: "In progress", intent: "warning" },
  { value: "resolved", label: "Resolved", intent: "success" },
  { value: "closed", label: "Closed", intent: "neutral" },
];

export const PRIORITY: readonly EnumOption[] = [
  { value: "low", label: "Low", intent: "neutral" },
  { value: "normal", label: "Normal", intent: "info" },
  { value: "high", label: "High", intent: "warning" },
  { value: "urgent", label: "Urgent", intent: "danger" },
];

export const SEVERITY: readonly EnumOption[] = [
  { value: "info", label: "Info", intent: "info" },
  { value: "warn", label: "Warn", intent: "warning" },
  { value: "error", label: "Error", intent: "danger" },
];

export const CURRENCY: readonly EnumOption[] = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "INR", label: "INR" },
];
