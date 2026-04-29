# Internet-Product Clone Framework — Verification Checklist

A release is **NOT** ready until every box is ticked.

## Per-plugin gate

For every plugin in Phases 1–4:

- [ ] `package.json` has `name`, `version`, `private: true`, `type: "module"`,
      `exports`.
- [ ] `framework/builtin-plugins/<id>/src/host-plugin/index.ts` exports
      `hostPlugin: HostPlugin`.
- [ ] `hostPlugin.id` exactly matches the plugin code.
- [ ] `hostPlugin.version` is semver.
- [ ] `hostPlugin.manifest.label` is human-readable.
- [ ] `hostPlugin.manifest.permissions` lists every host-SDK capability the
      plugin uses.
- [ ] `hostPlugin.dependsOn` references **only** existing first-party
      plugin ids; no soft references via comments.
- [ ] `hostPlugin.resources` declares every record-shaped resource the
      plugin owns (or is intentionally empty for cross-cutting plugins).
- [ ] Every declared resource id matches `<plugin>.<entity>` (lowercase,
      optional hyphens).
- [ ] `migrate()` is idempotent (`CREATE TABLE IF NOT EXISTS`,
      `ALTER TABLE … IF NOT EXISTS` via PRAGMA).
- [ ] Unit tests pass.
- [ ] Integration test (action → event → DB → cross-plugin reaction) passes.
- [ ] Tenant-isolation test passes (cross-tenant queries return empty).
- [ ] Plugin appears as `loaded` on `/api/_plugins` after boot.
- [ ] Every declared resource appears in `/api/ui/resources`.

## Per-pack gate

For every pack in Phase 5:

- [ ] `packs/<name>/pack.json` validates against the pack schema.
- [ ] Every plugin id in `pack.plugins[]` is in HOST_PLUGINS.
- [ ] Every role in `pack.roles[]` references valid permissions.
- [ ] Every dashboard id in `pack.dashboards[]` is implemented (or marked
      as Phase 5 deferred).
- [ ] Sample data fixture loads without errors.
- [ ] The pack-level acceptance test from §9 of the instruction plan
      passes against the installed pack.

## Cross-cutting gate

- [ ] `bun test` (backend) shows 0 failures.
- [ ] `bun x tsc --noEmit` (backend `src/`) shows 0 errors for shipped
      code (pre-existing plugin-side errors are tracked separately).
- [ ] `bun x tsc --noEmit` (frontend) shows 0 errors.
- [ ] `scripts/internet-products-smoke.ts` exits 0.
- [ ] Backend `/api/health` returns 200.
- [ ] Backend `/api/ready` returns 200 within 5s of boot.
- [ ] No quarantined plugins on `/api/_plugins`.
- [ ] No cross-plugin direct DB access (audited via grep
      `INSERT INTO|UPDATE|DELETE FROM` outside the owning plugin).
- [ ] No imports between plugin source folders (audited via dependency
      graph in `graphify-out/GRAPH_REPORT.md`).

## Production-readiness gate

- [ ] Every plugin's `manifest.permissions` enforced under
      `GUTU_PERMISSIONS=enforce`.
- [ ] Every action emits at least one domain event.
- [ ] Every event row has `prev_hash` linking to predecessor (audit chain
      intact via `/api/audit/verify`).
- [ ] Every workflow has a quarantine path for stuck instances.
- [ ] Every job is wrapped in `withLeadership()` (no two replicas run the
      same cron).
- [ ] Every external HTTP egress goes through the `net.outbound` capability
      and is logged.
- [ ] No secret values in plugin source or fixtures (scanned via
      `gitleaks`).
- [ ] PII fields tagged in plugin schema for GDPR fan-out.
- [ ] `exportSubjectData` and `deleteSubjectData` implemented for plugins
      that own user-attributed data.

## Release notes template

```md
## Internet-Product Clone Framework — Phase <N>

Plugins shipped:
- <plugin-id> (resources, actions, events, jobs, workflows)
- ...

Packs available:
- <pack-name> — composes <plugin-list>

Verification:
- <X>/<Y> tests pass
- <X>/<Y> packs installable
- /api/_plugins reports <X> loaded plugins, 0 quarantined

Breaking changes: none.
Migration required: none — every plugin migrates idempotently on first boot.
```
