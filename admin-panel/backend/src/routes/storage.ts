import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import {
  getStorageRegistry,
  isStorageError,
  S3_PROVIDERS,
  S3_PROVIDER_LABEL,
  s3Preset,
  type S3PresetInput,
  type S3Provider,
} from "../storage";

export const storageRoutes = new Hono();
storageRoutes.use("*", requireAuth);

/** GET /api/storage/backends — list registered backends (config without
 *  secrets). */
storageRoutes.get("/backends", (c) => {
  const registry = getStorageRegistry();
  const backends = registry.listBackends().map((b) => ({
    id: b.id,
    kind: b.kind,
    label: b.label,
    isDefault: b.isDefault ?? false,
    acceptsWrites: b.acceptsWrites ?? true,
    // Scrub secrets before returning config.
    config: scrubConfig(b.config as Record<string, unknown>),
  }));
  return c.json({
    backends,
    defaultId: registry.getDefaultId(),
    kinds: registry.listKinds(),
  });
});

/** GET /api/storage/providers — list supported S3 providers + their labels.
 *  Consumed by the admin UI's "add backend" dialog. */
storageRoutes.get("/providers", (c) => {
  return c.json({
    s3: S3_PROVIDERS.map((id) => ({
      id,
      label: S3_PROVIDER_LABEL[id],
    })),
  });
});

/** POST /api/storage/preset — compute a full S3AdapterConfig from a preset
 *  tag + a handful of fields. Keeps provider quirks (R2 region, MinIO
 *  path-style, Wasabi endpoint template) in the server so the UI stays
 *  thin. */
storageRoutes.post("/preset", async (c) => {
  const body = (await c.req.json().catch(() => null)) as
    | { provider?: S3Provider; input?: S3PresetInput }
    | null;
  if (!body?.provider || !body.input) {
    return c.json({ error: "provider + input required" }, 400);
  }
  try {
    const cfg = s3Preset(body.provider, body.input);
    return c.json(scrubConfig(cfg as unknown as Record<string, unknown>));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

/** POST /api/storage/test — run healthcheck on a registered backend. */
storageRoutes.post("/test", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { slug?: string } | null;
  if (!body?.slug) return c.json({ error: "slug required" }, 400);
  const registry = getStorageRegistry();
  try {
    const adapter = registry.getAdapter(body.slug);
    const res = await adapter.healthcheck();
    return c.json(res);
  } catch (err) {
    if (isStorageError(err)) {
      return c.json({ ok: false, error: err.message, code: err.code });
    }
    return c.json({ ok: false, error: (err as Error).message });
  }
});

/** Recursively replace values that look like secrets with `"<redacted>"`.
 *  Conservative — better to over-hide than leak. */
function scrubConfig(config: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (isSecretKey(k)) {
      out[k] = typeof v === "string" && v.length > 0 ? "<redacted>" : v;
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = scrubConfig(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function isSecretKey(k: string): boolean {
  const low = k.toLowerCase();
  return (
    low.includes("secret") ||
    low.includes("password") ||
    low.includes("signing") ||
    low.includes("token") ||
    low.includes("apikey") ||
    low === "key" ||
    low === "accesskey" ||
    low === "accesskeyid" ||
    low === "secretaccesskey"
  );
}
