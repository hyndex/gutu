#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-admin-reporting",
  "packageId": "admin-reporting",
  "displayName": "Admin Reporting",
  "group": "Admin Experience",
  "maturity": "Baseline",
  "description": "Report contracts, filter validation, and semantic execution requests.",
  "publicModules": 0,
  "exportedSymbols": 8,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Headless typed exports",
  "consumptionModel": "Imports + typed helpers"
};
console.log(JSON.stringify(summary, null, 2));
