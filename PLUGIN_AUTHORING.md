# Plugin authoring guide

How to ship a plugin for the Gutu ecosystem.

## TL;DR

```bash
bun run scaffold:plugin fleet-core --ui --worker
# follow printed steps to wire it into the host
bun run dev:api
# /api/_plugins now lists "fleet-core"
```

## Anatomy of a plugin

```
plugins/gutu-plugin-fleet-core/
├── package.json                       # name: @gutu-plugin/fleet-core
├── README.md
├── tsconfig.base.json
└── framework/builtin-plugins/fleet-core/
    ├── tsconfig.json
    └── src/host-plugin/
        ├── index.ts                   # exports `hostPlugin: HostPlugin`
        ├── db/migrate.ts              # CREATE TABLE IF NOT EXISTS
        ├── routes/fleet-core.ts       # Hono router
        ├── lib/index.ts               # cross-plugin barrel
        └── ui/                        # admin UI (--ui flag)
            ├── index.ts               # exports `adminUi: AdminUiContribution`
            └── pages/HomePage.tsx
```

## The HostPlugin contract

```ts
import type { HostPlugin } from "@gutu-host/plugin-contract";
import { withLeadership } from "@gutu-host/leader";

export const hostPlugin: HostPlugin = {
  id: "fleet-core",
  version: "1.0.0",

  manifest: {
    label: "Fleet management",
    description: "Vehicles, drivers, routes, telematics.",
    icon: "Truck",
    vendor: "acme",
    homepage: "https://acme.example.com/gutu/fleet",
    permissions: ["db.read", "db.write", "audit.write", "events.subscribe"],
  },

  // Other plugins this depends on (topologically sorted at load time).
  dependsOn: [
    { id: "accounting-core", versionRange: "^1.0.0" },
  ],

  // Capabilities this plugin exposes via the registry.
  provides: ["fleet.dispatch"],
  // Capabilities this plugin needs (boot fails if missing).
  consumes: ["notifications.dispatch"],

  // Schema. Idempotent — runs every boot.
  migrate,

  // One-shot per (plugin, version). Tracked in `meta` table.
  install: async (ctx) => {
    // seed default templates, register a default cron, etc.
  },

  // Demo data — only when operator triggers `seedAll({force:true})`.
  seed: async (opts) => { /* ... */ },

  // HTTP routes — auto-mounted at /api/<mountPath>.
  routes: [
    { mountPath: "/fleet", router: fleetRoutes },
  ],

  // Resources this plugin owns. Auto-registered into the UI metadata
  // catalog at `loadPlugins()` time and feeds the host's resource-write
  // gate's dynamic namespace allow-list. Without this declaration,
  // POSTs to a fresh DB return 404 until a record exists.
  //
  // Bare strings = `{ id: <string> }` shorthand. Full descriptors can
  // also tweak label/group/icon/actions for the picker UI.
  //
  // The id MUST match `<plugin>.<entity>` (lowercase, optional hyphens);
  // anything else is dropped with a clear warning at boot. Wrong:
  // "Fleet" or "fleet". Right: "fleet.vehicle".
  resources: [
    "fleet.vehicle",
    "fleet.driver",
    "fleet.route",
    { id: "fleet.telemetry-event", label: "Telemetry event", group: "Fleet" },
  ],

  // WebSocket handlers — auto-mounted at /api/ws/<path>.
  ws: [
    {
      path: "telemetry/:vehicle",
      authorize: async (req) => /* ... */,
      onOpen, onMessage, onClose,
    },
  ],

  // Workers + cluster-singleton coordination.
  start: (ctx) => {
    const dispatch = ctx.registries
      .ns<{ send(args: any): Promise<void> }>("notifications.dispatch")
      .lookup("default");
    // use `dispatch` from your action steps

    stopWorker = withLeadership("fleet:dispatcher", () => {
      const interval = setInterval(tick, 30_000);
      return () => clearInterval(interval);
    });
  },
  stop: () => { stopWorker?.(); },

  // Operator-triggered erasure.
  uninstall: async () => {
    // drop tables, remove orphaned files, …
  },

  // GDPR plumbing.
  exportSubjectData: async ({ tenantId, subjectId }) => {
    return { vehicles: [/* … */], routes: [/* … */] };
  },
  deleteSubjectData: async ({ tenantId, subjectId }) => {
    const { changes } = db.prepare(
      "DELETE FROM fleet_vehicles WHERE tenant_id = ? AND assigned_to = ?",
    ).run(tenantId, subjectId);
    return { deleted: changes };
  },

  // Cheap liveness probe surfaced in /api/_plugins.
  health: async () => ({ ok: true, details: { connectedTelematics: 42 } }),
};
```

## The host SDK (`@gutu-host`)

Plugins import platform services from a stable, versioned surface.
Direct imports across plugins are an anti-pattern — use `provides` /
`consumes` + the registry instead.

```ts
import {
  // core platform
  db, nowIso, uuid, token, recordAudit, Hono, type Context,
  // request scope
  getTenantContext, requireAuth, currentUser,
} from "@gutu-host";

import { withLeadership, acquireOnce } from "@gutu-host/leader";
import { pluginGate, isPluginEnabled } from "@gutu-host";
import type { HostPlugin } from "@gutu-host";
```

## Cross-plugin: registry pattern

Provide:
```ts
start: (ctx) => {
  ctx.registries.ns<DispatchCapability>("notifications.dispatch")
    .register("default", myDispatcher);
},
provides: ["notifications.dispatch"],
```

