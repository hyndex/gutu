import React from "react";

import { getCurrentEvalSummary } from "../../services/main.service";

export function EvalRegressionWidget() {
  const summary = getCurrentEvalSummary();

  return (
    <section data-plugin-widget="ai-eval-regressions" className="awb-form-card">
      <div className="awb-inline-banner">
        <strong>{summary.gate.passed ? "Regression gate passing" : "Regression gate blocked"}</strong>
        <span>
          {summary.gate.reasons.length > 0
            ? summary.gate.reasons.join("; ")
            : "Latest candidate run stays within baseline thresholds."}
        </span>
      </div>
    </section>
  );
}
