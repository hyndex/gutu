# Gutu Core Architecture

## Intent

This repository is the canonical core of the Gutu ecosystem. It is intentionally smaller than the extracted workspace that now surrounds it.

## Active Components

### `@gutu/kernel`

Owns:

- package manifest shape
- repository role and package-kind rules
- core-repo boundary enforcement

### `@gutu/ecosystem`

Owns:

- ecosystem catalog entry model
- compatibility channel model
- workspace lockfile and overrides model
- consumer workspace bootstrap files
- artifact download, digest verification, and vendor installation
- external repository scaffolding for plugin/library/integration repos

### `@gutu/release`

Owns:

- release bundle preparation
- manifest and provenance generation
- manifest signing and signature verification

### `@gutu/cli`

Owns:

- `gutu init`
- `gutu doctor`
- human-readable command output around core and workspace state

## Explicit Non-Goals

- plugin execution
- plugin source hosting
- built-in application surfaces
- product admin shells
- legacy framework distribution bundling

## Boundary

Plugin, library, app, catalog, and integration repositories now live outside this repo in sibling folders of the umbrella workspace. They are not part of the active core architecture.
