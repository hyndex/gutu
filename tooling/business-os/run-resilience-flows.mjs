import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { businessPluginSpecs } from "./specs.mjs";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const pluginSpecById = new Map(businessPluginSpecs.map((spec) => [spec.id, spec]));
const reportRoot = join(workspaceRoot, "integrations", "gutu-ecosystem-integration", "reports");

await main();

async function main() {
  const results = [];

  for (const spec of businessPluginSpecs) {
    results.push(await runPluginResilience(spec.id));
  }

  writeReports(results);

  const failures = results.filter((entry) => !entry.ok);
  if (failures.length > 0) {
    console.error("Business resilience flows failed:");
    for (const failure of failures) {
      console.error(`- ${failure.pluginId}: ${failure.error}`);
    }
    process.exit(1);
  }

  console.log(
    `Business resilience flows passed for ${results.length} plugins: ${results.map((entry) => entry.pluginId).join(", ")}.`
  );
}

async function runPluginResilience(pluginId) {
  const stateDir = mkdtempSync(join(tmpdir(), `${pluginId}-resilience-`));
  const previousStateDir = process.env.GUTU_STATE_DIR;
  const tenantId = `tenant-${pluginId}-resilience`;
  const actorId = `actor-${pluginId}-resilience`;
  const startedAt = Date.now();

  try {
    process.env.GUTU_STATE_DIR = stateDir;
    const pluginModule = await loadPluginModule(pluginId);
    const createFlow = requireFlow(pluginModule, "create");
    const advanceFlow = requireFlow(pluginModule, "advance");
    const reconcileFlow = requireFlow(pluginModule, "reconcile");
    const recordId = `${pluginId}-resilience`;

    const createInput = buildCreateInput({ pluginId, recordId, tenantId, actorId });
    await pluginModule[createFlow.methodName](createInput);
    await pluginModule[createFlow.methodName](createInput);

    const primaryAfterCreate = (await pluginModule.listPrimaryRecords()).filter((entry) => entry.tenantId === tenantId);
    if (primaryAfterCreate.length !== 1) {
      throw new Error(`Duplicate create did not stay idempotent. Expected 1 primary record, received ${primaryAfterCreate.length}.`);
    }

    await pluginModule[advanceFlow.methodName](
      buildAdvanceInput({
        pluginId,
        recordId,
        tenantId,
        actorId,
        expectedRevisionNo: 1
      })
    );

    await assertRevisionMismatch(() =>
      pluginModule[advanceFlow.methodName](
        buildAdvanceInput({
          pluginId,
          recordId,
          tenantId,
          actorId,
          expectedRevisionNo: 1
        })
      ),
      `${pluginId}: advance revision mismatch`
    );

    const advanceRecovery = await exercisePendingRecovery({
      pluginId,
      pluginModule,
      tenantId,
      actorId,
      stage: "advance"
    });

    await assertRevisionMismatch(() =>
      pluginModule[reconcileFlow.methodName](
        buildReconcileInput({
          pluginId,
          recordId,
          tenantId,
          actorId,
          expectedRevisionNo: 1,
          exceptionId: `${recordId}-reconcile-stale`
        })
      ),
      `${pluginId}: reconcile revision mismatch`
    );

    await pluginModule[reconcileFlow.methodName](
      buildReconcileInput({
        pluginId,
        recordId,
        tenantId,
        actorId,
        expectedRevisionNo: 2,
        exceptionId: `${recordId}-reconcile`
      })
    );

    const reconcileRecovery = await exercisePendingRecovery({
      pluginId,
      pluginModule,
      tenantId,
      actorId,
      stage: "reconcile"
    });

    if (typeof pluginModule.placePrimaryRecordOnHold === "function") {
      await pluginModule.placePrimaryRecordOnHold({
        tenantId,
        actorId,
        recordId,
        expectedRevisionNo: 3,
        reasonCode: `${pluginId}:manual-hold`
      });
    }

    if (typeof pluginModule.releasePrimaryRecordHold === "function") {
      await pluginModule.releasePrimaryRecordHold({
        tenantId,
        actorId,
        recordId,
        expectedRevisionNo: 4,
        reasonCode: `${pluginId}:manual-release`
      });
    }

    if (typeof pluginModule.amendPrimaryRecord === "function") {
      await pluginModule.amendPrimaryRecord({
        tenantId,
        actorId,
        recordId,
        amendedRecordId: `${recordId}-amended`,
        expectedRevisionNo: 5,
        reasonCode: `${pluginId}:amendment`
      });
    }

    if (typeof pluginModule.reversePrimaryRecord === "function") {
      await pluginModule.reversePrimaryRecord({
        tenantId,
        actorId,
        recordId: `${recordId}-amended`,
        reversalRecordId: `${recordId}-amended-reversal`,
        expectedRevisionNo: 1,
        reasonCode: `${pluginId}:reversal`
      });
    }

    const pendingAfterLifecycle = (await pluginModule.listPendingDownstreamItems()).filter((entry) => entry.tenantId === tenantId);
    for (const pendingItem of pendingAfterLifecycle) {
      await pluginModule.resolvePendingDownstreamItem({
        tenantId,
        actorId,
        inboxId: pendingItem.id,
        resolutionRef: `${pluginId}:lifecycle:${sanitizeTarget(pendingItem.target)}`
      });
    }

    const pendingAfterRecovery = (await pluginModule.listPendingDownstreamItems()).filter((entry) => entry.tenantId === tenantId);
    if (pendingAfterRecovery.length !== 0) {
      throw new Error(`Pending downstream items remain after recovery: ${pendingAfterRecovery.length}.`);
    }

    const deadLettersAfterRecovery = (await pluginModule.listDeadLetters()).filter((entry) => entry.tenantId === tenantId);
    if (deadLettersAfterRecovery.length !== 0) {
      throw new Error(`Dead letters remain after replay and resolution: ${deadLettersAfterRecovery.length}.`);
    }

    const exceptionRecords = (await pluginModule.listExceptionRecords()).filter((entry) => entry.tenantId === tenantId);
    const openExceptions = exceptionRecords.filter((entry) => entry.status !== "closed");
    if (openExceptions.length !== 0) {
      throw new Error(`Exception records remain open after downstream recovery: ${openExceptions.length}.`);
    }

    const overview = await pluginModule.getBusinessOverview();
    if (overview.orchestration.pendingTargets.length !== 0) {
      throw new Error(`Overview still reports pending targets: ${overview.orchestration.pendingTargets.join(", ")}.`);
    }

    return {
      pluginId,
      ok: true,
      durationMs: Date.now() - startedAt,
      duplicateCreateProtected: true,
      revisionMismatchProtected: true,
      advanceRecovery,
      reconcileRecovery,
      exceptionCount: exceptionRecords.length,
      primaryRecordCount: primaryAfterCreate.length
    };
  } catch (error) {
    return {
      pluginId,
      ok: false,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    if (previousStateDir === undefined) {
      delete process.env.GUTU_STATE_DIR;
    } else {
      process.env.GUTU_STATE_DIR = previousStateDir;
    }
    rmSync(stateDir, { recursive: true, force: true });
  }
}

async function exercisePendingRecovery({ pluginId, pluginModule, tenantId, actorId, stage }) {
  const pendingBeforeFailure = (await pluginModule.listPendingDownstreamItems()).filter((entry) => entry.tenantId === tenantId);
  if (pendingBeforeFailure.length === 0) {
    return {
      stage,
      initialPendingCount: 0,
      retriedTarget: null,
      resolvedCount: 0
    };
  }

  const firstPending = pendingBeforeFailure[0];
  const retryResult = await pluginModule.failPendingDownstreamItem({
    tenantId,
    actorId,
    inboxId: firstPending.id,
    error: `${pluginId}:${stage}:transient-failure`,
    maxAttempts: 2
  });
  if (retryResult.status !== "retrying") {
    throw new Error(`${pluginId}:${stage} expected retrying status, received '${retryResult.status}'.`);
  }

  const deadLetterResult = await pluginModule.failPendingDownstreamItem({
    tenantId,
    actorId,
    inboxId: firstPending.id,
    error: `${pluginId}:${stage}:dead-letter`,
    maxAttempts: 2
  });
  if (deadLetterResult.status !== "dead-letter" || !deadLetterResult.deadLetterId) {
    throw new Error(`${pluginId}:${stage} expected dead-letter status.`);
  }

  const deadLetters = (await pluginModule.listDeadLetters()).filter((entry) => entry.tenantId === tenantId);
  const deadLetter = deadLetters.find((entry) => entry.id === deadLetterResult.deadLetterId);
  if (!deadLetter) {
    throw new Error(`${pluginId}:${stage} failed to persist dead-letter '${deadLetterResult.deadLetterId}'.`);
  }

  await pluginModule.replayDeadLetter({
    tenantId,
    actorId,
    deadLetterId: deadLetter.id
  });

  const replayedPending = (await pluginModule.listPendingDownstreamItems()).filter((entry) => entry.tenantId === tenantId);
  if (!replayedPending.some((entry) => entry.id === firstPending.id)) {
    throw new Error(`${pluginId}:${stage} did not requeue the replayed downstream item.`);
  }

  for (const pendingItem of replayedPending) {
    await pluginModule.resolvePendingDownstreamItem({
      tenantId,
      actorId,
      inboxId: pendingItem.id,
      resolutionRef: `${pluginId}:${stage}:${sanitizeTarget(pendingItem.target)}`
    });
  }

  return {
    stage,
    initialPendingCount: pendingBeforeFailure.length,
    retriedTarget: firstPending.target,
    resolvedCount: replayedPending.length
  };
}

function requireFlow(pluginModule, phase) {
  const flow = pluginModule.businessFlowDefinitions.find((entry) => entry.phase === phase);
  if (!flow) {
    throw new Error(`Missing '${phase}' flow definition.`);
  }
  if (typeof pluginModule[flow.methodName] !== "function") {
    throw new Error(`Missing flow handler '${flow.methodName}'.`);
  }
  return flow;
}

async function assertRevisionMismatch(factory, label) {
  let failed = false;
  try {
    await factory();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Revision mismatch")) {
      throw error;
    }
    failed = true;
  }

  if (!failed) {
    throw new Error(`${label} did not reject a stale revision.`);
  }
}

