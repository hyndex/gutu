#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-ai-evals",
  "packageId": "ai-evals",
  "displayName": "AI Evals",
  "group": "AI Foundation",
  "maturity": "Hardened",
  "description": "Eval datasets, judges, regression comparison, and release gates for AI runs.",
  "publicModules": 0,
  "exportedSymbols": 17,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Headless typed exports",
  "consumptionModel": "Imports + typed helpers"
};
console.log(JSON.stringify(summary, null, 2));
