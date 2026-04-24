import { useAllRecords } from "@/runtime/hooks";
import type {
  ActivityItem,
  CommunityPost,
  ModerationItem,
  CommunitySpace,
  Contact,
  Deal,
  Quote,
  RelationshipEdge,
  RelationshipEntity,
} from "./data";

/** One hook per resource so rich pages pull live rows straight from the API.
 *  Backed by the query cache — multiple components calling the same hook dedupe.
 *  Each hook returns `{ data, loading }`: pages render empty-shell UI while
 *  data is in flight, and re-render automatically when the cache updates. */

export function useContacts() {
  return useAllRecords<Contact>("crm.contact");
}
export function useActivities() {
  return useAllRecords<ActivityItem>("crm.activity");
}
export function useDeals() {
  return useAllRecords<Deal>("sales.deal");
}
export function useQuotes() {
  return useAllRecords<Quote>("sales.quote");
}
export function useSpaces() {
  return useAllRecords<CommunitySpace & { color?: string }>("community.space");
}
export function usePosts() {
  return useAllRecords<CommunityPost>("community.post");
}
export function useReports() {
  return useAllRecords<ModerationItem>("community.report");
}
export function useEntities() {
  return useAllRecords<RelationshipEntity>("party-relationships.entity");
}
export function useEdges() {
  return useAllRecords<RelationshipEdge>("party-relationships.relationship");
}
