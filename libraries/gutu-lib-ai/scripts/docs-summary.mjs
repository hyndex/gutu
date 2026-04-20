#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-ai",
  "packageId": "ai",
  "displayName": "AI",
  "group": "AI Foundation",
  "maturity": "Hardened",
  "description": "AI provider contract helpers and tool orchestration types.",
  "publicModules": 0,
  "exportedSymbols": 23,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Headless typed exports",
  "consumptionModel": "Imports + typed helpers"
};
console.log(JSON.stringify(summary, null, 2));
