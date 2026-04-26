/** SSR smoke tests for the archetype runtime.
 *
 *  These don't validate hydration parity (would need a DOM diff against
 *  client render); they assert that the runtime doesn't crash when the
 *  components are rendered in a Node-only environment, which is the
 *  baseline for SSR + edge / serverless deployment compatibility.
 *
 *  Each test renders a representative archetype to a string. Failures
 *  surface as thrown errors from inside React (e.g., a hook calling
 *  `window` without a guard). */

import { describe, test, expect } from "bun:test";
import * as React from "react";
import { renderToString } from "react-dom/server";

// We import surgically (not from the barrel) so this test's module
// graph does not pull in widgets that depend on @dnd-kit, which uses
// `.d.ts`-only re-exports that Bun's test loader can't resolve.
import { Page } from "../slots/Page";
import { PageHeaderSlot } from "../slots/PageHeaderSlot";
import { HeroStrip } from "../slots/HeroStrip";
import { MainCanvas } from "../slots/MainCanvas";
import { Rail } from "../slots/Rail";
import { KpiTile } from "../widgets/KpiTile";
import { KpiRing } from "../widgets/KpiRing";
import { AnomalyTile } from "../widgets/AnomalyTile";
import { ForecastTile } from "../widgets/ForecastTile";
import { Sparkline } from "../widgets/Sparkline";
import { AttentionQueue } from "../widgets/AttentionQueue";
import { RailEntityCard } from "../widgets/RailEntityCard";
import { RailNextActions } from "../widgets/RailNextActions";
import { RailRiskFlags } from "../widgets/RailRiskFlags";
import { RailRecordHealth } from "../widgets/RailRecordHealth";
import { RailRelatedEntities } from "../widgets/RailRelatedEntities";
import { CommandHints } from "../widgets/CommandHints";
import { OfflineChip } from "../state/OfflineChip";
import { IntelligentDashboard } from "../archetypes/IntelligentDashboard";
import { WorkspaceHub } from "../archetypes/WorkspaceHub";
import { SmartList } from "../archetypes/SmartList";
import { TimelineLog } from "../archetypes/TimelineLog";
import { FormArchetype } from "../archetypes/FormArchetype";
import { WizardArchetype } from "../archetypes/WizardArchetype";
import { ComparatorArchetype } from "../archetypes/ComparatorArchetype";
import {
  LineSeries,
  AreaSeries,
  BarSeries,
  DonutSeries,
  Heatmap,
  Funnel,
  GaugeArc,
  WaterfallSeries,
} from "../widgets/charts";
import { I18nProvider, useArchetypeI18n } from "../i18n/I18nContext";

