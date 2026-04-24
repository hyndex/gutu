import { buildDomainPlugin } from "./_factory/buildDomainPlugin";
import { SECTIONS } from "./_factory/sections";
import { daysAgo, pick } from "./_factory/seeds";
import { analyticsDashboardView } from "./analytics-bi-pages";
import { buildCompactControlRoom } from "./_factory/compactDashboard";
import { buildReportLibrary } from "./_factory/reportLibraryHelper";
import type { ReportDefinition, ReportResult } from "@/contracts/widgets";

const controlRoomView = buildCompactControlRoom({
  viewId: "analytics-bi.control-room.view",
  resource: "analytics-bi.report",
  title: "Analytics & BI Control Room",
  description: "Reports, dashboards, datasets, usage.",
  kpis: [
    { label: "Reports", resource: "analytics-bi.report" },
    { label: "Dashboards", resource: "analytics-bi.dashboard" },
    { label: "Datasets", resource: "analytics-bi.dataset" },
    { label: "Saved queries", resource: "analytics-bi.query" },
  ],
  charts: [
    { label: "Reports by dataset", resource: "analytics-bi.report", chart: "bar", groupBy: "dataset" },
    { label: "Dashboards by owner", resource: "analytics-bi.dashboard", chart: "donut", groupBy: "owner" },
  ],
  shortcuts: [
    { label: "New report", icon: "Plus", href: "/analytics/reports/new" },
    { label: "New dashboard", icon: "PieChart", href: "/analytics/dashboards/new" },
    { label: "Executive", icon: "LineChart", href: "/analytics/executive" },
    { label: "Reports library", icon: "BarChart3", href: "/analytics/reports-library" },
  ],
});

async function fetchAll(r: import("@/runtime/resourceClient").ResourceClient, resource: string) {
  return (await r.list(resource, { page: 1, pageSize: 10_000 })).rows as Record<string, unknown>[];
}
const num = (v: unknown) => (typeof v === "number" ? v : 0);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);

const topReportsReport: ReportDefinition = {
  id: "top-reports", label: "Top Reports by Views",
  description: "Most-viewed reports in the last 30 days.",
  icon: "Eye", resource: "analytics-bi.report", filters: [],
  async execute({ resources }): Promise<ReportResult> {
    const reports = await fetchAll(resources, "analytics-bi.report");
    const rows = reports.map((r) => ({
      name: str(r.name),
      dataset: str(r.dataset),
      owner: str(r.owner),
      views: num(r.views),
      lastViewedAt: str(r.lastViewedAt),
    })).sort((a, b) => b.views - a.views);
    return {
      columns: [
        { field: "name", label: "Report", fieldtype: "text" },
        { field: "dataset", label: "Dataset", fieldtype: "text" },
        { field: "owner", label: "Owner", fieldtype: "text" },
        { field: "views", label: "Views", fieldtype: "number", align: "right", totaling: "sum" },
        { field: "lastViewedAt", label: "Last viewed", fieldtype: "datetime" },
      ],
      rows,
    };
  },
};

const { indexView: reportsIndex, detailView: reportsDetail } = buildReportLibrary({
  indexViewId: "analytics-bi.reports-library.view",
  detailViewId: "analytics-bi.reports-library-detail.view",
  resource: "analytics-bi.report",
  title: "Analytics Reports",
  description: "Top reports by views.",
  basePath: "/analytics/reports-library",
  reports: [topReportsReport],
});

