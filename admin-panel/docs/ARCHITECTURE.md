# Gutu Admin Panel — Architecture

A single-reference map of how the admin panel is structured, how plugins
are discovered and activated, and where to look when something breaks.

## TL;DR

- **Shell + primitives + runtime** are the hardcoded core. They never
  need a release for a new plugin to ship.
- **Plugins** (everything under `src/examples/*` and `src/plugins/*`) are
  v2 contracts — `{manifest, activate(ctx)}`. Plugins register
  contributions via `ctx.contribute.*` at activation time.
- **Registries** are open enums. The shell seeds defaults; plugins
  extend — field kinds, widget types, view modes, chart kinds, themes,
  layouts, exporters, auth providers, data sources.
- **Discovery** is automatic: explicit plugins in `App.tsx`, filesystem
  plugins under `src/plugins/*`, and npm specifiers in
  `package.json.gutuPlugins`. All sources merge, duplicates are detected.
- **Activation** respects dependencies (topological), parallelizes
  independent plugins (Kahn layers, bounded concurrency), times out
  hung plugins (15s), and quarantines failures without taking down
  peers.

## Directory layout

```
admin-panel/
  src/
    app/          App.tsx — top-level entry
    host/         PluginHost + activationEngine + sandbox + loaders
    runtime/      scoped services, registries, semver, mock backend
    shell/        AppShell, Router, Sidebar, Topbar, PluginInspector
    contracts/    plugin-v2.ts, views.ts, resources.ts, nav.ts, …
    views/        ListView, FormView, DetailView, DashboardView, KanbanView
    admin-primitives/   shared component library (Cards, Tables, Widgets, …)
    primitives/         low-level UI atoms (Button, Input, Badge, …)
    lib/          filterEngine, expression, format, cn
    examples/     first-party plugins (50+ domains)
    plugins/      filesystem-discovered plugins (drop-a-folder)
  packages/
    admin-shell-next/   public SDK — re-exports contracts + builders
  scripts/
    gutu-plugin.mjs     CLI scaffold / validate / list
```

## Boot sequence

1. **`App.tsx`** — wires `<AdminRoot plugins={...}>` with the explicit
   first-party plugin list.
2. **`AdminRoot`** — `<AuthGuard>` gates sign-in, then `<RuntimeProvider>`
   instantiates services. `<AdminInner>` runs plugin discovery:
   - Filesystem glob (`src/plugins/*/index.{ts,tsx,js,jsx}`)
   - npm specifiers from `package.json.gutuPlugins`
   - Built-in plugin (Plugin Inspector)
   - Explicit (from `App.tsx`)
3. **`usePluginHost`** — topo-sorts discovered plugins into dependency
   layers via `layerPlugins()`. Each layer is activated in parallel
   (bounded concurrency = 8); subsequent layers wait. A hung
   `activate()` is quarantined after 15s. Errors quarantine the plugin
   and its dependents.
4. **`PluginHost2.install(plugin)`** — builds a PluginContext with
   capability-enforced registrars, calls `plugin.activate(ctx)`, flushes
   seeds into the mock backend, emits `plugin.activated` telemetry.
5. **Registry rebuild** — a debounced listener rebuilds the
   AdminRegistry from the contribution store whenever a plugin
   activates/deactivates. `<AppShell>` renders from the registry.

## The plugin contract (v2)

