import { useAllRecords } from "@/runtime/hooks";

export interface SalesRep {
  id: string;
  name: string;
  email: string;
  territory: string;
  quotaQuarter: number;
  active: boolean;
}
export interface DealLineItem {
  id: string;
  dealId: string;
  name: string;
  kind: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
export interface DealEvent {
  id: string;
  dealId: string;
  stage: string;
  probability: number;
  occurredAt: string;
}
export interface CrmNote {
  id: string;
  contactId: string;
  author: string;
  body: string;
  createdAt: string;
}
export interface PlatformConfig {
  id: string;
  key: string;
  value: Record<string, unknown>;
}
export interface LostReason {
  id: string;
  reason: string;
  count: number;
}
export interface StageVelocity {
  id: string;
  stage: string;
  avgDays: number;
}

export function useSalesReps() {
  return useAllRecords<SalesRep>("sales.rep");
}
export function useDealLineItems() {
  return useAllRecords<DealLineItem>("sales.deal-line-item");
}
export function useDealEvents() {
  return useAllRecords<DealEvent>("sales.deal-event");
}
export function useCrmNotes() {
  return useAllRecords<CrmNote>("crm.note");
}
export function usePlatformConfig(key: string) {
  const { data, loading } = useAllRecords<PlatformConfig>("platform.config");
  const row = data.find((d) => d.key === key);
  return { value: row?.value, loading };
}
export function useLostReasons() {
  return useAllRecords<LostReason>("sales.lost-reason");
}
export function useStageVelocity() {
  return useAllRecords<StageVelocity>("sales.stage-velocity");
}
