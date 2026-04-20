#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-ai-runtime",
  "packageId": "ai-runtime",
  "displayName": "AI Runtime",
  "group": "AI Foundation",
  "maturity": "Hardened",
  "description": "Durable agent runtime contracts, checkpoints, replay, and budget enforcement.",
  "publicModules": 1,
  "exportedSymbols": 40,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Headless typed exports",
  "consumptionModel": "Imports + typed helpers"
};
console.log(JSON.stringify(summary, null, 2));
