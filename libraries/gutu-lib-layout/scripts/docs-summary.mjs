#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-layout",
  "packageId": "layout",
  "displayName": "Layout",
  "group": "UI Foundation",
  "maturity": "Baseline",
  "description": "Canonical layout primitives for workspace shells, dashboards, and builder splits.",
  "publicModules": 0,
  "exportedSymbols": 6,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Mixed runtime helpers",
  "consumptionModel": "Imports + typed UI primitives"
};
console.log(JSON.stringify(summary, null, 2));
