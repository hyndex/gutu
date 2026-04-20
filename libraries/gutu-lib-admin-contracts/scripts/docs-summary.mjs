#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-admin-contracts",
  "packageId": "admin-contracts",
  "displayName": "Admin Contracts",
  "group": "Admin Experience",
  "maturity": "Hardened",
  "description": "Governed admin-desk contracts, registries, access helpers, and legacy adapters.",
  "publicModules": 4,
  "exportedSymbols": 54,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Mixed runtime helpers",
  "consumptionModel": "Imports + typed UI primitives"
};
console.log(JSON.stringify(summary, null, 2));
