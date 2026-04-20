import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  baselineFixture,
  datasetFixture,
  getCurrentEvalSummary,
  listEvalRuns,
  runEvalDatasetScenario,
  compareEvalRunScenario
} from "../../src/services/main.service";

describe("ai-evals services", () => {
  let stateDir = "";
  const previousStateDir = process.env.GUTU_STATE_DIR;

  beforeEach(() => {
    stateDir = mkdtempSync(join(tmpdir(), "gutu-ai-evals-state-"));
    process.env.GUTU_STATE_DIR = stateDir;
  });

  afterEach(() => {
    rmSync(stateDir, { recursive: true, force: true });
    if (previousStateDir === undefined) {
      delete process.env.GUTU_STATE_DIR;
      return;
    }
    process.env.GUTU_STATE_DIR = previousStateDir;
  });

  it("persists new candidate eval runs and makes them the latest summary", () => {
    const run = runEvalDatasetScenario({
      tenantId: "tenant-platform",
      datasetId: datasetFixture.id,
      candidateLabel: "nightly"
    });

    expect(run.runId).toContain("nightly");
    expect(listEvalRuns()[0]?.id).toBe(run.runId);
    expect(getCurrentEvalSummary().candidate.id).toBe(run.runId);
  });

  it("compares persisted runs against stored baselines", () => {
    const run = runEvalDatasetScenario({
      tenantId: "tenant-platform",
      datasetId: datasetFixture.id,
      candidateLabel: "release-candidate"
    });

    const comparison = compareEvalRunScenario({
      tenantId: "tenant-platform",
      baselineId: baselineFixture.id,
      candidateRunId: run.runId
    });

    expect(comparison.ok).toBe(true);
    expect(comparison.passed).toBe(true);
    expect(comparison.reasons).toEqual([]);
  });
});
