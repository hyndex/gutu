import React from "react";

import { ChartSurface, createBarChartOption } from "@platform/chart";

import { getCurrentEvalSummary } from "../../services/main.service";

export function AiEvalsAdminPage() {
  const summary = getCurrentEvalSummary();

  return (
    <section data-plugin-page="ai-evals" className="awb-surface-stack">
      <div className="awb-inline-banner">
        <strong>Eval runs and regression gates</strong>
        <span>Golden tasks, judges, citations, and release thresholds stay visible before rollout.</span>
      </div>
      <div className="awb-inline-grid awb-inline-grid-3">
        <div className="awb-mini-stat">
          <span className="awb-mini-stat-label">Dataset cases</span>
          <strong className="awb-mini-stat-value">{summary.dataset.cases.length}</strong>
        </div>
        <div className="awb-mini-stat">
          <span className="awb-mini-stat-label">Candidate pass rate</span>
          <strong className="awb-mini-stat-value">{summary.candidate.passRate}</strong>
        </div>
        <div className="awb-mini-stat">
          <span className="awb-mini-stat-label">Gate</span>
          <strong className="awb-mini-stat-value">{summary.gate.passed ? "Pass" : "Blocked"}</strong>
        </div>
      </div>
      <ChartSurface
        title="Baseline vs candidate"
        option={createBarChartOption({
          title: "Eval summary",
          labels: ["Pass rate", "Avg score", "Citation rate"],
          series: [
            {
              name: "Baseline",
              data: [summary.baseline.passRate, summary.baseline.averageScore, summary.baseline.citationRate]
            },
            {
              name: "Candidate",
              data: [
                summary.candidate.passRate,
                summary.candidate.averageScore,
                summary.candidate.citationRate
              ]
            }
          ]
        })}
      />
      <div className="awb-form-card">
        <h3 className="awb-panel-title">Regression deltas</h3>
        <dl className="awb-detail-grid">
          <div>
            <dt>Pass rate delta</dt>
            <dd>{summary.comparison.passRateDelta}</dd>
          </div>
          <div>
            <dt>Average score delta</dt>
            <dd>{summary.comparison.averageScoreDelta}</dd>
          </div>
          <div>
            <dt>Citation rate delta</dt>
            <dd>{summary.comparison.citationRateDelta}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
