import { z } from "zod";
import { definePlugin, defineResource } from "@/builders";
import {
  communityFeedView,
  communityModerationView,
  communitySpaceDetailView,
  communitySpacesView,
} from "./community-pages";
import { POSTS, SPACES, MODERATION } from "./data";
import {
  communityControlRoomView,
  communityReportsIndexView,
  communityReportsDetailView,
} from "./community-dashboard";

const PostSchema = z.object({
  id: z.string(),
  author: z.string(),
  space: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  replies: z.number(),
  likes: z.number(),
});
const postResource = defineResource({
  id: "community.post",
  singular: "Post",
  plural: "Posts",
  schema: PostSchema,
  displayField: "title",
  searchable: ["title", "body", "author", "space"],
  icon: "MessageCircle",
});
(postResource as unknown as { __seed: Record<string, unknown>[] }).__seed =
  POSTS as unknown as Record<string, unknown>[];

const SpaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  description: z.string(),
  members: z.number(),
  posts: z.number(),
  visibility: z.enum(["public", "private"]),
  lastActive: z.string(),
});
const spaceResource = defineResource({
  id: "community.space",
  singular: "Space",
  plural: "Spaces",
  schema: SpaceSchema,
  displayField: "name",
  searchable: ["name", "handle", "description"],
  icon: "Hash",
});
(spaceResource as unknown as { __seed: Record<string, unknown>[] }).__seed = SPACES.map(
  ({ color: _c, ...rest }) => rest,
);

const ReportSchema = z.object({
  id: z.string(),
  reportedBy: z.string(),
  target: z.string(),
  reason: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  reportedAt: z.string(),
  status: z.enum(["open", "actioned", "dismissed"]),
});
const reportResource = defineResource({
  id: "community.report",
  singular: "Report",
  plural: "Reports",
  schema: ReportSchema,
  displayField: "target",
  icon: "AlertTriangle",
});
(reportResource as unknown as { __seed: Record<string, unknown>[] }).__seed =
  MODERATION as unknown as Record<string, unknown>[];

export const communityPlugin = definePlugin({
  id: "community",
  label: "Community",
  icon: "MessageCircle",
  description: "Social feed, spaces, and moderation queue.",
  version: "0.2.0",
  admin: {
    navSections: [{ id: "sales", label: "Sales & CRM", order: 10 }],
    nav: [
      { id: "community.control-room", label: "Control Room", icon: "LayoutDashboard", path: "/community/control-room", view: "community.control-room.view", section: "sales", order: 39 },
      { id: "community.feed", label: "Feed", icon: "MessageCircle", path: "/community/feed", view: "community.feed.view", section: "sales", order: 40 },
      { id: "community.spaces", label: "Spaces", icon: "Hash", path: "/community/spaces", view: "community.spaces.view", section: "sales", order: 41 },
      { id: "community.moderation", label: "Moderation", icon: "ShieldAlert", path: "/community/moderation", view: "community.moderation.view", section: "sales", order: 42 },
      { id: "community.reports", label: "Reports", icon: "BarChart3", path: "/community/reports", view: "community.reports.view", section: "sales", order: 43 },
    ],
    resources: [postResource, spaceResource, reportResource],
    views: [
      communityFeedView,
      communitySpacesView,
      communitySpaceDetailView,
      communityModerationView,
      communityControlRoomView,
      communityReportsIndexView,
      communityReportsDetailView,
    ],
    commands: [
      { id: "community.go.control-room", label: "Community: Control Room", icon: "LayoutDashboard", run: () => { window.location.hash = "/community/control-room"; } },
      { id: "community.go.feed", label: "Community: Feed", icon: "MessageCircle", run: () => { window.location.hash = "/community/feed"; } },
      { id: "community.go.spaces", label: "Community: Spaces", icon: "Hash", run: () => { window.location.hash = "/community/spaces"; } },
      { id: "community.go.mod", label: "Community: Moderation", icon: "ShieldAlert", run: () => { window.location.hash = "/community/moderation"; } },
      { id: "community.go.reports", label: "Community: Reports", icon: "BarChart3", run: () => { window.location.hash = "/community/reports"; } },
    ],
  },
});