describe("SSR smoke (renderToString)", () => {
  test("Page + slots render without window", () => {
    const html = renderToString(
      <Page archetype="dashboard" id="t" density="comfortable">
        <PageHeaderSlot title="Hello" actions={<button>x</button>} />
        <HeroStrip>
          <KpiTile label="Revenue" value="$10" />
        </HeroStrip>
        <MainCanvas>main</MainCanvas>
        <Rail>rail</Rail>
      </Page>,
    );
    expect(html).toContain('data-archetype="dashboard"');
    expect(html).toContain("Hello");
  });

  test("All KPI variants render", () => {
    const html = renderToString(
      <>
        <KpiTile label="Revenue" value="$84,000" period="30d" trend={{ deltaPct: 5 }} />
        <KpiRing label="Win" current={0.34} target={0.4} />
        <AnomalyTile
          label="Stalled"
          value={3}
          anomaly={{ score: 0.7, reason: "Avg dwell", since: "2026-01-01" }}
        />
        <ForecastTile
          label="Forecast"
          current="$92k"
          forecast={{ p10: 70, p50: 92, p90: 124, horizon: "30d" }}
        />
      </>,
    );
    expect(html).toContain("$84,000");
    expect(html).toContain("Stalled");
    expect(html).toContain("p50");
  });

  test("Charts render to non-empty SVG", () => {
    const html = renderToString(
      <>
        <Sparkline data={[{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }]} />
        <LineSeries series={[{ label: "A", series: [{ x: 0, y: 1 }, { x: 1, y: 2 }] }]} />
        <AreaSeries data={[{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 1 }]} />
        <BarSeries bars={[["q1", 10], ["q2", 14]]} />
        <DonutSeries data={[["a", 10], ["b", 5]]} />
        <Heatmap matrix={[[1, 2], [3, 4]]} />
        <Funnel stages={[{ label: "view", value: 100 }, { label: "buy", value: 5 }]} />
        <GaugeArc value={0.5} />
        <WaterfallSeries
          bars={[
            { label: "Start", value: 1000, type: "start" },
            { label: "+", value: 200 },
            { label: "Total", value: 1200, type: "total" },
          ]}
        />
      </>,
    );
    expect(html).toContain("<svg");
  });

  test("AttentionQueue + Rail widgets render with empty + non-empty data", () => {
    const html = renderToString(
      <>
        <AttentionQueue items={[]} title="Attention" />
        <AttentionQueue
          items={[{ id: "a", icon: "AlertTriangle", title: "Stale" }]}
        />
        <RailEntityCard title="Acme" subtitle="Customer" facts={[{ label: "ARR", value: "$84k" }]} />
        <RailNextActions actions={[{ id: "x", label: "Send", source: "ai" }]} />
        <RailRiskFlags flags={[{ id: "x", label: "SLA", severity: "warning" }]} />
        <RailRecordHealth score={{ score: 80, tier: "success" }} />
        <RailRelatedEntities groups={[{ label: "Deals", count: 3, summary: "$120k" }]} />
        <CommandHints hints={[{ keys: "/", label: "Search" }]} />
        <OfflineChip offline={true} />
      </>,
    );
    expect(html).toContain("Attention");
    expect(html).toContain("Acme");
    expect(html).toContain("Send");
  });

  test("IntelligentDashboard archetype renders end-to-end", () => {
    const html = renderToString(
      <IntelligentDashboard
        id="dash"
        title="Sales overview"
        subtitle="Live"
        kpis={<KpiTile label="MRR" value="$48k" />}
        main={<div>main</div>}
        rail={<RailRecordHealth score={{ score: 90, tier: "success" }} />}
      />,
    );
    expect(html).toContain('data-archetype="dashboard"');
    expect(html).toContain("Sales overview");
  });

  test("WorkspaceHub archetype renders", () => {
    const html = renderToString(
      <WorkspaceHub
        id="hub"
        title="Acme"
        tabs={<div>Tabs</div>}
        main={<div>main</div>}
      />,
    );
    expect(html).toContain('data-archetype="workspace-hub"');
    expect(html).toContain("Acme");
  });

  test("SmartList + Form/Wizard/Comparator archetypes render", () => {
    const list = renderToString(
      <SmartList<string> id="l" title="People">
        <div>rows</div>
      </SmartList>,
    );
    expect(list).toContain('data-archetype="smart-list"');

    const form = renderToString(
      <FormArchetype id="f" title="Edit" dirty={false}>
        <div>form</div>
      </FormArchetype>,
    );
    expect(form).toContain("Edit");

    const wizard = renderToString(
      <WizardArchetype
        id="w"
        title="Onboarding"
        steps={[
          { id: "a", label: "Industry", render: () => <div>a</div> },
          { id: "b", label: "Plan", render: () => <div>b</div> },
        ]}
      />,
    );
    expect(wizard).toContain("Onboarding");
    expect(wizard).toContain("Industry");

    const cmp = renderToString(
      <ComparatorArchetype<{ id: string; name: string }>
        id="c"
        title="Compare"
        entities={[{ id: "a", name: "Plan A" }]}
        getEntityId={(e) => e.id}
        getEntityLabel={(e) => e.name}
        rows={[{ id: "price", label: "Price", render: () => <span>$10</span> }]}
      />,
    );
    expect(cmp).toContain("Plan A");
    expect(cmp).toContain("Price");
  });

  test("TimelineLog renders with empty body", () => {
    const html = renderToString(
      <TimelineLog id="t" title="Audit log">
        <div>events</div>
      </TimelineLog>,
    );
    expect(html).toContain('data-archetype="timeline"');
  });

  test("I18nProvider wraps without throwing on the server", () => {
    function ProbeT() {
      const i18n = useArchetypeI18n();
      return (
        <span>
          {i18n.t("common.hello", { defaultValue: "Hello {name}", name: "World" })}
        </span>
      );
    }
    const html = renderToString(
      <I18nProvider locale="en-US">
        <ProbeT />
      </I18nProvider>,
    );
    expect(html).toContain("Hello World");
  });

  test("Component tree containing window-touching hooks does not throw on render", () => {
    // useDensity / usePrefersReducedMotion / useUrlState all read window
    // *inside* useEffect. Their initial value lazily checks for window.
    // This test fails immediately if any of them call window at the top
    // level synchronously.
    const { Page: P } = require("../slots/Page") as typeof import("../slots/Page");
    const html = renderToString(
      <P archetype="smart-list" id="ssr" density="cozy">
        <div>x</div>
      </P>,
    );
    expect(html).toContain('data-archetype="smart-list"');
  });
});
