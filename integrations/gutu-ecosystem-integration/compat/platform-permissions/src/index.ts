export type PolicyDefinition = {
  id: string;
  [key: string]: unknown;
};

export type InstallReviewPlan = {
  mode: "approved" | "restricted-preview";
  effectiveManifest: Record<string, unknown> & {
    isolationProfile: string;
  };
  strippedCapabilities: string[];
  strippedHosts: string[];
  requiredApprovals: string[];
};

export function definePolicy<T extends PolicyDefinition>(definition: T): Readonly<T> {
  return Object.freeze({
    ...definition
  });
}

export function createInstallReviewPlan(
  manifest: Record<string, unknown> & {
    requestedCapabilities?: string[] | undefined;
    requestedHosts?: string[] | undefined;
    isolationProfile?: string | undefined;
    trustTier?: string | undefined;
  },
  options: { allowRestrictedPreview?: boolean | undefined } = {}
): InstallReviewPlan {
  const canRestrict = manifest.trustTier === "unknown" && options.allowRestrictedPreview;

  return {
    mode: canRestrict ? "restricted-preview" : "approved",
    effectiveManifest: {
      ...manifest,
      isolationProfile: canRestrict ? "declarative-only" : manifest.isolationProfile ?? "same-process-trusted"
    },
    strippedCapabilities: canRestrict ? [...(manifest.requestedCapabilities ?? [])] : [],
    strippedHosts: canRestrict ? [...(manifest.requestedHosts ?? [])] : [],
    requiredApprovals: canRestrict ? ["maintainer-review", "signature-verification"] : []
  };
}
