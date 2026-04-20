#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-ui-kit",
  "packageId": "ui-kit",
  "displayName": "UI Kit",
  "group": "UI Foundation",
  "maturity": "Hardened",
  "description": "Shared Radix and shell primitives.",
  "publicModules": 0,
  "exportedSymbols": 16,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Mixed runtime helpers",
  "consumptionModel": "Imports + typed UI primitives"
};
console.log(JSON.stringify(summary, null, 2));
