export const maturityOrder = [
  "Scaffolded",
  "Baseline",
  "Hardened",
  "Production Candidate"
];

export const libraryGroupOrder = [
  "Admin Experience",
  "AI Foundation",
  "Core Data And Query",
  "UI Foundation"
];

export const groupDefaults = {
  "Admin Experience": {
    nonGoals: [
      "Not a full product shell or admin application by itself.",
      "Not a replacement for plugin-owned business logic or data lifecycles."
    ],
    recommendedNext: [
      "Deepen contract coverage around the most reused admin composition paths.",
      "Add stronger ergonomic guidance where multiple first-party plugins compose the same admin primitives."
    ],
    laterOptional: [
      "Reference themes, presets, and richer visual regression checks once the API shape settles."
    ]
  },
  "AI Foundation": {
    nonGoals: [
      "Not an end-user AI product or provider control plane on its own.",
      "Not a substitute for surrounding approval, audit, and budget governance."
    ],
    recommendedNext: [
      "Promote heavily reused inference and evaluation seams into clearer contract tests.",
      "Expand cookbook-style integration guidance only where the exported surface is already stable."
    ],
    laterOptional: [
      "Provider-specific optimization guides and richer benchmark packs after the baseline contracts harden."
    ]
  },
  "Core Data And Query": {
    nonGoals: [
      "Not a vertical application or domain plugin by itself.",
      "Not a generic hook bus or hidden orchestration layer."
    ],
    recommendedNext: [
      "Strengthen contract coverage around the most widely consumed helper surfaces.",
      "Add deeper integration examples where downstream packages repeatedly compose the same APIs."
    ],
    laterOptional: [
      "Reference adapters and richer cookbook examples once more external connectors exist."
    ]
  },
  "UI Foundation": {
    nonGoals: [
      "Not a complete front-end application by itself.",
      "Not a replacement for app-level state, routing, or domain-specific orchestration."
    ],
    recommendedNext: [
      "Add stronger component and interaction verification around the most reused visual primitives.",
      "Deepen accessibility and composition guidance where multiple host apps depend on the same library."
    ],
    laterOptional: [
      "Visual regression lanes and design-token packs after the public APIs settle."
    ]
  }
};

function defineProfile(group, architectureRole, focusAreas, overrides = {}) {
  return {
    group,
    architectureRole,
    focusAreas,
    ...overrides
  };
}

