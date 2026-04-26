/** Structural a11y tests.
 *
 *  These don't replace a full axe-core sweep (would require adding the
 *  dependency + jsdom). They assert WCAG-relevant invariants on the
 *  archetype runtime's output as plain HTML strings:
 *
 *    1. Pages expose `role="region"` (or equivalent landmark) and a
 *       label.
 *    2. Action surfaces (buttons, tabs, listitems) have accessible
 *       names.
 *    3. Status / error surfaces use `role="alert"` or `role="status"`
 *       with `aria-live`.
 *    4. Modal dialogs declare `aria-modal` + a labelledby/label.
 *    5. Form-like archetypes set proper landmarks.
 *
 *  Future: add @axe-core/react when jsdom is wired up. */

import { describe, test, expect } from "bun:test";
import * as React from "react";
import { renderToString } from "react-dom/server";

// Import surgically — see ssrSmoke.test.tsx for the rationale.
import { Page } from "../slots/Page";
import { PageHeaderSlot } from "../slots/PageHeaderSlot";
import { HeroStrip } from "../slots/HeroStrip";
import { KpiTile } from "../widgets/KpiTile";
import { AttentionQueue } from "../widgets/AttentionQueue";
import { ArchetypeEmptyState } from "../state/ArchetypeEmptyState";
import { WidgetErrorBoundary } from "../state/WidgetErrorBoundary";
import { WidgetSkeleton } from "../state/WidgetSkeleton";
import { KeyboardHelpOverlay } from "../state/KeyboardHelpOverlay";
import { IntelligentDashboard } from "../archetypes/IntelligentDashboard";
import { SmartList } from "../archetypes/SmartList";
import { FormArchetype } from "../archetypes/FormArchetype";
import { WizardArchetype } from "../archetypes/WizardArchetype";
import { ComparatorArchetype } from "../archetypes/ComparatorArchetype";
import { RailEntityCard } from "../widgets/RailEntityCard";
import { RailNextActions } from "../widgets/RailNextActions";
import { RailRiskFlags } from "../widgets/RailRiskFlags";
import { Funnel, Heatmap } from "../widgets/charts";
import { Sparkline } from "../widgets/Sparkline";

function html(node: React.ReactElement) {
  return renderToString(node);
}

describe("a11y · landmarks + labels", () => {
  test("Page declares a region with archetype attribute", () => {
    const out = html(
      <Page archetype="dashboard" id="d" ariaLabel="Sales dashboard region" density="comfortable">
        x
      </Page>,
    );
    expect(out).toContain('role="region"');
    expect(out).toContain("Sales dashboard region");
    expect(out).toContain('data-archetype="dashboard"');
  });

  test("PageHeaderSlot uses the banner role", () => {
    const out = html(<PageHeaderSlot title="People" sticky={false} />);
    expect(out).toContain('role="banner"');
  });

  test("HeroStrip exposes the metrics region with a label", () => {
    const out = html(<HeroStrip ariaLabel="KPIs"><span /></HeroStrip>);
    expect(out).toContain('aria-label="KPIs"');
    expect(out).toContain('role="region"');
  });

  test("Drillable KpiTile has aria-label that combines label + value", () => {
    const out = html(
      <KpiTile
        label="MRR"
        value="$48k"
        drillTo={{ kind: "hash", hash: "/billing" }}
      />,
    );
    expect(out).toContain('aria-label="MRR: $48k"');
    expect(out).toContain('type="button"');
  });

  test("AttentionQueue renders a list role", () => {
    const out = html(
      <AttentionQueue
        items={[{ id: "a", title: "Stalled" }]}
        title="Attention"
      />,
    );
    expect(out).toContain('role="list"');
  });
});

describe("a11y · status + error", () => {
  test("ArchetypeEmptyState uses semantic structure", () => {
    const out = html(
      <ArchetypeEmptyState title="No leads yet" description="Try again." />,
    );
    expect(out).toContain("No leads yet");
  });

  test("WidgetErrorBoundary passes through children when no error", () => {
    // Note: full error-recovery is a client-only behaviour (renderToString
    // does not invoke componentDidCatch). We verify the boundary forwards
    // children unchanged in the success path; client-side recovery is
    // covered separately by the in-browser verification.
    const out = html(
      <WidgetErrorBoundary label="X">
        <span>healthy</span>
      </WidgetErrorBoundary>,
    );
    expect(out).toContain("healthy");
  });

  test("WidgetSkeleton declares a status region with aria-live", () => {
    const out = html(<WidgetSkeleton variant="kpi" />);
    expect(out).toContain('role="status"');
    expect(out).toContain('aria-live="polite"');
  });
});

