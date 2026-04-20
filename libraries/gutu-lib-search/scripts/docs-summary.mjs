#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-search",
  "packageId": "search",
  "displayName": "Search",
  "group": "Core Data And Query",
  "maturity": "Hardened",
  "description": "Search abstraction layer.",
  "publicModules": 0,
  "exportedSymbols": 21,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Headless typed exports",
  "consumptionModel": "Imports + typed helpers"
};
console.log(JSON.stringify(summary, null, 2));