```ts
definePlugin({
  manifest: {
    id: "com.acme.foo",           // reverse-DNS, globally unique
    version: "1.0.0",
    label: "Foo",
    description: "…",
    icon: "Sparkles",
    requires: {
      shell: "^2.0.0",
      plugins: { "com.gutu.auth": "^1.0" },
      capabilities: ["resources:read", "nav", "commands"],
    },
    activationEvents: [{ kind: "onStart" }],
    sandbox: "none",              // "none" | "iframe" | "worker"
    origin: { kind: "explicit" },
  },

  async activate(ctx) {
    ctx.contribute.resources([...]);
    ctx.contribute.nav([...]);
    ctx.contribute.views([...]);
    ctx.contribute.commands([...]);
    ctx.contribute.shortcuts([...]);
    ctx.contribute.routeGuards([...]);
    ctx.contribute.viewExtensions([...]);
    ctx.contribute.jobs([...]);

    // Extension registries — platform extensibility:
    ctx.registries.fieldKinds.register("barcode", {...});
    ctx.registries.widgetTypes.register("map", {...});
    ctx.registries.exporters.register("xlsx", {...});

    // Scoped runtime services:
    ctx.runtime.storage.set("k", v);            // namespaced to this plugin
    ctx.runtime.bus.on("deal:won", handler);
    ctx.runtime.resources.list("sales.deal");   // capability-checked
  },

  api: { /* public API for peer plugins */ },
});
```

Every `ctx.contribute.*` returns a Disposable. When a plugin deactivates
(shell shutdown, uninstall, or hot-reload), every disposer is called —
contributions vanish, jobs cancel, listeners detach.

## Extension registries

13 registries, each exposed as `ctx.registries.*`:

| Registry | Default seeds | Consumed by |
|---|---|---|
| `fieldKinds` | text/number/currency/enum/date/… | `renderCellValue`, form renderer |
| `widgetTypes` | number_card/chart/quick_list/shortcut | `WorkspaceRenderer` |
| `viewModes` | (empty) | `ExternalViewRenderer` for `type: "external:<kind>"` |
| `chartKinds` | (empty — built-ins hardcoded) | `ChartWidget` fallback |
| `themes` | shell.light, shell.dark | Appearance picker → CSS vars |
| `layouts` | shell.standard, shell.minimal | Appearance picker → data-attrs |
| `exporters` | csv, json | `ExportCenter` |
| `importers` | (empty) | (hook points in ListView toolbar) |
| `authProviders` | (empty) | Inspector — post-auth sign-in |
| `notificationChannels` | (empty) | plugin authors drive |
| `filterOps` | (empty — built-ins hardcoded) | QueryBuilder (extension path) |
| `expressionFunctions` | (empty — built-ins hardcoded) | expression.ts (extension path) |
| `dataSources` | (empty — REST hardcoded) | useList/useRecord (extension path) |

Registration is capability-gated: `register:field-kind` / `register:widget-type`
/ `register:view-mode` / `register:chart-kind` / `register:exporter` /
`register:importer`.

## Capabilities

Declared in `manifest.requires.capabilities`. Enforced at the scoped-client
and scoped-registry boundary. Throwing `CapabilityError` when a plugin
calls a method it didn't declare access to.

Standard capabilities:
- `resources:read` / `:write` / `:delete`
- Per-resource fine-grained: `resource:<id>` / `resource:<id>:write` / `:delete`
  (falls back to the broad capability when neither is declared)
- `nav`, `topbar`, `commands`, `shortcuts`, `theme`, `layout`, `storage`
- `fetch:external`, `clipboard`
- `register:field-kind`, `register:widget-type`, `register:view-mode`,
  `register:chart-kind`, `register:exporter`, `register:importer`

## Activation events

Controls when a plugin's `activate()` runs:
- `onStart` — at shell boot (default).
- `onNav` — first hashchange matching `path`.
- `onCommand` — command palette invokes command id.
- `onResource` — realtime event for a resource id.
- `onEvent` — any bus event by name.
- `onPluginActivate` — another plugin activated.

Managed by `activationEngine.ts`. Non-`onStart` plugins are held
"pending" and activated on first matching trigger. Scales to 200+
plugins — only what's visited pays activation cost.

## Sandbox tiers

Declared via `manifest.sandbox`:

- `"none"` (default) — same-origin JS. Fast, fully trusted.
- `"iframe"` — opaque-origin iframe with `sandbox="allow-scripts"`. No
  cookie / storage / same-origin API access. Plugin activate() runs
  inside; all host calls go through postMessage RPC. Used for
  untrusted third-party plugins.
- `"worker"` — module Web Worker. No DOM. Ideal for data-source
  adapters, cron jobs, notification channels, expression libs.