export const libraryProfiles = {
  "admin-builders": defineProfile(
    "Admin Experience",
    "Builds higher-level admin layouts and assembly helpers so host apps can turn contracts into concrete operator experiences without rewriting the same scaffolding.",
    ["admin composition", "layout builders", "operator scaffolding"]
  ),
  "admin-contracts": defineProfile(
    "Admin Experience",
    "Defines the shared admin registry, access rules, and legacy adapters that keep the desk surface governed across plugins and apps.",
    ["registry contracts", "admin access", "legacy adapters"],
    {
      recommendedNext: [
        "Broaden contract tests around registry and legacy-adapter boundaries.",
        "Add clearer migration guidance for hosts moving from legacy admin wiring to the current contract set."
      ]
    }
  ),
  "admin-formview": defineProfile(
    "Admin Experience",
    "Provides governed form-view assembly for admin surfaces so resource editors can share the same shape and validation semantics.",
    ["form views", "admin editors", "resource-driven forms"]
  ),
  "admin-listview": defineProfile(
    "Admin Experience",
    "Provides governed list-view assembly for admin surfaces so resource indexes, filters, and columns stay consistent across modules.",
    ["list views", "admin indexes", "resource tables"]
  ),
  "admin-reporting": defineProfile(
    "Admin Experience",
    "Packages reporting-oriented admin helpers so dashboards and operator summaries can reuse stable reporting contracts.",
    ["reporting helpers", "operator summaries", "admin analytics"]
  ),
  "admin-shell-workbench": defineProfile(
    "Admin Experience",
    "Provides the shared workbench primitives that host apps use to mount consistent operator workspaces and admin navigation.",
    ["workspace shell", "admin navigation", "operator workbench"]
  ),
  "admin-widgets": defineProfile(
    "Admin Experience",
    "Provides reusable widget and card primitives for admin dashboards and operator-facing summary surfaces.",
    ["widgets", "summary cards", "admin composition"]
  ),
  "ai": defineProfile(
    "AI Foundation",
    "Provides the core typed AI helper surface that higher-level runtimes and plugins compose for inference, prompting, and structured model interactions.",
    ["typed AI helpers", "prompt composition", "model-facing contracts"]
  ),
  "ai-evals": defineProfile(
    "AI Foundation",
    "Provides evaluation helpers and baseline-oriented utilities that let the surrounding platform keep AI changes measurable and reviewable.",
    ["evaluation helpers", "baseline comparisons", "AI verification"]
  ),
  "ai-guardrails": defineProfile(
    "AI Foundation",
    "Provides reusable guardrail helpers for validation, policy checks, and model-output safety gates.",
    ["guardrails", "validation", "policy enforcement"]
  ),
  "ai-mcp": defineProfile(
    "AI Foundation",
    "Provides MCP-oriented helper contracts so the rest of the stack can compose AI tools and transports through typed abstractions.",
    ["MCP helpers", "tool contracts", "transport composition"]
  ),
  "ai-memory": defineProfile(
    "AI Foundation",
    "Provides reusable memory and retrieval-oriented helpers that other AI runtimes can compose without re-encoding storage assumptions.",
    ["memory helpers", "retrieval state", "AI persistence seams"]
  ),
  "ai-runtime": defineProfile(
    "AI Foundation",
    "Provides the reusable runtime state and execution helpers that higher-level AI surfaces compose for durable model workflows.",
    ["runtime state", "execution helpers", "AI orchestration primitives"]
  ),
  "analytics": defineProfile(
    "Core Data And Query",
    "Provides shared analytics helpers and typed telemetry-friendly patterns for packages that need stable measurement primitives.",
    ["analytics helpers", "typed metrics", "telemetry composition"]
  ),
  "chart": defineProfile(
    "UI Foundation",
    "Provides reusable chart primitives so dashboards and reports can share a consistent visualization surface.",
    ["charts", "visual analytics", "dashboard primitives"]
  ),
  "command-palette": defineProfile(
    "UI Foundation",
    "Provides command-palette primitives and interaction helpers for apps that want a shared command-driven navigation or action surface.",
    ["command palette", "keyboard actions", "shared interactions"]
  ),
  "communication": defineProfile(
    "Core Data And Query",
    "Provides typed outbound communication compilers, deterministic local providers, and delivery helpers that other packages can compose safely.",
    ["communication helpers", "delivery compilers", "deterministic providers"],
    {
      recommendedNext: [
        "Promote more consumer-facing contract tests around provider-route and callback normalization paths.",
        "Expand cookbook examples for multi-channel delivery only where the exported contract already proves stable."
      ]
    }
  ),
  "contracts": defineProfile(
    "Core Data And Query",
    "Provides shared contract and type utilities that keep cross-package API surfaces consistent and machine-checkable.",
    ["shared contracts", "type utilities", "cross-package consistency"]
  ),
  "data-table": defineProfile(
    "Core Data And Query",
    "Provides typed data-table helpers and state contracts so list-heavy experiences can share the same table semantics.",
    ["data tables", "table state", "list helpers"]
  ),
  "editor": defineProfile(
    "UI Foundation",
    "Provides reusable editor primitives for rich text or structured editing experiences that need a shared front-end foundation.",
    ["editor primitives", "rich editing", "shared authoring UI"]
  ),
  "email-templates": defineProfile(
    "Core Data And Query",
    "Provides reusable email-template definitions and rendering helpers so outbound email behavior stays typed and composable.",
    ["email templates", "rendering helpers", "transactional messaging"]
  ),
  "form": defineProfile(
    "Core Data And Query",
    "Provides reusable form-state and schema-oriented helpers that higher-level admin and portal surfaces build on.",
    ["form helpers", "schema state", "input composition"]
  ),
  "geo": defineProfile(
    "Core Data And Query",
    "Provides typed geographic helpers and location-oriented utility surfaces for packages that need stable geo primitives.",
    ["geographic helpers", "location utilities", "typed coordinates"]
  ),
  "layout": defineProfile(
    "UI Foundation",
    "Provides shared layout primitives so apps and surfaces can compose consistent spacing, panels, and responsive structure.",
    ["layout primitives", "responsive structure", "shared composition"]
  ),
  "query": defineProfile(
    "Core Data And Query",
    "Provides typed query helpers and shared request/response patterns for packages that need stable data-access abstractions.",
    ["query helpers", "typed data access", "shared request patterns"]
  ),
  "router": defineProfile(
    "Core Data And Query",
    "Provides reusable routing contracts and helpers so applications can share navigation semantics without coupling to one app shell.",
    ["routing contracts", "navigation helpers", "URL semantics"]
  ),
  "search": defineProfile(
    "Core Data And Query",
    "Provides shared search-oriented helpers and result contracts that other packages can target without hard-coding one search backend.",
    ["search helpers", "result contracts", "query composition"]
  ),
  "telemetry-ui": defineProfile(
    "Core Data And Query",
    "Provides UI-facing telemetry helpers that let front-end surfaces emit and render measurement data consistently.",
    ["telemetry helpers", "UI metrics", "front-end observability"]
  ),
  "ui": defineProfile(
    "UI Foundation",
    "Provides shared UI primitives and conventions that higher-level component libraries build on.",
    ["UI primitives", "shared components", "front-end foundations"]
  ),
  "ui-editor": defineProfile(
    "UI Foundation",
    "Provides editor-facing UI helpers and components that sit between low-level editor primitives and application-specific authoring flows.",
    ["editor UI", "authoring helpers", "component composition"]
  ),
  "ui-form": defineProfile(
    "UI Foundation",
    "Provides reusable form components and interaction primitives that pair typed form state with shared UI behavior.",
    ["form components", "interaction primitives", "shared inputs"]
  ),
  "ui-kit": defineProfile(
    "UI Foundation",
    "Provides reusable presentational building blocks that keep the visual language of first-party apps coherent.",
    ["presentational components", "visual system", "shared styling"]
  ),
  "ui-query": defineProfile(
    "UI Foundation",
    "Provides UI-facing query helpers and view-state primitives for list, search, and data-driven front-end surfaces.",
    ["query UI", "view state", "data-driven front-end helpers"]
  ),
  "ui-router": defineProfile(
    "UI Foundation",
    "Provides router-aware UI helpers so applications can compose navigation-aware components without duplicating glue code.",
    ["router-aware UI", "navigation components", "front-end composition"]
  ),
  "ui-shell": defineProfile(
    "UI Foundation",
    "Provides the shared shell registry, providers, telemetry, and navigation contracts that host apps use to assemble coherent application shells.",
    ["shell registry", "providers", "navigation and telemetry"],
    {
      recommendedNext: [
        "Add stronger contract and interaction checks around provider and registry composition paths.",
        "Deepen host-application examples where multiple apps depend on the same shell primitives."
      ]
    }
  ),
  "ui-table": defineProfile(
    "UI Foundation",
    "Provides reusable table components and front-end helpers so data-heavy surfaces can share stable tabular interactions.",
    ["table UI", "data-heavy views", "shared interactions"]
  ),
  "ui-zone-next": defineProfile(
    "UI Foundation",
    "Provides the next-generation UI zone primitives for host apps that need pluggable region-based composition.",
    ["zone composition", "pluggable regions", "next-generation UI assembly"]
  ),
  "ui-zone-static": defineProfile(
    "UI Foundation",
    "Provides the static UI zone primitives used by simpler host surfaces that need bounded pluggable composition without a more dynamic runtime.",
    ["static zones", "pluggable regions", "bounded composition"]
  )
};

export function getProfile(libraryId) {
  const profile = libraryProfiles[libraryId];
  if (!profile) {
    throw new Error(`Missing library profile for '${libraryId}'.`);
  }

  const defaults = groupDefaults[profile.group];
  return {
    ...defaults,
    ...profile,
    nonGoals: profile.nonGoals ?? defaults.nonGoals,
    recommendedNext: profile.recommendedNext ?? defaults.recommendedNext,
    laterOptional: profile.laterOptional ?? defaults.laterOptional
  };
}
