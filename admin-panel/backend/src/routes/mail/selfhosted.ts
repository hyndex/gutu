/** Self-hosted mail server (Stalwart / JMAP) configuration + DNS helper.
 *
 *  Endpoints:
 *    GET  /api/mail/self-hosted          — current config (sans secrets)
 *    POST /api/mail/self-hosted          — save config (URL + token);
 *                                            stores an encrypted JMAP
 *                                            connection record so the
 *                                            existing mail pipeline
 *                                            picks it up via driverFor.
 *    POST /api/mail/self-hosted/dns      — render DNS bundle for a
 *                                            domain + DKIM key.
 *    POST /api/mail/self-hosted/probe    — try to reach the JMAP
 *                                            session endpoint with the
 *                                            given URL + token; reports
 *                                            success or the precise
 *                                            error so admins can fix
 *                                            their config inline.
 *
 *  All endpoints are mounted under requireAuth + the tenant resolver
 *  (the parent mailRoutes router applies these). */

import { Hono } from "hono";
import { z } from "zod";
import { Buffer } from "node:buffer";
import { db } from "../../db";
import { requireAuth, currentUser } from "../../middleware/auth";
import { getTenantContext } from "../../tenancy/context";
import { encryptString } from "../../lib/mail/crypto/at-rest";
import { uuid } from "../../lib/id";
import {
  buildDnsBundle,
  bundleToZoneFile,
  isValidDomain,
  isValidMailHost,
} from "../../lib/mail/dns/records";

export const selfHostedRoutes = new Hono();
selfHostedRoutes.use("*", requireAuth);

const SaveBody = z.object({
  baseUrl: z.string().url().min(1),
  /** Stalwart admin/api token. Stored encrypted at rest. */
  token: z.string().min(1).max(2048),
  /** Default email used as the From address when sending via this
   *  connection. Must match a Stalwart account. */
  defaultEmail: z.string().email(),
  /** Display label for the connections list. */
  displayName: z.string().min(1).max(120).optional(),
});

const DnsBody = z.object({
  domain: z.string().min(1).max(253),
  mailHost: z.string().min(1).max(253),
  dkimSelector: z.string().min(1).max(63).optional(),
  dkimPublicKeyBase64: z.string().min(100),
  dkimKeyType: z.enum(["rsa", "ed25519"]).optional(),
  dmarcPolicy: z.enum(["none", "quarantine", "reject"]).optional(),
  dmarcRua: z.string().optional(),
  enableMtaSts: z.boolean().optional(),
  tlsRptEmail: z.string().email().optional(),
});

const ProbeBody = z.object({
  baseUrl: z.string().url(),
  token: z.string().min(1),
});

function tenantIdFromCtx(): string {
  return getTenantContext()?.tenantId ?? "default";
}

/* GET — current self-hosted JMAP config (token redacted). */
selfHostedRoutes.get("/", (c) => {
  const tenantId = tenantIdFromCtx();
  const user = currentUser(c);
  const row = db
    .prepare(
      `SELECT id, data FROM records WHERE resource = 'mail.connection'
       AND json_extract(data, '$.userId') = ?
       AND json_extract(data, '$.tenantId') = ?
       AND json_extract(data, '$.provider') = 'jmap'
       LIMIT 1`,
    )
    .get(user.id, tenantId) as { id: string; data: string } | undefined;
  if (!row) return c.json({ configured: false });
  const rec = JSON.parse(row.data) as Record<string, unknown>;
  return c.json({
    configured: true,
    connectionId: row.id,
    baseUrl: rec.imapHost as string | undefined,
    defaultEmail: rec.email as string | undefined,
    displayName: rec.displayName as string | undefined,
  });
});

