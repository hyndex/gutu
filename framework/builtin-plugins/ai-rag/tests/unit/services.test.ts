import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ingestMemoryDocument,
  listMemoryCollections,
  listMemoryDocuments,
  reindexMemoryCollection,
  retrieveTenantKnowledge
} from "../../src/services/main.service";

describe("ai-rag services", () => {
  let stateDir = "";
  const previousStateDir = process.env.GUTU_STATE_DIR;

  beforeEach(() => {
    stateDir = mkdtempSync(join(tmpdir(), "gutu-ai-rag-state-"));
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

  it("persists ingested documents and updates collection counts", () => {
    const ingested = ingestMemoryDocument({
      tenantId: "tenant-platform",
      collectionId: "memory-collection:ops",
      title: "Approval recovery playbook",
      body: "Recovery playbook for approval queues and escalation checkpoints.",
      sourceObjectId: "ops-approval-recovery",
      sourceKind: "operator-note",
      classification: "internal"
    });

    expect(ingested.chunkCount).toBeGreaterThan(0);
    expect(listMemoryDocuments()[0]?.sourceObjectId).toBe("ops-approval-recovery");
    expect(listMemoryCollections().find((collection) => collection.id === "memory-collection:ops")?.metadata?.documentCount).toBe(3);
  });

  it("retrieves citations from persisted state and tracks reindex requests", () => {
    ingestMemoryDocument({
      tenantId: "tenant-platform",
      collectionId: "memory-collection:ops",
      title: "Retrieval guidance",
      body: "Use retrieval diagnostics and approval checkpoints during incident review.",
      sourceObjectId: "retrieval-guidance",
      sourceKind: "operator-note",
      classification: "internal"
    });

    const retrieval = retrieveTenantKnowledge({
      tenantId: "tenant-platform",
      query: "retrieval diagnostics approval checkpoints",
      collectionIds: ["memory-collection:ops"]
    });
    const reindex = reindexMemoryCollection({
      tenantId: "tenant-platform",
      collectionId: "memory-collection:ops"
    });

    expect(retrieval.citationCount).toBeGreaterThan(0);
    expect(retrieval.chunkIds.length).toBeGreaterThan(0);
    expect(reindex.queuedDocuments).toBeGreaterThanOrEqual(3);
  });
});
