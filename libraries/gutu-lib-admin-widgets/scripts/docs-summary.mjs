#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-admin-widgets",
  "packageId": "admin-widgets",
  "displayName": "Admin Widgets",
  "group": "Admin Experience",
  "maturity": "Hardened",
  "description": "Admin Widgets reusable library exports.",
  "publicModules": 1,
  "exportedSymbols": 16,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Mixed runtime helpers",
  "consumptionModel": "Imports + typed UI primitives"
};
console.log(JSON.stringify(summary, null, 2));
