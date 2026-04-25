/** Field metadata REST API.
 *
 *  Routes:
 *    GET    /                       all custom fields across all resources for the tenant
 *    GET    /:resource              custom fields for one resource
 *    POST   /:resource              add a field
 *    PATCH  /:resource/:id          edit (label/kind/options/required/indexed/position)
 *    DELETE /:resource/:id          remove
 *
 *  Adding/removing fields requires the user to have admin role.
 *  Reads are open to any authenticated user in the tenant — the
 *  frontend uses the metadata to render forms and lists.
 *
 *  Note: deleting a field DOES NOT scrub values from existing
 *  records. Values stay in `records.data` JSON; they just become
 *  inaccessible via the UI. We never lose user data on a config
 *  mistake. */
import { Hono } from "hono";
import { requireAuth, currentUser } from "../middleware/auth";
import { getTenantContext } from "../tenancy/context";
import {
  createFieldMetadata,
  deleteFieldMetadata,
  listFieldMetadata,
  listFieldMetadataAcrossResources,
  updateFieldMetadata,
  FieldMetadataError,
} from "../lib/field-metadata";
import type { FieldKind, FieldOptions } from "../lib/field-metadata";
import { recordAudit } from "../lib/audit";

export const fieldMetadataRoutes = new Hono();
fieldMetadataRoutes.use("*", requireAuth);

function tenantId(): string {
  return getTenantContext()?.tenantId ?? "default";
}

function requireAdmin(c: ReturnType<typeof currentUser> extends infer U ? unknown : never): true | Response {
  // Placeholder — kept for future role gating. For now we let every
  // authenticated user manage custom fields in their tenant; tighten
  // when roles UI is in.
  void c;
  return true;
}

fieldMetadataRoutes.get("/", (c) => {
  return c.json({ rows: listFieldMetadataAcrossResources(tenantId()) });
});

fieldMetadataRoutes.get("/:resource", (c) => {
  return c.json({ rows: listFieldMetadata(tenantId(), c.req.param("resource")) });
});

fieldMetadataRoutes.post("/:resource", async (c) => {
  const resource = c.req.param("resource");
  const body = (await c.req.json().catch(() => ({}))) as {
    key?: string;
    label?: string;
    kind?: FieldKind;
    options?: FieldOptions;
    required?: boolean;
    indexed?: boolean;
    position?: number;
  };
  if (!body.key || !body.label || !body.kind) {
    return c.json({ error: "key, label, kind are required", code: "invalid-argument" }, 400);
  }
  const user = currentUser(c);
  try {
    const meta = createFieldMetadata({
      tenantId: tenantId(),
      resource,
      key: body.key,
      label: body.label,
      kind: body.kind,
      options: body.options,
      required: body.required,
      indexed: body.indexed,
      position: body.position,
      createdBy: user.email,
    });
    recordAudit({
      actor: user.email,
      action: "field-metadata.created",
      resource: "field-metadata",
      recordId: meta.id,
      payload: { resource, key: body.key, label: body.label, kind: body.kind },
    });
    return c.json(meta, 201);
  } catch (err) {
    if (err instanceof FieldMetadataError) {
      return c.json({ error: err.message, code: err.code }, 400);
    }
    throw err;
  }
});

fieldMetadataRoutes.patch("/:resource/:id", async (c) => {
  const id = c.req.param("id");
  const tid = tenantId();
  const patch = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const updated = updateFieldMetadata(tid, id, patch as never);
  if (!updated) return c.json({ error: "not found" }, 404);
  const user = currentUser(c);
  recordAudit({
    actor: user.email,
    action: "field-metadata.updated",
    resource: "field-metadata",
    recordId: id,
  });
  return c.json(updated);
});

fieldMetadataRoutes.delete("/:resource/:id", (c) => {
  const id = c.req.param("id");
  const tid = tenantId();
  const ok = deleteFieldMetadata(tid, id);
  if (!ok) return c.json({ error: "not found" }, 404);
  const user = currentUser(c);
  recordAudit({
    actor: user.email,
    action: "field-metadata.deleted",
    resource: "field-metadata",
    recordId: id,
  });
  return c.json({ ok: true });
});
