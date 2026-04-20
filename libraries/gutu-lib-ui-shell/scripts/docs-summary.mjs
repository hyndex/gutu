#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-ui-shell",
  "packageId": "ui-shell",
  "displayName": "UI Shell",
  "group": "UI Foundation",
  "maturity": "Hardened",
  "description": "Shared shell registry, navigation, provider, and telemetry contracts.",
  "publicModules": 6,
  "exportedSymbols": 43,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "React UI + typed helpers",
  "consumptionModel": "Imports + providers + callbacks"
};
console.log(JSON.stringify(summary, null, 2));