export const analyticsBiPlugin = buildDomainPlugin({
  id: "analytics-bi",
  label: "Analytics & BI",
  icon: "BarChart3",
  section: SECTIONS.analytics,
  order: 1,
  resources: [
    {
      id: "report",
      singular: "Report",
      plural: "Reports",
      icon: "BarChart3",
      path: "/analytics/reports",
      fields: [
        { name: "name", kind: "text", required: true, sortable: true },
        { name: "description", kind: "text" },
        { name: "dataset", kind: "text", sortable: true },
        { name: "owner", kind: "text", sortable: true },
        { name: "kind", label: "Type", kind: "enum", options: [
          { value: "table", label: "Table" }, { value: "chart", label: "Chart" },
          { value: "pivot", label: "Pivot" }, { value: "sql", label: "SQL" },
        ] },
        { name: "views", kind: "number", align: "right", sortable: true },
        { name: "scheduled", kind: "boolean" },
        { name: "lastViewedAt", kind: "datetime" },
        { name: "updatedAt", kind: "datetime", sortable: true },
      ],
      seedCount: 20,
      seed: (i) => ({
        name: pick(["Weekly MRR", "Pipeline snapshot", "Ticket aging", "Inventory turns", "NPS by segment", "Cohort retention", "Churn analysis", "Revenue by region"], i),
        description: "",
        dataset: pick(["subscriptions", "sales", "support", "inventory", "community"], i),
        owner: pick(["sam@gutu.dev", "alex@gutu.dev", "taylor@gutu.dev"], i),
        kind: pick(["table", "chart", "pivot", "sql"], i),
        views: 50 + (i * 137) % 2000,
        scheduled: i % 3 === 0,
        lastViewedAt: daysAgo(i),
        updatedAt: daysAgo(i),
      }),
    },
    {
      id: "dashboard",
      singular: "BI Dashboard",
      plural: "BI Dashboards",
      icon: "PieChart",
      path: "/analytics/dashboards",
      fields: [
        { name: "name", kind: "text", required: true, sortable: true },
        { name: "owner", kind: "text", sortable: true },
        { name: "widgets", kind: "number", align: "right" },
        { name: "views", kind: "number", align: "right" },
        { name: "shared", kind: "boolean" },
        { name: "updatedAt", kind: "datetime", sortable: true },
      ],
      seedCount: 12,
      seed: (i) => ({
        name: pick(["Exec overview", "Finance", "Ops", "Product", "Customer", "Sales", "Engineering", "Marketing"], i),
        owner: pick(["sam@gutu.dev", "alex@gutu.dev", "taylor@gutu.dev"], i),
        widgets: 6 + (i % 8),
        views: 100 + (i * 73) % 500,
        shared: i % 2 === 0,
        updatedAt: daysAgo(i),
      }),
    },
    {
      id: "dataset",
      singular: "Dataset",
      plural: "Datasets",
      icon: "Database",
      path: "/analytics/datasets",
      fields: [
        { name: "name", kind: "text", required: true, sortable: true },
        { name: "source", kind: "enum", options: [
          { value: "postgres", label: "Postgres" }, { value: "bigquery", label: "BigQuery" },
          { value: "snowflake", label: "Snowflake" }, { value: "csv", label: "CSV" },
        ] },
        { name: "rowCount", kind: "number", align: "right", sortable: true },
        { name: "lastRefreshedAt", kind: "datetime" },
        { name: "refreshSchedule", kind: "text" },
      ],
      seedCount: 8,
      seed: (i) => ({
        name: pick(["subscriptions", "sales", "support", "inventory", "community", "users", "orders", "events"], i),
        source: pick(["postgres", "bigquery", "snowflake", "csv"], i),
        rowCount: 10_000 + (i * 77_337) % 5_000_000,
        lastRefreshedAt: daysAgo(i * 0.2),
        refreshSchedule: pick(["hourly", "daily", "weekly"], i),
      }),
    },
    {
      id: "query",
      singular: "Saved Query",
      plural: "Saved Queries",
      icon: "FileCode",
      path: "/analytics/queries",
      fields: [
        { name: "name", kind: "text", required: true, sortable: true },
        { name: "language", kind: "enum", options: [
          { value: "sql", label: "SQL" }, { value: "kql", label: "KQL" },
        ] },
        { name: "owner", kind: "text" },
        { name: "dataset", kind: "text" },
        { name: "runCount", kind: "number", align: "right" },
        { name: "lastRunAt", kind: "datetime" },
      ],
      seedCount: 14,
      seed: (i) => ({
        name: pick(["MRR per plan", "Top customers", "Agent response avg", "Slow reports", "Active users 7d"], i),
        language: pick(["sql", "kql"], i),
        owner: pick(["sam@gutu.dev", "alex@gutu.dev"], i),
        dataset: pick(["subscriptions", "sales", "support"], i),
        runCount: (i * 17) % 500,
        lastRunAt: daysAgo(i),
      }),
    },
  ],
  extraNav: [
    { id: "analytics-bi.control-room.nav", label: "Control Room", icon: "LayoutDashboard", path: "/analytics/control-room", view: "analytics-bi.control-room.view", order: 0 },
    { id: "analytics-bi.reports-library.nav", label: "Reports library", icon: "BarChart3", path: "/analytics/reports-library", view: "analytics-bi.reports-library.view" },
    { id: "analytics.executive.nav", label: "Executive", icon: "LineChart", path: "/analytics/executive", view: "analytics-bi.dashboard.view" },
  ],
  extraViews: [controlRoomView, reportsIndex, reportsDetail, analyticsDashboardView],
  commands: [
    { id: "analytics.go.control-room", label: "Analytics: Control Room", icon: "LayoutDashboard", run: () => { window.location.hash = "/analytics/control-room"; } },
    { id: "analytics.new-report", label: "New report", icon: "Plus", run: () => { window.location.hash = "/analytics/reports/new"; } },
    { id: "analytics.new-dashboard", label: "New dashboard", icon: "PieChart", run: () => { window.location.hash = "/analytics/dashboards/new"; } },
  ],
});
