#!/usr/bin/env node
const summary = {
  "repoName": "gutu-lib-ui-editor",
  "packageId": "ui-editor",
  "displayName": "UI Editor",
  "group": "UI Foundation",
  "maturity": "Baseline",
  "description": "Tiptap wrapper APIs.",
  "publicModules": 0,
  "exportedSymbols": 8,
  "verificationLabel": "Build+Typecheck+Lint+Test",
  "uiSurface": "Headless typed exports",
  "consumptionModel": "Imports + typed helpers"
};
console.log(JSON.stringify(summary, null, 2));
