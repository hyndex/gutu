import {
  chunkMemoryDocument,
  defineMemoryCollection,
  defineMemoryDocument,
  defineMemoryPolicy,
  retrieveMemory,
  type MemoryCollection,
  type MemoryDocument
} from "@platform/ai-memory";
import { loadJsonState, updateJsonState } from "@platform/ai-runtime";
import { normalizeActionInput } from "@platform/schema";

export type IngestMemoryDocumentInput = {
  tenantId: string;
  collectionId: string;
  title: string;
  body: string;
  sourceObjectId: string;
  sourceKind: string;
  classification: "public" | "internal" | "restricted" | "confidential";
};

export type RetrievalRequestInput = {
  tenantId: string;
  query: string;
  collectionIds?: string[] | undefined;
  topK?: number | undefined;
};

export type ReindexMemoryCollectionInput = {
  tenantId: string;
  collectionId: string;
};

export const memoryCollectionsFixture = Object.freeze([
  defineMemoryCollection({
    id: "memory-collection:ops",
    label: "Ops Playbooks",
    policyScope: "tenant",
    sourcePlugin: "knowledge-core",
    tenantId: "tenant-platform",
    classification: "internal",
    metadata: {
      documentCount: 2
    }
  }),
  defineMemoryCollection({
    id: "memory-collection:kb",
    label: "Support Knowledge",
    policyScope: "tenant",
    sourcePlugin: "knowledge-core",
    tenantId: "tenant-platform",
    classification: "restricted",
    metadata: {
      documentCount: 1
    }
  })
]);

export const documentFixtures = Object.freeze([
  defineMemoryDocument({
    id: "memory-document:ops-handoff",
    collectionId: "memory-collection:ops",
    sourcePlugin: "knowledge-core",
    sourceObjectId: "article:ops-handoff",
    sourceKind: "knowledge-article",
    title: "Shift handoff checklist",
    body: "Confirm open incidents, verify export backlog, and review approvals before ending the shift.",
    tenantId: "tenant-platform",
    classification: "internal",
    createdAt: "2026-04-18T08:00:00.000Z",
    updatedAt: "2026-04-18T08:30:00.000Z",
    tags: ["ops", "handoff"]
  }),
  defineMemoryDocument({
    id: "memory-document:finance-escalations",
    collectionId: "memory-collection:kb",
    sourcePlugin: "knowledge-core",
    sourceObjectId: "article:finance-escalations",
    sourceKind: "knowledge-article",
    title: "Finance escalation policy",
    body: "Finance exception approvals require a human checkpoint, an audit reason, and replay-safe prompt metadata.",
    tenantId: "tenant-platform",
    classification: "restricted",
    createdAt: "2026-04-17T11:00:00.000Z",
    updatedAt: "2026-04-18T10:45:00.000Z",
    tags: ["finance", "approvals"]
  }),
  defineMemoryDocument({
    id: "memory-document:retrieval-debugging",
    collectionId: "memory-collection:ops",
    sourcePlugin: "ai-rag",
    sourceObjectId: "diagnostic:retrieval-debugging",
    sourceKind: "diagnostic-note",
    title: "Retrieval diagnostics",
    body: "Inspect freshness windows, source classifications, and citation minimums when a run produces weak grounding.",
    tenantId: "tenant-platform",
    classification: "internal",
    createdAt: "2026-04-18T07:00:00.000Z",
    updatedAt: "2026-04-18T09:20:00.000Z",
    tags: ["retrieval", "diagnostics"]
  })
]);

export const chunkFixtures = Object.freeze(
  documentFixtures.flatMap((document) => chunkMemoryDocument(document, { chunkSize: 18, overlap: 4 }))
);

export const retrievalFixture = Object.freeze(
  retrieveMemory({
    collections: [...memoryCollectionsFixture],
    documents: [...documentFixtures],
    chunks: [...chunkFixtures],
    query: {
      tenantId: "tenant-platform",
      text: "finance approval replay metadata",
      collectionIds: ["memory-collection:kb", "memory-collection:ops"],
      topK: 3,
      policy: defineMemoryPolicy({
        tenantScoped: true,
        requiredCitationCount: 1,
        allowedClassifications: ["internal", "restricted"],
        allowedSourceKinds: ["knowledge-article", "diagnostic-note"]
      }),
      now: "2026-04-18T12:00:00.000Z"
    }
  })
);

const aiRagStateFile = "ai-memory-rag.json";

type ReindexRequest = {
  id: string;
  tenantId: string;
  collectionId: string;
  requestedAt: string;
  queuedDocuments: number;
};

type AiRagState = {
  collections: MemoryCollection[];
  documents: MemoryDocument[];
  reindexRequests: ReindexRequest[];
};

