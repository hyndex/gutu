export const maturityOrder = [
  "Scaffolded",
  "Baseline",
  "Hardened",
  "Production Candidate"
];

export const pluginGroupOrder = [
  "Platform Backbone",
  "Operational Data",
  "AI Systems",
  "Content and Experience"
];

export const groupDefaults = {
  "Platform Backbone": {
    nonGoals: [
      "Not a generic WordPress-style hook bus or plugin macro system.",
      "Not a product-specific UX suite beyond the exported admin or portal surfaces that ship today."
    ],
    recommendedNext: [
      "Add stronger operator-facing reconciliation and observability surfaces where runtime state matters.",
      "Promote any currently implicit cross-plugin lifecycles into explicit command, event, or job contracts when those integrations stabilize."
    ],
    laterOptional: [
      "Dedicated federation or external identity/provider adapters once the core contracts are stable."
    ]
  },
  "Operational Data": {
    nonGoals: [
      "Not a full vertical application suite; this plugin only owns the domain slice exported in this repo.",
      "Not a replacement for explicit orchestration in jobs/workflows when multi-step automation is required."
    ],
    recommendedNext: [
      "Broaden lifecycle coverage with deeper orchestration, reconciliation, and operator tooling where the business flow requires it.",
      "Add more explicit domain events or follow-up job surfaces when downstream systems need tighter coupling."
    ],
    laterOptional: [
      "Outbound connectors, richer analytics, or portal-facing experiences once the core domain contracts harden."
    ]
  },
  "AI Systems": {
    nonGoals: [
      "Not an everything-and-the-kitchen-sink provider abstraction layer.",
      "Not a substitute for explicit approval, budgeting, and audit governance in the surrounding platform."
    ],
    recommendedNext: [
      "Add deeper provider, persistence, or evaluation integrations only where the shipped control-plane contracts already prove stable.",
      "Expand operator diagnostics and release gating where the current lifecycle already exposes strong evidence paths."
    ],
    laterOptional: [
      "More connector breadth, richer evaluation libraries, and domain-specific copilots after the baseline contracts settle."
    ]
  },
  "Content and Experience": {
    nonGoals: [
      "Not a monolithic website builder or headless-CMS replacement beyond the specific content surfaces exported here.",
      "Not a generic front-end framework; UI behavior remains bounded to the plugin’s declared resources and surfaces."
    ],
    recommendedNext: [
      "Deepen publishing, review, search, or portal flows where current resources and actions already suggest the next stable step.",
      "Add richer admin and operator guidance once the domain lifecycle hardens."
    ],
    laterOptional: [
      "Advanced authoring, public delivery, and analytics extensions after the core content contracts prove stable."
    ]
  }
};

