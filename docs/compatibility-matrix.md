# Compatibility Matrix

## Core Toolchain

| Surface | Supported Baseline | Notes |
| --- | --- | --- |
| Bun runtime | `>=1.3.12` | primary runtime and test tool |
| TypeScript | `5.8.x` | repo baseline |
| Node APIs | bundled via Bun / TS node typings | some libraries use `node:*` modules directly |

## Databases

| Surface | Supported Baseline | Notes |
| --- | --- | --- |
| PostgreSQL | 16.x | primary production database target |
| SQLite | local/dev support | useful for local framework execution and narrow tests |

## Operating Systems

| Surface | Status | Notes |
| --- | --- | --- |
| Linux | verified | included in workspace-init CI smoke coverage |
| macOS | verified locally | default development environment for this repo |
| Windows | partial but verified for workspace init | copy-mode init smoke is wired into CI; full runtime parity still needs deeper coverage |

## Browser And UI Verification

| Surface | Supported Baseline | Notes |
| --- | --- | --- |
| Chromium / Playwright | current workspace baseline | used for platform dev-console verification |

## MCP

| Surface | Supported Baseline | Notes |
| --- | --- | --- |
| stdio server | MCP `2025-03-26` | `gutu mcp serve` negotiates and serves newline-delimited JSON-RPC over stdio |

## Support Notes

- Repo-local CLI and package development are the primary supported workflows.
- Direct npm/binary consumer flows depend on the latest published package metadata and release credentials.
- External provider connectors and remote MCP connector fleets are outside the supported baseline of this repository today.