function seedAiRagState(): AiRagState {
  return normalizeAiRagState({
    collections: [...memoryCollectionsFixture],
    documents: [...documentFixtures],
    reindexRequests: []
  });
}

function loadAiRagState(): AiRagState {
  return normalizeAiRagState(loadJsonState(aiRagStateFile, seedAiRagState));
}

function persistAiRagState(updater: (state: AiRagState) => AiRagState): AiRagState {
  return normalizeAiRagState(updateJsonState(aiRagStateFile, seedAiRagState, updater));
}

export function listMemoryCollections(): MemoryCollection[] {
  return loadAiRagState().collections.sort((left, right) => left.label.localeCompare(right.label));
}

export function listMemoryDocuments(): MemoryDocument[] {
  return loadAiRagState().documents.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function ingestMemoryDocument(input: IngestMemoryDocumentInput): {
  ok: true;
  chunkCount: number;
  collectionId: string;
} {
  normalizeActionInput(input);
  const createdAt = new Date().toISOString();
  const document = defineMemoryDocument({
    id: `memory-document:${input.sourceObjectId}`,
    collectionId: input.collectionId,
    sourcePlugin: "ai-rag",
    sourceObjectId: input.sourceObjectId,
    sourceKind: input.sourceKind,
    title: input.title,
    body: input.body,
    tenantId: input.tenantId,
    classification: input.classification,
    createdAt,
    updatedAt: createdAt
  });

  const chunks = buildRuntimeChunks([document]);

  persistAiRagState((state) => {
    if (!state.collections.some((collection) => collection.id === input.collectionId)) {
      throw new Error(`Unknown memory collection '${input.collectionId}'.`);
    }

    return {
      ...state,
      documents: [document, ...state.documents.filter((entry) => entry.id !== document.id)]
    };
  });

  return {
    ok: true,
    chunkCount: chunks.length,
    collectionId: input.collectionId
  };
}

export function retrieveTenantKnowledge(input: RetrievalRequestInput): {
  ok: true;
  citationCount: number;
  chunkIds: string[];
} {
  normalizeActionInput(input);
  const state = loadAiRagState();
  const retrieval = retrieveMemory({
    collections: [...state.collections],
    documents: [...state.documents],
    chunks: buildRuntimeChunks(state.documents),
    query: {
      tenantId: input.tenantId,
      text: input.query,
      collectionIds: input.collectionIds,
      topK: input.topK ?? 3,
      policy: defineMemoryPolicy({
        tenantScoped: true,
        requiredCitationCount: 1,
        allowedClassifications: ["internal", "restricted"],
        allowedSourceKinds: ["knowledge-article", "diagnostic-note"]
      }),
      now: "2026-04-18T12:00:00.000Z"
    }
  });

  return {
    ok: true,
    citationCount: retrieval.citations.length,
    chunkIds: retrieval.chunks.map((chunk) => chunk.id)
  };
}

export function reindexMemoryCollection(input: ReindexMemoryCollectionInput): {
  ok: true;
  queuedDocuments: number;
} {
  normalizeActionInput(input);
  const nextState = persistAiRagState((state) => {
    if (!state.collections.some((collection) => collection.id === input.collectionId)) {
      throw new Error(`Unknown memory collection '${input.collectionId}'.`);
    }

    const queuedDocuments = state.documents.filter((document) => document.collectionId === input.collectionId).length;
    return {
      ...state,
      reindexRequests: [
        {
          id: `reindex:${input.collectionId}:${state.reindexRequests.length + 1}`,
          tenantId: input.tenantId,
          collectionId: input.collectionId,
          requestedAt: new Date().toISOString(),
          queuedDocuments
        },
        ...state.reindexRequests
      ]
    };
  });

  return {
    ok: true,
    queuedDocuments: nextState.documents.filter((document) => document.collectionId === input.collectionId).length
  };
}

function buildRuntimeChunks(documents: MemoryDocument[]) {
  return documents.flatMap((document) => chunkMemoryDocument(document, { chunkSize: 18, overlap: 4 }));
}

function normalizeAiRagState(state: AiRagState): AiRagState {
  const documentCountByCollection = new Map<string, number>();
  for (const document of state.documents) {
    documentCountByCollection.set(document.collectionId, (documentCountByCollection.get(document.collectionId) ?? 0) + 1);
  }

  return {
    collections: state.collections.map((collection) =>
      defineMemoryCollection({
        ...collection,
        metadata: {
          ...(collection.metadata ?? {}),
          documentCount: documentCountByCollection.get(collection.id) ?? 0
        }
      })
    ),
    documents: state.documents.map((document) => defineMemoryDocument(document)),
    reindexRequests: [...state.reindexRequests]
  };
}
