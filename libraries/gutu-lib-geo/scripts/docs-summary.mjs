#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-geo",
  "packageId": "geo",
  "displayName": "Geo",
  "group": "Core Data And Query",
  "maturity": "Hardened",
  "description": "Geo abstraction and provider contracts.",
  "publicModules": 0,
  "exportedSymbols": 15,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Headless typed exports",
  "consumptionModel": "Imports + typed helpers"
};
console.log(JSON.stringify(summary, null, 2));