async function loadPluginModule(pluginId) {
  const spec = pluginSpecById.get(pluginId);
  if (!spec) {
    throw new Error(`Unknown plugin '${pluginId}'.`);
  }

  const modulePath = join(
    workspaceRoot,
    "plugins",
    spec.repoName,
    "framework",
    "builtin-plugins",
    spec.packageDir,
    "src",
    "index.ts"
  );
  return await import(`${pathToFileURL(modulePath).href}?resilience=${pluginId}:${Date.now()}`);
}

function buildCreateInput({ pluginId, recordId, tenantId, actorId }) {
  return {
    tenantId,
    actorId,
    recordId,
    title: `${pluginId} resilience create`,
    counterpartyId: `party-${pluginId}`,
    companyId: "company-primary",
    branchId: "branch-main",
    amountMinor: 100_000,
    currencyCode: "USD",
    effectiveAt: "2026-04-23T00:00:00.000Z",
    correlationId: `${pluginId}:${recordId}`,
    processId: `${pluginId}:resilience`
  };
}

function buildAdvanceInput({ pluginId, recordId, tenantId, actorId, expectedRevisionNo }) {
  return {
    tenantId,
    actorId,
    recordId,
    expectedRevisionNo,
    recordState: "active",
    approvalState: "approved",
    postingState: "unposted",
    fulfillmentState: "partial",
    downstreamRef: `${pluginId}:advance`,
    reasonCode: "resilience-advance"
  };
}

