#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-router",
  "packageId": "router",
  "displayName": "Router",
  "group": "Core Data And Query",
  "maturity": "Baseline",
  "description": "Canonical router wrapper with admin guards and safe zone links.",
  "publicModules": 1,
  "exportedSymbols": 6,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Headless typed exports",
  "consumptionModel": "Imports + typed helpers"
};
console.log(JSON.stringify(summary, null, 2));
