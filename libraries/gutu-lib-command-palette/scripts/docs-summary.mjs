#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-command-palette",
  "packageId": "command-palette",
  "displayName": "Command Palette",
  "group": "UI Foundation",
  "maturity": "Baseline",
  "description": "cmdk-backed command palette primitives for governed admin actions.",
  "publicModules": 0,
  "exportedSymbols": 10,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Mixed runtime helpers",
  "consumptionModel": "Imports + typed UI primitives"
};
console.log(JSON.stringify(summary, null, 2));
