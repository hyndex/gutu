/** Provider presets — turn a short provider tag + a few fields into a full
 *  `S3AdapterConfig`. Captures the quirks nobody should have to memorize:
 *  R2 wants `auto` region, MinIO wants path-style, Wasabi wants its
 *  region-specific endpoint, and so on.
 *
 *  Each preset is a pure function. Users can always skip the preset and
 *  pass a raw config. */

import type { S3AdapterConfig, S3Provider } from "./s3";

export interface PresetInput {
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Region — required for AWS/Wasabi/DO Spaces, ignored for R2/MinIO. */
  region?: string;
  /** Endpoint override — required for MinIO/R2/custom, optional for AWS. */
  endpoint?: string;
  /** Optional per-tenant key prefix template. */
  tenantPrefixTemplate?: string;
  /** For Cloudflare R2: the account id. Composes the default endpoint if
   *  `endpoint` isn't supplied. */
  accountId?: string;
  /** Wasabi / DO Spaces / Linode: a region slug used to construct the
   *  canonical endpoint when `endpoint` isn't supplied. */
  regionSlug?: string;
}

export function preset(provider: S3Provider, input: PresetInput): S3AdapterConfig {
  const creds = {
    accessKeyId: input.accessKeyId,
    secretAccessKey: input.secretAccessKey,
  };
  const shared = {
    bucket: input.bucket,
    credentials: creds,
    ...(input.tenantPrefixTemplate !== undefined && {
      tenantPrefixTemplate: input.tenantPrefixTemplate,
    }),
  };

  switch (provider) {
    case "aws":
      if (!input.region) throw new Error("aws preset requires `region`");
      return {
        provider: "aws",
        region: input.region,
        ...shared,
      };

    case "cloudflare-r2": {
      const endpoint =
        input.endpoint ??
        (input.accountId
          ? `https://${input.accountId}.r2.cloudflarestorage.com`
          : undefined);
      if (!endpoint) throw new Error("cloudflare-r2 preset requires `endpoint` or `accountId`");
      return {
        provider: "cloudflare-r2",
        region: "auto",
        endpoint,
        forcePathStyle: false,
        ...shared,
      };
    }

    case "minio":
      if (!input.endpoint) throw new Error("minio preset requires `endpoint`");
      return {
        provider: "minio",
        region: input.region ?? "us-east-1",
        endpoint: input.endpoint,
        forcePathStyle: true,
        ...shared,
      };

    case "wasabi": {
      const region = input.region ?? input.regionSlug;
      if (!region) throw new Error("wasabi preset requires `region`");
      const endpoint = input.endpoint ?? `https://s3.${region}.wasabisys.com`;
      return {
        provider: "wasabi",
        region,
        endpoint,
        ...shared,
      };
    }

    case "backblaze-b2": {
      const region = input.region ?? input.regionSlug ?? "us-west-001";
      const endpoint = input.endpoint ?? `https://s3.${region}.backblazeb2.com`;
      return {
        provider: "backblaze-b2",
        region,
        endpoint,
        ...shared,
      };
    }

    case "digitalocean-spaces": {
      const region = input.region ?? input.regionSlug;
      if (!region) throw new Error("digitalocean-spaces preset requires `region`");
      const endpoint = input.endpoint ?? `https://${region}.digitaloceanspaces.com`;
      return {
        provider: "digitalocean-spaces",
        region,
        endpoint,
        ...shared,
      };
    }

    case "scaleway": {
      const region = input.region ?? input.regionSlug ?? "fr-par";
      const endpoint = input.endpoint ?? `https://s3.${region}.scw.cloud`;
      return {
        provider: "scaleway",
        region,
        endpoint,
        ...shared,
      };
    }

    case "linode": {
      const region = input.region ?? input.regionSlug;
      if (!region) throw new Error("linode preset requires `region` (e.g. 'us-east-1')");
      const endpoint = input.endpoint ?? `https://${region}.linodeobjects.com`;
      return {
        provider: "linode",
        region,
        endpoint,
        ...shared,
      };
    }

    case "vultr": {
      const region = input.region ?? input.regionSlug;
      if (!region) throw new Error("vultr preset requires `region` (e.g. 'ewr1')");
      const endpoint = input.endpoint ?? `https://${region}.vultrobjects.com`;
      return {
        provider: "vultr",
        region,
        endpoint,
        ...shared,
      };
    }

    case "oracle-cloud": {
      const region = input.region;
      if (!region || !input.endpoint)
        throw new Error("oracle-cloud preset requires `region` and `endpoint` (tenancy namespace)");
      return {
        provider: "oracle-cloud",
        region,
        endpoint: input.endpoint,
        forcePathStyle: true,
        ...shared,
      };
    }

    case "ibm-cloud": {
      const region = input.region;
      if (!region || !input.endpoint)
        throw new Error("ibm-cloud preset requires `region` and `endpoint`");
      return {
        provider: "ibm-cloud",
        region,
        endpoint: input.endpoint,
        ...shared,
      };
    }

    case "custom": {
      if (!input.endpoint || !input.region)
        throw new Error("custom preset requires `endpoint` and `region`");
      return {
        provider: "custom",
        region: input.region,
        endpoint: input.endpoint,
        forcePathStyle: true,
        ...shared,
      };
    }
  }
}

/** Enumerate all providers for UI dropdowns. */
export const PROVIDERS: readonly S3Provider[] = [
  "aws",
  "cloudflare-r2",
  "minio",
  "wasabi",
  "backblaze-b2",
  "digitalocean-spaces",
  "scaleway",
  "linode",
  "vultr",
  "oracle-cloud",
  "ibm-cloud",
  "custom",
] as const;

/** Human labels for UI. */
export const PROVIDER_LABEL: Record<S3Provider, string> = {
  "aws": "Amazon S3",
  "cloudflare-r2": "Cloudflare R2",
  "minio": "MinIO",
  "wasabi": "Wasabi",
  "backblaze-b2": "Backblaze B2 (S3-compat)",
  "digitalocean-spaces": "DigitalOcean Spaces",
  "scaleway": "Scaleway Object Storage",
  "linode": "Linode Object Storage",
  "vultr": "Vultr Object Storage",
  "oracle-cloud": "Oracle Cloud Object Storage",
  "ibm-cloud": "IBM Cloud Object Storage",
  "custom": "Custom S3-compatible",
};
