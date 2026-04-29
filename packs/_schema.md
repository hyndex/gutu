# Pack JSON schema

A pack is an installable product template — JSON-only, no code. It
composes plugins, roles, dashboards, workflows, and sample data into
a turnkey starter for a specific product family (Marketplace,
Quick Commerce, Ride-hailing, …).

```ts
interface Pack {
  id: string;                       // "pack-marketplace"
  version: string;                  // semver
  label: string;                    // "Marketplace clone pack"
  description: string;
  /** Every plugin id MUST exist in HOST_PLUGINS. */
  plugins: string[];
  /** Customer-facing surfaces enabled by the pack. */
  surfaces: string[];
  /** Roles seeded into role-policy-core when the pack installs. */
  roles: Array<{
    id: string;
    label: string;
    permissions: string[];
  }>;
  /** Dashboards registered into analytics-bi-core / dashboard-core. */
  dashboards: string[];
  /** Optional pointer to a JSON file co-located in the pack folder
   *  containing demo records to load on first install. */
  sampleData?: string;
  /** Per-pack acceptance test specs (loaded by smoke harness). */
  acceptanceTests?: string[];
}
```

The pack installer (future work — runs as a host action) reads
`pack.json`, validates every plugin id is in HOST_PLUGINS, seeds the
roles, registers the dashboards, and loads the sample data through
the host's resource API.