export const pluginProfiles = {
  "admin-shell-workbench": {
    group: "Platform Backbone",
    architectureRole:
      "Hosts the universal admin desk and turns resource, route, widget, and workspace contributions into one navigable operator surface.",
    focusAreas: ["admin workspaces", "route resolution", "operator preferences"],
    recommendedNext: [
      "Deepen saved-workspace, search, and operator personalization flows once more first-party plugins depend on the desk.",
      "Add stronger runtime diagnostics around missing or conflicting admin contributions."
    ],
    laterOptional: [
      "Workspace theming and tenant-aware desk presets once the contribution contracts stop moving."
    ]
  },
  "ai-core": {
    group: "AI Systems",
    architectureRole:
      "Acts as the durable control plane for agent execution, prompt governance, approval checkpoints, and replay-safe run state.",
    focusAreas: ["agent runtime", "approval queues", "replay-safe execution"],
    recommendedNext: [
      "Broaden provider adapters and richer operator diagnostics without weakening the current governance boundary.",
      "Add stronger persisted orchestration once long-running agent workflows leave the reference-runtime stage."
    ],
    laterOptional: [
      "Provider-specific optimization surfaces once the cross-provider contract has been battle-tested."
    ]
  },
  "ai-evals": {
    group: "AI Systems",
    architectureRole:
      "Owns evaluation datasets, judges, regression baselines, and the release-review evidence used to keep AI changes honest.",
    focusAreas: ["eval datasets", "release gating", "baseline regression review"],
    recommendedNext: [
      "Wire the current evaluation evidence into more release and rollout control points.",
      "Add richer judge provenance and dataset lineage as the eval corpus grows."
    ],
    laterOptional: [
      "Domain-specific judge packs and cross-environment benchmark promotion."
    ]
  },
  "ai-rag": {
    group: "AI Systems",
    architectureRole:
      "Provides tenant-safe retrieval, memory collection management, and the evidence path for grounded AI responses.",
    focusAreas: ["retrieval", "memory collections", "grounding diagnostics"],
    recommendedNext: [
      "Add more ingestion and connector breadth only after the current retrieval contracts remain stable under production load.",
      "Deepen operator visibility into collection freshness, ingestion failures, and retrieval quality."
    ],
    laterOptional: [
      "Hybrid search, reranking, and external-connector packs once the baseline retrieval pipeline stabilizes."
    ]
  },
  "audit-core": {
    group: "Platform Backbone",
    architectureRole:
      "Provides the immutable evidence spine for sensitive actions, reconciliation trails, and downstream accountability workflows.",
    focusAreas: ["audit evidence", "sensitive actions", "accountability"],
    recommendedNext: [
      "Add richer replay and export paths where external compliance workflows need them.",
      "Expose stronger operator search and correlation tooling when more packages depend on audit history."
    ]
  },
  "auth-core": {
    group: "Platform Backbone",
    architectureRole:
      "Owns canonical identity provisioning and status state so the rest of the ecosystem can treat identity as a stable domain contract.",
    focusAreas: ["identity provisioning", "provider state", "tenant-safe identities"],
    nonGoals: [
      "Not a full end-user authentication UI or recovery experience.",
      "Does not currently export a wide session-management or MFA API surface beyond the identity contract."
    ],
    recommendedNext: [
      "Expand session, revocation, and provider-lifecycle surfaces if the surrounding platform needs them.",
      "Add explicit identity lifecycle events when downstream provisioning flows depend on them."
    ]
  },
  "booking-core": {
    group: "Operational Data",
    architectureRole:
      "Implements the reservation engine for staging, confirming, and cancelling allocation windows with conflict-safe database constraints.",
    focusAreas: ["reservation staging", "hold confirmation", "slot conflict safety"],
    nonGoals: [
      "Does not currently export recurring booking, waitlist, or availability-search APIs.",
      "Does not replace downstream orchestration for approvals or billing around a reservation lifecycle."
    ],
    recommendedNext: [
      "Add richer availability search, recurrence, or waitlist flows only after the current reservation invariants stay stable.",
      "Introduce explicit downstream lifecycle events if other business systems must react automatically to booking transitions."
    ],
    laterOptional: [
      "Customer-facing booking journeys or pricing rules once the resource-allocation spine is fully settled."
    ]
  },
  "community-core": {
    group: "Content and Experience",
    architectureRole:
      "Provides the base group and membership domain used by community-facing experiences and moderation workflows.",
    focusAreas: ["groups", "memberships", "community governance"],
    recommendedNext: [
      "Add moderation, invitation, and community lifecycle depth where the current membership contract already supports it.",
      "Expose clearer integration points for notifications and portal experiences if community flows become more user-facing."
    ]
  },
  "content-core": {
    group: "Content and Experience",
    architectureRole:
      "Owns pages, posts, and content-type records so publishing and delivery workflows can share a stable content model.",
    focusAreas: ["pages", "posts", "content types"],
    recommendedNext: [
      "Deepen review and publication orchestration once content lifecycle requirements stop shifting.",
      "Add clearer search and template integration guidance where those plugin boundaries become routine."
    ]
  },
  "dashboard-core": {
    group: "Operational Data",
    architectureRole:
      "Provides the dashboard and widget backbone for operator-facing metrics, saved views, and admin summary surfaces.",
    focusAreas: ["dashboards", "widgets", "saved views"],
    recommendedNext: [
      "Expand drill-down and dashboard runtime diagnostics as more operational plugins register widgets.",
      "Add stronger cross-plugin metric contracts when dashboard composition becomes a platform-wide dependency."
    ]
  },
  "document-core": {
    group: "Content and Experience",
    architectureRole:
      "Tracks generated documents and their lifecycle so other plugins can treat document artifacts as a governed domain object.",
    focusAreas: ["document lifecycle", "generated artifacts", "governed records"],
    recommendedNext: [
      "Clarify generation pipelines and downstream archival rules as more document-producing plugins appear.",
      "Add stronger file and template integration guidance when document outputs become a common platform contract."
    ]
  },
  "files-core": {
    group: "Content and Experience",
    architectureRole:
      "Abstracts file references and storage state so upstream plugins do not need to couple directly to storage implementation details.",
    focusAreas: ["file references", "storage state", "asset metadata"],
    recommendedNext: [
      "Add richer scanning, lifecycle, and retention orchestration where file handling becomes more sensitive.",
      "Expose clearer connector guidance for external storage backends once the contract is stable."
    ]
  },
  "forms-core": {
    group: "Content and Experience",
    architectureRole:
      "Defines the dynamic form and submission layer used by internal tools, operator flows, and self-service data collection.",
    focusAreas: ["form definitions", "submission capture", "governed input contracts"],
    recommendedNext: [
      "Expand validation and workflow coupling where form submissions drive more downstream automation.",
      "Add stronger portal and dashboard integration guidance if form-driven products become more user-facing."
    ]
  },
  "jobs-core": {
    group: "Platform Backbone",
    architectureRole:
      "Registers the background job definitions, queues, retry policy, and execution metadata that other plugins can target safely.",
    focusAreas: ["job definitions", "retry policy", "execution metadata"],
    nonGoals: [
      "This repo does not yet claim to be a full distributed worker runtime or broker adapter layer.",
      "It defines and governs job contracts; external execution infrastructure still sits outside the repo boundary."
    ],
    recommendedNext: [
      "Add stronger worker-runtime integration guidance and operational troubleshooting as more plugins dispatch background jobs.",
      "Expose more lifecycle telemetry once execution state becomes a first-class operator concern."
    ]
  },
  "knowledge-core": {
    group: "Content and Experience",
    architectureRole:
      "Owns the knowledge base and article tree domain that can feed retrieval, documentation, and governed knowledge experiences.",
    focusAreas: ["knowledge base", "article trees", "managed docs"],
    recommendedNext: [
      "Deepen RAG and search integration guidance where knowledge content becomes a primary retrieval source.",
      "Add richer authoring and review notes if more governed documentation flows land here."
    ]
  },
  "notifications-core": {
    group: "Operational Data",
    architectureRole:
      "Operates as the outbound communication control plane for deterministic local delivery, endpoint governance, preference management, and auditable attempt history.",
    focusAreas: ["message queueing", "delivery attempts", "endpoint and preference governance"],
    nonGoals: [
      "Does not currently ship live third-party connector packages in this repo.",
      "Does not export inbound email/SMS handling, campaigns, or marketing-automation workflows."
    ],
    recommendedNext: [
      "Add live provider connectors and stronger long-running delivery reconciliation once the current local-provider contract is stable.",
      "Promote the current lifecycle events and dispatch flow into richer platform orchestration surfaces where downstream plugins need them."
    ],
    laterOptional: [
      "Campaign tooling, inbound processing, and broader provider governance after the transactional substrate has matured."
    ]
  },
  "org-tenant-core": {
    group: "Platform Backbone",
    architectureRole:
      "Maintains the tenant and organization graph so the rest of the ecosystem can reason about ownership and isolation consistently.",
    focusAreas: ["tenant graph", "organization graph", "isolation boundaries"],
    recommendedNext: [
      "Add richer tenant lifecycle and reconciliation guidance where provisioning and billing start depending on the graph.",
      "Expose clearer cross-plugin event guidance if tenant changes must trigger downstream automation."
    ]
  },
  "page-builder-core": {
    group: "Operational Data",
    architectureRole:
      "Provides the builder-canvas and layout/block domain used to compose editable page structures with governed admin entrypoints.",
    focusAreas: ["builder canvas", "layout blocks", "admin editing surface"],
    recommendedNext: [
      "Deepen publication, preview, and template workflows once the builder contract is stable across more page types.",
      "Add clearer content, asset, and portal integration patterns where page assembly becomes more operationally critical."
    ]
  },
  "portal-core": {
    group: "Operational Data",
    architectureRole:
      "Defines the self-service portal entry surface and the contract for portal-aware resources and actions.",
    focusAreas: ["portal shell", "self-service entrypoints", "portal-aware resources"],
    recommendedNext: [
      "Broaden portal workflow depth as more operational plugins expose self-service actions.",
      "Add stronger role-aware navigation and lifecycle guidance once the portal surface matures beyond the baseline shell."
    ]
  },
  "role-policy-core": {
    group: "Platform Backbone",
    architectureRole:
      "Owns RBAC and ABAC policy records so access decisions stay governed and inspectable across the ecosystem.",
    focusAreas: ["roles", "policies", "access governance"],
    recommendedNext: [
      "Add clearer downstream enforcement patterns and policy-drift diagnostics when more plugins consume these rules directly.",
      "Expose explicit policy lifecycle events if cross-plugin automation depends on role or grant changes."
    ]
  },
  "search-core": {
    group: "Operational Data",
    architectureRole:
      "Defines the search index and query contract that other plugins can target without hard-coding a single search backend.",
    focusAreas: ["search indexes", "query contracts", "typed retrieval"],
    recommendedNext: [
      "Broaden indexing and result-ranking guidance once more plugins depend on the search contract.",
      "Add clearer ingestion and refresh orchestration patterns where stale search state becomes operationally significant."
    ]
  },
  "template-core": {
    group: "Content and Experience",
    architectureRole:
      "Maintains reusable templates for content, messaging, and workflow-centric generation across the ecosystem.",
    focusAreas: ["content templates", "message templates", "workflow templates"],
    recommendedNext: [
      "Clarify template versioning and publication patterns once more plugins depend on shared templates.",
      "Add deeper coupling guidance for content, notifications, and workflow consumers."
    ]
  },
  "user-directory": {
    group: "Operational Data",
    architectureRole:
      "Projects people and directory data into a stable domain contract that other plugins can search, reference, and render.",
    focusAreas: ["directory records", "people projection", "searchable identities"],
    recommendedNext: [
      "Add stronger sync, reconciliation, and lifecycle guidance if the directory becomes the source for external systems.",
      "Clarify auth and org-tenant integration patterns where directory state drives access or communications."
    ]
  },
  "workflow-core": {
    group: "Platform Backbone",
    architectureRole:
      "Defines explicit workflow state machines and approval models so business processes stay inspectable instead of hiding in ad hoc hooks.",
    focusAreas: ["workflow definitions", "approval states", "transition rules"],
    recommendedNext: [
      "Add richer execution-state and replay guidance if more plugins adopt workflow-driven orchestration.",
      "Expose tighter integration patterns with jobs and notifications when human approvals start driving more automation."
    ],
    laterOptional: [
      "Visual editors or migration helpers for workflow definitions once the current state-machine contract hardens."
    ]
  }
};

export function getProfile(pluginId) {
  const profile = pluginProfiles[pluginId];
  if (!profile) {
    throw new Error(`Missing plugin profile for '${pluginId}'.`);
  }

  return {
    ...groupDefaults[profile.group],
    ...profile,
    nonGoals: [...(groupDefaults[profile.group]?.nonGoals ?? []), ...(profile.nonGoals ?? [])],
    recommendedNext: [...(profile.recommendedNext ?? []), ...(groupDefaults[profile.group]?.recommendedNext ?? [])],
    laterOptional: [...(profile.laterOptional ?? []), ...(groupDefaults[profile.group]?.laterOptional ?? [])]
  };
}
