#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-form",
  "packageId": "form",
  "displayName": "Form",
  "group": "Core Data And Query",
  "maturity": "Baseline",
  "description": "Canonical form wrapper with field access, autosave, and relation helpers.",
  "publicModules": 1,
  "exportedSymbols": 8,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Headless typed exports",
  "consumptionModel": "Imports + typed helpers"
};
console.log(JSON.stringify(summary, null, 2));
