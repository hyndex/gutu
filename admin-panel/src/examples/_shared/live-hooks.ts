import { useAllRecords, useList } from "@/runtime/hooks";

/** Hooks for resources that back the formerly-hardcoded custom pages. */

export interface BookingKpi {
  id: string;
  today: number;
  yesterday: number;
  week: number;
  weekPrev: number;
  monthRevenue: number;
  monthRevenuePrev: number;
  cancellations: number;
  cancellationRate: number;
}
export interface HrHeadcount {
  id: string;
  month: string;
  netHires: number;
  total: number;
  byDepartment: { department: string; count: number }[];
}
export interface TreasurySnapshot {
  id: string;
  month: string;
  totalUsd: number;
  byAccount: { account: string; amount: number }[];
}
export interface InventoryAlert {
  id: string;
  sku: string;
  name: string;
  onHand: number;
  reorderPoint: number;
  daysToStockout: number;
  trend: number[];
  severity: "low" | "medium" | "high";
}
export interface PosShift {
  id: string;
  terminal: string;
  openedAt: string;
  closedAt: string;
  sales: number;
  transactions: number;
  refunds: number;
  operator: string;
  byHour: { hour: number; sales: number }[];
  paymentMix: { method: string; amount: number }[];
}
export interface AutomationStep {
  id: string;
  runId: string;
  order: number;
  step: string;
  durationMs: number;
  ok: boolean;
}
export interface AiEvalCase {
  id: string;
  runId: string;
  name: string;
  category: string;
  pass: boolean;
  latencyMs: number;
}
export interface AnalyticsCohort {
  id: string;
  cohort: string;
  sizeOnDayZero: number;
  monthly: { monthOffset: number; retentionPct: number }[];
}
export interface AnalyticsArr {
  id: string;
  series: { x: string; y: number }[];
  latest: number;
  yoyPct: number;
}
export interface AnalyticsRevenueMix {
  id: string;
  segment: string;
  value: number;
}
export interface PlatformNotification {
  id: string;
  title: string;
  intent: "info" | "success" | "warning" | "danger" | "accent";
  read: boolean;
  createdAt: string;
  recipient: string;
}
export interface SearchIndex {
  id: string;
  label: string;
  kind: string;
  path: string;
}
export interface OnboardingStep {
  id: string;
  order: number;
  title: string;
  description: string;
  done: boolean;
}
export interface Release {
  id: string;
  version: string;
  releasedAt: string;
  entries: { kind: string; text: string }[];
}
export interface IntegrationPing {
  id: string;
  connector: string;
  status: "ok" | "warning" | "down";
  latencyMs: number;
  pingedAt: string;
}

export const useBookingKpi = () => useAllRecords<BookingKpi>("booking.kpi");
export const useHrHeadcount = () => useAllRecords<HrHeadcount>("hr.headcount");
export const useTreasurySnapshots = () =>
  useAllRecords<TreasurySnapshot>("treasury.snapshot");
export const useInventoryAlerts = () =>
  useAllRecords<InventoryAlert>("inventory.alert");
export const usePosShifts = () => useAllRecords<PosShift>("pos.shift");
export const useAutomationSteps = () =>
  useAllRecords<AutomationStep>("automation.step");
export const useAiEvalCases = () => useAllRecords<AiEvalCase>("ai-evals.case");
export const useAnalyticsCohorts = () =>
  useAllRecords<AnalyticsCohort>("analytics.cohort");
export const useAnalyticsArr = () => useAllRecords<AnalyticsArr>("analytics.arr");
export const useAnalyticsRevenueMix = () =>
  useAllRecords<AnalyticsRevenueMix>("analytics.revenue-mix");
export const usePlatformNotifications = () =>
  useAllRecords<PlatformNotification>("platform.notification");
export const useSearchIndex = () =>
  useAllRecords<SearchIndex>("platform.search-index");
export const useOnboardingSteps = () =>
  useAllRecords<OnboardingStep>("platform.onboarding-step");
export const useReleases = () => useAllRecords<Release>("platform.release");
export const useIntegrationPings = () =>
  useAllRecords<IntegrationPing>("integration.ping");

/** List with a default pageSize override. Used by pages that still want
 *  paginated semantics. */
export { useList };