/* POST — save / update the JMAP connection. */
selfHostedRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = SaveBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid body", issues: parsed.error.issues }, 400);
  }
  const { baseUrl, token, defaultEmail, displayName } = parsed.data;
  const tenantId = tenantIdFromCtx();
  const user = currentUser(c);

  // Normalise the URL — drop trailing slashes so the JMAP driver can
  // reliably append `/.well-known/jmap`.
  const cleanUrl = baseUrl.replace(/\/+$/, "");

  // Encrypt the token using the same at-rest helper that protects
  // OAuth tokens. The driver decrypts on every session bootstrap.
  const cipher = encryptString(token);
  const cipherBase64 = Buffer.from(cipher).toString("base64");

  const now = new Date().toISOString();

  // Upsert: one JMAP connection per (user, tenant). Nuking the existing
  // row is fine — the driver pool is keyed by connection id and will
  // refresh on next call.
  const existing = db
    .prepare(
      `SELECT id FROM records WHERE resource = 'mail.connection'
       AND json_extract(data, '$.userId') = ?
       AND json_extract(data, '$.tenantId') = ?
       AND json_extract(data, '$.provider') = 'jmap'
       LIMIT 1`,
    )
    .get(user.id, tenantId) as { id: string } | undefined;

  const id = existing?.id ?? uuid();
  const data = {
    id,
    userId: user.id,
    tenantId,
    provider: "jmap",
    email: defaultEmail,
    displayName: displayName ?? `Self-hosted (${new URL(cleanUrl).host})`,
    status: "active",
    accessTokenCipher: cipherBase64,
    imapHost: cleanUrl, // re-purposed as the JMAP base URL
    smtpHost: cleanUrl, // sends use Email/import + EmailSubmission via the same URL
    createdAt: existing ? undefined : now,
    updatedAt: now,
  };

  if (existing) {
    db.prepare(
      `UPDATE records SET data = ?, updated_at = ? WHERE resource = 'mail.connection' AND id = ?`,
    ).run(JSON.stringify(data), now, id);
  } else {
    db.prepare(
      `INSERT INTO records (resource, id, data, created_at, updated_at)
       VALUES ('mail.connection', ?, ?, ?, ?)`,
    ).run(id, JSON.stringify(data), now, now);
    // Grant the user owner ACL so they can read/edit it.
    db.prepare(
      `INSERT OR IGNORE INTO editor_acl
         (resource, record_id, subject_kind, subject_id, role, granted_by, granted_at)
       VALUES (?, ?, 'user', ?, 'owner', 'system:mail-self-hosted', ?)`,
    ).run("mail.connection", id, user.id, now);
    db.prepare(
      `INSERT OR IGNORE INTO editor_acl
         (resource, record_id, subject_kind, subject_id, role, granted_by, granted_at)
       VALUES (?, ?, 'tenant', ?, 'editor', 'system:mail-self-hosted', ?)`,
    ).run("mail.connection", id, tenantId, now);
  }
  return c.json({ ok: true, connectionId: id });
});

/* POST — render the DNS bundle for a domain. */
selfHostedRoutes.post("/dns", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = DnsBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid body", issues: parsed.error.issues }, 400);
  }
  if (!isValidDomain(parsed.data.domain)) {
    return c.json({ error: "invalid domain" }, 400);
  }
  if (!isValidMailHost(parsed.data.mailHost, parsed.data.domain)) {
    return c.json({ error: "mailHost must equal or be a sub-host of domain" }, 400);
  }
  try {
    const bundle = buildDnsBundle(parsed.data);
    return c.json({
      bundle,
      zoneFile: bundleToZoneFile(bundle),
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

/* POST — probe the JMAP server. Reports the same Authorization-aware
 *  bootstrap path the driver uses, so admins see exactly what the live
 *  pipeline would see. */
selfHostedRoutes.post("/probe", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = ProbeBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid body", issues: parsed.error.issues }, 400);
  }
  const { baseUrl, token } = parsed.data;
  const url = baseUrl.replace(/\/+$/, "") + "/.well-known/jmap";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: token.startsWith("Basic ") || token.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return c.json({ ok: false, status: res.status, body: text.slice(0, 400) });
    }
    const session = (await res.json()) as {
      apiUrl?: string;
      primaryAccounts?: Record<string, string>;
      capabilities?: Record<string, unknown>;
    };
    const accountId = session.primaryAccounts?.["urn:ietf:params:jmap:mail"];
    return c.json({
      ok: true,
      apiUrl: session.apiUrl,
      hasMailAccount: !!accountId,
      capabilities: Object.keys(session.capabilities ?? {}),
    });
  } catch (err) {
    return c.json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  } finally {
    clearTimeout(timeout);
  }
});
