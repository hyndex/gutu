#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-ui",
  "packageId": "ui",
  "displayName": "UI",
  "group": "UI Foundation",
  "maturity": "Hardened",
  "description": "Canonical admin UI wrapper surface over shared shell primitives.",
  "publicModules": 1,
  "exportedSymbols": 22,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Mixed runtime helpers",
  "consumptionModel": "Imports + typed UI primitives"
};
console.log(JSON.stringify(summary, null, 2));
