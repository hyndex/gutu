#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-chart",
  "packageId": "chart",
  "displayName": "Chart",
  "group": "UI Foundation",
  "maturity": "Hardened",
  "description": "Canonical ECharts-backed chart presets and rendering contracts.",
  "publicModules": 0,
  "exportedSymbols": 15,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Mixed runtime helpers",
  "consumptionModel": "Imports + typed UI primitives"
};
console.log(JSON.stringify(summary, null, 2));
