#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-query",
  "packageId": "query",
  "displayName": "Query",
  "group": "Core Data And Query",
  "maturity": "Baseline",
  "description": "Canonical TanStack Query wrapper with unified keys and optimistic helpers.",
  "publicModules": 1,
  "exportedSymbols": 6,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Headless typed exports",
  "consumptionModel": "Imports + typed helpers"
};
console.log(JSON.stringify(summary, null, 2));
