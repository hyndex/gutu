import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

import {
  baselineFixture,
  candidateEvalRunFixture,
  regressionGateFixture,
  regressionGateResultFixture
} from "../../framework/builtin-plugins/ai-evals/src/index.ts";
import { rootDir } from "./workspace-utils.mjs";

const outputDir = path.join(rootDir, "artifacts", "quality");
mkdirSync(outputDir, { recursive: true });

const summary = {
  generatedAt: new Date().toISOString(),
  datasetId: regressionGateFixture.datasetId,
  baselineRunId: baselineFixture.id,
  candidateRunId: candidateEvalRunFixture.id,
  passed: regressionGateResultFixture.passed,
  reasons: regressionGateResultFixture.reasons,
  baseline: {
    passRate: baselineFixture.passRate,
    averageScore: baselineFixture.averageScore,
    citationRate: baselineFixture.citationRate
  },
  candidate: {
    passRate: candidateEvalRunFixture.passRate,
    averageScore: candidateEvalRunFixture.averageScore,
    citationRate: candidateEvalRunFixture.citationRate
  }
};

writeFileSync(path.join(outputDir, "eval-gate.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

if (!regressionGateResultFixture.passed) {
  console.error("Eval threshold gate failed.");
  for (const reason of regressionGateResultFixture.reasons) {
    console.error(`- ${reason}`);
  }
  process.exit(1);
}

console.log("Eval threshold gate passed.");
