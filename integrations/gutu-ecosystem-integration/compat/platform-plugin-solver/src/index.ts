export type SolvableManifest = {
  id: string;
  dependsOn?: string[] | undefined;
  trustTier?: string | undefined;
  [key: string]: unknown;
};

export function solvePackageGraph(input: {
  requested: string[];
  manifests: SolvableManifest[];
  platformVersion?: string | undefined;
  runtimeVersion?: string | undefined;
  dbEngine?: string | undefined;
  allowRestrictedPreviewForUnknownPlugins?: boolean | undefined;
}) {
  const manifestMap = new Map(input.manifests.map((manifest) => [manifest.id, manifest]));
  const orderedActivation: string[] = [];
  const warnings: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(id: string) {
    if (visited.has(id)) {
      return;
    }
    if (visiting.has(id)) {
      warnings.push(`cycle detected while solving ${id}`);
      return;
    }

    visiting.add(id);
    const manifest = manifestMap.get(id);
    if (!manifest) {
      warnings.push(`missing manifest for ${id}`);
      visiting.delete(id);
      return;
    }

    for (const dependency of manifest.dependsOn ?? []) {
      visit(dependency);
    }

    if (manifest.trustTier === "unknown" && input.allowRestrictedPreviewForUnknownPlugins) {
      warnings.push(`restricted preview enabled for ${manifest.id}`);
    }

    orderedActivation.push(manifest.id);
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of input.requested) {
    visit(id);
  }

  return {
    orderedActivation,
    warnings
  };
}
