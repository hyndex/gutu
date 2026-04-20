#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-editor",
  "packageId": "editor",
  "displayName": "Editor",
  "group": "UI Foundation",
  "maturity": "Baseline",
  "description": "Editor reusable library exports.",
  "publicModules": 0,
  "exportedSymbols": 0,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "React UI + typed helpers",
  "consumptionModel": "Imports + typed UI primitives"
};
console.log(JSON.stringify(summary, null, 2));