Consume:
```ts
consumes: ["notifications.dispatch"],
start: (ctx) => {
  const dispatch = ctx.registries
    .ns<DispatchCapability>("notifications.dispatch")
    .lookup("default");
  if (dispatch) {
    // your action steps call dispatch.send(...)
  }
},
```

Boot fails fast if a `consumes` ID isn't `provided` by any loaded plugin.
Swap implementations without touching consumer code.

## Declaring resources

Every record-shaped entity your plugin owns is a *resource*. The
host's generic `/api/resources/:resource/...` endpoints (list, get,
create, update, delete, restore, destroy) operate on resources by id.
Declare them so:

1. The picker UI (resource select, scope tree, tool picker) renders
   labels and groups instead of raw ids.
2. The host's resource-write gate accepts POSTs to your namespace
   from the first request — even on a fresh DB, before any record
   has been written.
3. Operators can audit "what each plugin contributes" via
   `/api/_plugins`.

```ts
resources: [
  // Bare-string shorthand = `{ id: <string> }`. Use this for the
  // common case where the picker label can be inferred from the id.
  "fleet.vehicle",
  "fleet.driver",
  "fleet.route",
  // Full descriptor for fields the host can't infer. Group is shown
  // in the resource picker tree; actions trim the picker's chips.
  {
    id: "fleet.telemetry-event",
    label: "Telemetry event",
    group: "Fleet",
    actions: ["read"],
  },
],
```

**Naming convention** — `<plugin-namespace>.<entity>` in lowercase
with optional hyphens. The host's `loadPlugins` rejects anything else
(logs `[plugin-host] ... skipping` and continues). Examples:

| OK                                | Not OK             | Why                              |
|-----------------------------------|--------------------|----------------------------------|
| `accounting.invoice`              | `accounting`       | No entity                         |
| `field-service.parts-request`     | `Field-Service.X`  | Uppercase                         |
| `crm.lead`                        | `crm.lead.v2`      | Two dots                          |
| `fleet.vehicle`                   | `_fleet.vehicle`   | Leading underscore                |

**Two namespaces, one plugin** — perfectly fine. `editor-core`
declares `spreadsheet.workbook`, `document.page`, `slides.deck`,
`collab.page`, `whiteboard.canvas` because those are five distinct
record kinds backed by the same plugin.

**Plugin without resources** — also fine. Cross-cutting plugins
(`favorites-core`, `field-metadata-core`, `record-links-core`,
`saved-views-core`, `timeline-core`) own their own DB tables but
not entries in the resource catalog. Just omit `resources`.

## Permissions

Manifest `permissions` are recorded at load time and enforced at host
SDK call sites when `GUTU_PERMISSIONS=enforce`. Declare every permission
your plugin uses; missing permissions throw a `PermissionDeniedError`.

```ts
manifest: {
  permissions: ["db.read", "db.write", "events.subscribe", "net.outbound"],
}
```

Available permissions:
- `db.read`, `db.write` — direct DB access
- `audit.write` — append to `audit_events`
- `events.publish`, `events.subscribe` — record event bus
- `fs.read`, `fs.write` — filesystem
- `net.outbound` — outbound HTTP / SMTP / etc.
- `ws.upgrade` — accept WebSocket upgrades

## Testing

Plugin tests run inside the shell harness:

```ts
// In your plugin's tests/
import { hostPlugin } from "../src/host-plugin";

test("fleet-core mounts routes", () => {
  expect(hostPlugin.routes?.[0]?.mountPath).toBe("/fleet");
});
```

Run end-to-end + visual + adversarial suites against your plugin:

```bash
cd admin-panel
bun run scripts/{e2e-crud,visual-smoke,visual-interactions,bug-hunt}.ts
```

## Distribution

Push to npm:
```bash
cd plugins/gutu-plugin-fleet-core
bun publish
```

Customers install:
```bash
cd customer-host
bun add @acme/gutu-fleet-core
# add "@acme/gutu-fleet-core" to package.json["gutuPlugins"]
# (no other changes needed)
bun run start
```

Ship a UI?
```bash
# add "@acme/gutu-fleet-core" to admin-panel/package.json["gutuPlugins"]
# Vite's import.meta.glob picks it up automatically
bun run dev:ui
```

## Lifecycle order

```
boot:     loadPlugins → register resources → migrate → installIfNeeded → mountRoutes → start
runtime:  request → drain check → trace → security → body cap → rate limit → metrics → CORS → tenant → plugin route
SIGTERM:  /api/ready flips 503 → drainMiddleware refuses new → wait inflight → stopPlugins → exit
```

Resources are registered eagerly inside `loadPlugins` (BEFORE
`migrate`) so the picker UI and the resource-write gate see the
catalog from request 1. Plugins do NOT need to call
`ctx.ui.registerResource(...)` from `start()` for the same data —
keeping the declaration on the manifest is the canonical path.

## Health + observability

Every plugin should implement `health()` if it has a non-trivial
worker; the result surfaces in `/api/_plugins` and `/api/_metrics`.

```ts
health: async () => {
  const lastDispatch = db.prepare(
    "SELECT MAX(delivered_at) as t FROM webhook_deliveries"
  ).get();
  return {
    ok: lastDispatch?.t && Date.now() - new Date(lastDispatch.t).getTime() < 5 * 60_000,
    details: { lastDispatchAt: lastDispatch?.t },
  };
},
```