function buildReconcileInput({ pluginId, recordId, tenantId, actorId, expectedRevisionNo, exceptionId }) {
  return {
    tenantId,
    actorId,
    recordId,
    exceptionId,
    expectedRevisionNo,
    severity: "medium",
    reasonCode: "resilience-reconcile",
    downstreamRef: `${pluginId}:reconcile`
  };
}

function writeReports(results) {
  mkdirSync(reportRoot, { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    pluginCount: results.length,
    passingCount: results.filter((entry) => entry.ok).length,
    failingCount: results.filter((entry) => !entry.ok).length,
    totalDurationMs: results.reduce((total, entry) => total + entry.durationMs, 0)
  };

  writeFileSync(
    join(reportRoot, "business-os-resilience.json"),
    `${JSON.stringify({ summary, plugins: results }, null, 2)}\n`,
    "utf8"
  );
  writeFileSync(join(reportRoot, "business-os-resilience.md"), renderMarkdownReport(summary, results), "utf8");
}

function renderMarkdownReport(summary, results) {
  const lines = [
    "# Business OS Resilience Flows",
    "",
    `Generated at: ${summary.generatedAt}`,
    "",
    `- Passing plugins: ${summary.passingCount}/${summary.pluginCount}`,
    `- Aggregate duration: ${summary.totalDurationMs} ms`,
    "",
    "## Plugins",
    ""
  ];

  for (const result of results) {
    lines.push(`### ${result.pluginId}`);
    lines.push("");
    lines.push(`- Status: ${result.ok ? "passed" : "failed"}`);
    lines.push(`- Duration: ${result.durationMs} ms`);
    if (result.ok) {
      lines.push(`- Duplicate create protection: ${result.duplicateCreateProtected ? "passed" : "failed"}`);
      lines.push(`- Revision mismatch protection: ${result.revisionMismatchProtected ? "passed" : "failed"}`);
      lines.push(`- Exception records closed after recovery: ${result.exceptionCount}`);
      lines.push(
        `- Advance recovery: pending=${result.advanceRecovery.initialPendingCount}, retriedTarget=${result.advanceRecovery.retriedTarget ?? "none"}, resolved=${result.advanceRecovery.resolvedCount}`
      );
      lines.push(
        `- Reconcile recovery: pending=${result.reconcileRecovery.initialPendingCount}, retriedTarget=${result.reconcileRecovery.retriedTarget ?? "none"}, resolved=${result.reconcileRecovery.resolvedCount}`
      );
    } else {
      lines.push(`- Error: ${result.error}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function sanitizeTarget(value) {
  return value.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}
