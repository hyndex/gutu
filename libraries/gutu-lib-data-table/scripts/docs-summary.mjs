#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-data-table",
  "packageId": "data-table",
  "displayName": "Data Table",
  "group": "Core Data And Query",
  "maturity": "Hardened",
  "description": "Canonical data-table wrapper with TanStack Table and Virtual helpers.",
  "publicModules": 1,
  "exportedSymbols": 12,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Headless typed exports",
  "consumptionModel": "Imports + typed helpers"
};
console.log(JSON.stringify(summary, null, 2));