RPC dispatcher enforces the same capability checks as same-origin
activation.

## Remote plugin install

`host.installFromURL(manifestUrl)`:

1. Validates URL scheme + content-type.
2. Fetches manifest with 10s timeout.
3. Validates required fields: `id`, `version`, `label`, `entry`,
   `requires.shell` (against `SHELL_API_VERSION`).
4. Fetches entry bundle with 30s timeout + 32MB size cap.
5. If `origin.integrity` declared, verifies SHA-384.
6. If `origin.signature` declared, verifies Ed25519 against the
   trusted-keys list (managed in Inspector UI). Refuses install
   without a trusted key match.
7. Imports via Blob URL (isolates module graph).
8. Registers via the same `install()` path as local plugins.

## Runtime services — scoped per plugin

Every plugin gets `ctx.runtime.*`:

- `resources` — capability-checked facade over global ResourceClient.
- `bus` — typed events; emits tag source plugin id.
- `storage` — namespaced `gutu.plugin.<id>.*` in localStorage with
  in-memory fallback.
- `logger` — `[<pluginId>]`-prefixed console output.
- `i18n` — plugin-scoped catalog with shell-default fallback.
- `assets` — resolves relative URLs to plugin's origin.
- `permissions` — capability checks.
- `analytics` — events auto-tagged with `plugin: <id>`.
- `notify` — shell toast surface.

## View extensions

A plugin can augment another plugin's detail view:

```ts
ctx.contribute.viewExtensions([
  {
    target: "com.gutu.sales.deal-detail.view",
    tab: {
      id: "warehouse.stock",
      label: "Warehouse stock",
      render: (record) => <WarehouseStockTab orderId={record.id} />,
    },
    railCard: { id: "…", render: (r) => <…/> },
  },
]);
```

`resolveViewExtensions(host, view)` collects contributions at render
time; `RichDealDetailPage` and `RichZodDetailPage` merge them into
their tab / rail lists. Each extension runs inside its own
`<PluginBoundary>` so a crash only affects that tile.

## Observability

Lifecycle analytics events emitted by the host:
- `plugin.activated` — pluginId, version, durationMs, origin
- `plugin.quarantined` — pluginId, error, origin
- `plugin.deactivated` — pluginId, version

The Plugin Inspector shows these live — activation timing per plugin,
origin badges, contribution counts, declared capabilities, required
peer plugins.

## Testing

`bun test` runs the unit suite:
- `src/runtime/semver.test.ts` — 14 tests covering caret/tilde/ranges/OR.
- `src/runtime/registries.test.ts` — 10 tests covering registration /
  attribution / onChange / disposal / shadowing.
- `src/lib/filterEngine.test.ts` — 16 tests covering every FilterOp +
  nested AND/OR + relative-date `last_n_days`.
- `src/lib/expression.test.ts` — 25 tests covering arithmetic, logical,
  ternary (with precedence), functions, error paths.
- `src/host/pluginHost2.test.ts` — 9 tests covering topoSort, Kahn
  layering, bounded concurrency.

All 74 tests pass. Typecheck via `npm run typecheck`.

## Adding a plugin — the 3-step flow

1. `node scripts/gutu-plugin.mjs create com.acme.foo` — scaffolds
   `src/plugins/foo/index.tsx` with manifest + activate stub.
2. Edit the scaffold; register your views / resources / commands.
3. Dev server HMRs; Plugin Inspector shows your plugin Active.

No shell edits required. No `App.tsx` edits. Just drop in the folder.

## See also

- `src/plugins/README.md` — plugin authoring guide with every
  `ctx.contribute.*` + `ctx.registries.*` method documented.
- `src/contracts/plugin-v2.ts` — the contract source of truth.
- `src/host/pluginHost2.ts` — activation engine.
- `src/host/activationEngine.ts` — lazy activation triggers.
- `src/runtime/pluginContext.ts` — scoped runtime implementation.
- `src/runtime/registries.ts` — extension registries.