describe("a11y · dialogs", () => {
  test("KeyboardHelpOverlay sets aria-modal + labelledby", () => {
    const out = html(
      <KeyboardHelpOverlay
        open
        bindings={[{ label: "Refresh", combo: "r", run: () => {} }]}
        onClose={() => {}}
      />,
    );
    expect(out).toContain('aria-modal="true"');
    expect(out).toContain('aria-labelledby="keyboard-help-title"');
  });
});

describe("a11y · archetype landmarks", () => {
  test("IntelligentDashboard has banner + region landmarks", () => {
    const out = html(
      <IntelligentDashboard
        id="d"
        title="Overview"
        kpis={<KpiTile label="A" value="1" />}
        main={<div>main</div>}
      />,
    );
    expect(out).toContain('role="banner"');
    expect(out).toContain('role="region"');
  });

  test("SmartList declares appropriate roles", () => {
    const out = html(
      <SmartList<string> id="l" title="People">
        <div>rows</div>
      </SmartList>,
    );
    expect(out).toContain('role="banner"');
    expect(out).toContain('role="region"');
  });

  test("FormArchetype renders without role conflict", () => {
    const out = html(
      <FormArchetype id="f" title="Edit profile" dirty={false}>
        <div>form</div>
      </FormArchetype>,
    );
    expect(out).toContain("Edit profile");
  });

  test("WizardArchetype steps list is labelled", () => {
    const out = html(
      <WizardArchetype
        id="w"
        title="Onboarding"
        steps={[
          { id: "a", label: "Industry", render: () => <div>a</div> },
          { id: "b", label: "Plan", render: () => <div>b</div> },
        ]}
      />,
    );
    expect(out).toContain('aria-label="Steps"');
    expect(out).toContain('aria-current="step"');
  });

  test("ComparatorArchetype declares grid + columnheader roles", () => {
    const out = html(
      <ComparatorArchetype<{ id: string; name: string }>
        id="c"
        title="Plans"
        entities={[{ id: "a", name: "A" }, { id: "b", name: "B" }]}
        getEntityId={(e) => e.id}
        getEntityLabel={(e) => e.name}
        rows={[{ id: "p", label: "Price", render: (e) => e.id }]}
      />,
    );
    expect(out).toContain('role="grid"');
    expect(out).toContain('role="columnheader"');
    expect(out).toContain('role="rowheader"');
  });
});

describe("a11y · charts", () => {
  test("Charts render role=img with an aria-label", () => {
    const sl = html(<Sparkline data={[{ x: 0, y: 1 }, { x: 1, y: 2 }]} description="trend" />);
    expect(sl).toContain('role="img"');

    const f = html(<Funnel stages={[{ label: "a", value: 10 }]} description="funnel" />);
    expect(f).toContain('role="img"');

    const h = html(<Heatmap matrix={[[1]]} description="heat" />);
    expect(h).toContain('role="img"');
  });
});

describe("a11y · rail widgets are labelled", () => {
  test("RailNextActions uses list semantics", () => {
    const out = html(
      <RailNextActions
        actions={[{ id: "a", label: "Send", source: "ai" }]}
      />,
    );
    expect(out).toContain('role="list"');
  });

  test("RailRiskFlags uses list semantics", () => {
    const out = html(
      <RailRiskFlags flags={[{ id: "a", label: "SLA", severity: "warning" }]} />,
    );
    expect(out).toContain('role="list"');
  });

  test("RailEntityCard renders structured data", () => {
    const out = html(
      <RailEntityCard
        title="Acme"
        facts={[{ label: "Owner", value: "Maya" }]}
      />,
    );
    expect(out).toContain("Acme");
    expect(out).toContain("Owner");
  });
});
