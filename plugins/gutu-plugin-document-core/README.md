# Document Core

Document lifecycle and generated document backbone.

![Maturity: Baseline](https://img.shields.io/badge/Maturity-Baseline-7c3aed) ![Verification: Build+Typecheck+Lint+Test+Contracts](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest%2BContracts-6b7280) ![DB: postgres+sqlite](https://img.shields.io/badge/DB-postgres%2Bsqlite-2563eb) ![Integration Model: Actions+Resources+UI](https://img.shields.io/badge/Integration%20Model-Actions%2BResources%2BUI-6b7280)

## What It Does Now

Tracks generated documents and their lifecycle so other plugins can treat document artifacts as a governed domain object.

- Exports 1 governed action: `document.records.finalize`.
- Owns 1 resource contract: `document.records`.
- Registers a bounded UI surface that can be hosted by the surrounding admin or portal shell.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.

## Maturity

**Maturity Tier:** `Baseline`

This tier is justified because unit coverage exists, and contract coverage exists.

## Verified Capability Summary

- Group: **Content and Experience**
- Verification surface: **Build+Typecheck+Lint+Test+Contracts**
- Tests discovered: **2** total files across unit, contract lanes
- Integration model: **Actions+Resources+UI**
- Database support: **postgres + sqlite**

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package | `@plugins/document-core` |
| Manifest ID | `document-core` |
| Repo | [gutu-plugin-document-core](https://github.com/gutula/gutu-plugin-document-core) |
| Depends On | `auth-core`, `org-tenant-core`, `role-policy-core`, `audit-core` |
| Requested Capabilities | `ui.register.admin`, `api.rest.mount`, `data.write.document` |
| Provided Capabilities | `document.records` |
| Runtime | bun>=1.3.12 |
| Database | postgres, sqlite |
| Integration Model | Actions+Resources+UI |

## Capability Matrix

| Surface | Count | Details |
| --- | --- | --- |
| Actions | 1 | `document.records.finalize` |
| Resources | 1 | `document.records` |
| Jobs | 0 | No job catalog exported |
| Workflows | 0 | No workflow catalog exported |
| UI | Present | base UI surface |

## Quick Start For Integrators

Use this repo inside a **compatible Gutu workspace** or the **ecosystem certification workspace** so its `workspace:*` dependencies resolve honestly.

```bash
# from a compatible workspace that already includes this plugin's dependency graph
bun install
bun run build
bun run test
bun run docs:check
```

```ts
import { manifest, finalizeDocumentRecordAction, DocumentRecordResource, uiSurface } from "@plugins/document-core";

console.log(manifest.id);
console.log(finalizeDocumentRecordAction.id);
console.log(DocumentRecordResource.id);
```

Use the root repo scripts for day-to-day work **after the workspace is bootstrapped**, or run the nested package directly from `framework/builtin-plugins/document-core` if you need lower-level control.

## Current Test Coverage

- Root verification scripts: `bun run build`, `bun run typecheck`, `bun run lint`, `bun run test`, `bun run test:contracts`, `bun run test:unit`, `bun run docs:check`
- Unit files: 1
- Contracts files: 1
- Integration files: 0
- Migrations files: 0

## Known Boundaries And Non-Goals

- Not a monolithic website builder or headless-CMS replacement beyond the specific content surfaces exported here.
- Not a generic front-end framework; UI behavior remains bounded to the plugin’s declared resources and surfaces.
- Cross-plugin composition should use Gutu command, event, job, and workflow primitives. This repo should not be documented as exposing a generic WordPress-style hook system unless one is explicitly exported.

## Recommended Next Milestones

- Clarify generation pipelines and downstream archival rules as more document-producing plugins appear.
- Add stronger file and template integration guidance when document outputs become a common platform contract.
- Deepen publishing, review, search, or portal flows where current resources and actions already suggest the next stable step.
- Add richer admin and operator guidance once the domain lifecycle hardens.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Add explicit migration or rollback coverage if this domain becomes more operationally sensitive.
- Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.
- Broaden the admin entry surface only if operators need more than the current embedded view or resource listing.

## More Docs

See [DEVELOPER.md](./DEVELOPER.md), [TODO.md](./TODO.md), [SECURITY.md](./SECURITY.md), [CONTRIBUTING.md](./CONTRIBUTING.md). The internal domain sources used to build those docs live under:

- `plugins/gutu-plugin-document-core/framework/builtin-plugins/document-core/docs/AGENT_CONTEXT.md`
- `plugins/gutu-plugin-document-core/framework/builtin-plugins/document-core/docs/BUSINESS_RULES.md`
- `plugins/gutu-plugin-document-core/framework/builtin-plugins/document-core/docs/EDGE_CASES.md`
- `plugins/gutu-plugin-document-core/framework/builtin-plugins/document-core/docs/FLOWS.md`
- `plugins/gutu-plugin-document-core/framework/builtin-plugins/document-core/docs/GLOSSARY.md`
- `plugins/gutu-plugin-document-core/framework/builtin-plugins/document-core/docs/MANDATORY_STEPS.md`
