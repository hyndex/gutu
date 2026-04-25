/** /api/mail/connections — manage user's mailbox links + OAuth flow. */

import { Hono } from "hono";
import { requireAuth, currentUser } from "../../middleware/auth";
import { db, nowIso } from "../../db";
import { uuid } from "../../lib/id";
import { recordAudit } from "../../lib/audit";
import { broadcastResourceChange } from "../../lib/ws";
import { encryptString } from "../../lib/mail/crypto/at-rest";
import { ensureProviders, getProvider, genState, genPkceVerifier, persistState, consumeState } from "../../lib/mail/oauth";
import { loadRecord, saveRecord, tenantId, userIdOf, errorResponse } from "./_helpers";

export const connectionsRoutes = new Hono();
connectionsRoutes.use("*", requireAuth);

interface MailConnection {
  id: string;
  userId: string;
  tenantId: string;
  provider: string;
  email: string;
  displayName?: string;
  status: "active" | "auth_required" | "error" | "disabled";
  accessTokenCipher?: string;
  refreshTokenCipher?: string;
  passwordCipher?: string;
  tokenExpiresAt?: string;
  oauthScope?: string;
  imapHost?: string;
  imapPort?: number;
  imapTLS?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpTLS?: boolean;
  username?: string;
  isDefault?: boolean;
  isShared?: boolean;
  lastSyncAt?: string;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

connectionsRoutes.get("/", (c) => {
  const userId = userIdOf(c);
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.connection'
       AND json_extract(data, '$.userId') = ?`,
    )
    .all(userId) as { data: string }[];
  const items = rows
    .map((r) => JSON.parse(r.data) as MailConnection)
    .filter((r) => r.tenantId === tenantId() || !r.tenantId)
    .filter((r) => !("deletedAt" in r) || (r as { deletedAt?: string }).deletedAt === undefined)
    .map((r) => publicShape(r))
    .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  return c.json({ rows: items, total: items.length });
});

connectionsRoutes.get("/:id", (c) => {
  const id = c.req.param("id") ?? "";
  const conn = loadRecord<MailConnection>("mail.connection", id);
  if (!conn || conn.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "connection not found");
  return c.json(publicShape(conn));
});

/* -------- OAuth flow -------- */

connectionsRoutes.post("/oauth/:provider/start", async (c) => {
  ensureProviders();
  const providerId = c.req.param("provider") ?? "";
  const provider = getProvider(providerId);
  if (!provider) return errorResponse(c, 400, "unknown-provider", `unknown provider ${providerId}`);
  let body: { redirectUri?: string; scope?: string[]; loginHint?: string; returnTo?: string } = {};
  try { body = (await c.req.json()) as typeof body; } catch { /* none */ }
  const redirectUri = body.redirectUri ?? `${publicBase()}/api/mail/connections/oauth/${providerId}/callback`;
  const state = genState();
  const verifier = genPkceVerifier();
  const scope = (body.scope ?? provider.defaultScope).join(" ");
  persistState({
    state,
    provider: providerId,
    tenantId: tenantId(),
    userId: userIdOf(c),
    pkceVerifier: verifier,
    redirectUri,
    scope,
    returnTo: body.returnTo,
  });
  const auth = provider.authorize({ redirectUri, state, pkceVerifier: verifier, scope: scope.split(" ").filter(Boolean), loginHint: body.loginHint });
  return c.json({ url: auth.url, state });
});

connectionsRoutes.get("/oauth/:provider/callback", async (c) => {
  ensureProviders();
  const code = c.req.query("code") ?? "";
  const state = c.req.query("state") ?? "";
  if (!code || !state) return errorResponse(c, 400, "missing-params", "missing code or state");
  const stateRow = consumeState(state);
  if (!stateRow) return errorResponse(c, 400, "expired-state", "OAuth state invalid or expired");
  const provider = getProvider(stateRow.provider);
  if (!provider) return errorResponse(c, 400, "unknown-provider", `unknown provider ${stateRow.provider}`);
  let tokens;
  try {
    tokens = await provider.exchange(code, { redirectUri: stateRow.redirectUri, pkceVerifier: stateRow.pkceVerifier ?? undefined });
  } catch (err) {
    return errorResponse(c, 502, "exchange-failed", err instanceof Error ? err.message : "exchange failed");
  }
  // Resolve email from id_token (JWT) or via userinfo lookup.
  const email = await resolveProfileEmail(stateRow.provider, tokens.accessToken, tokens.idToken);
  if (!email) return errorResponse(c, 502, "no-profile-email", "could not determine account email");

  const id = `mc_${uuid()}`;
  const conn: MailConnection = {
    id,
    userId: stateRow.userId,
    tenantId: stateRow.tenantId,
    provider: stateRow.provider,
    email,
    status: "active",
    accessTokenCipher: cipherToB64(tokens.accessToken),
    refreshTokenCipher: tokens.refreshToken ? cipherToB64(tokens.refreshToken) : undefined,
    tokenExpiresAt: new Date(Date.now() + (tokens.expiresInSec - 30) * 1000).toISOString(),
    oauthScope: tokens.scope ?? stateRow.scope,
    isDefault: countConnections(stateRow.userId) === 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  saveRecord("mail.connection", conn as unknown as Record<string, unknown>);
  recordAudit({
    actor: stateRow.userId,
    action: "mail.connection.added",
    resource: "mail.connection",
    recordId: id,
    payload: { provider: stateRow.provider, email },
  });
  broadcastResourceChange("mail.connection", id, "create", stateRow.userId);

  // Redirect back to the SPA. If the original request specified a returnTo,
  // honor that; otherwise default to /#/mail.
  const target = stateRow.returnTo ?? `/#/mail`;
  return c.redirect(target);
});

connectionsRoutes.post("/imap", async (c) => {
  let body: {
    email?: string;
    displayName?: string;
    imapHost?: string; imapPort?: number; imapTLS?: boolean;
    smtpHost?: string; smtpPort?: number; smtpTLS?: boolean;
    username?: string; password?: string;
  } = {};
  try { body = (await c.req.json()) as typeof body; } catch {
    return errorResponse(c, 400, "invalid-json", "expected JSON body");
  }
  if (!body.email || !body.imapHost || !body.smtpHost || !body.username || !body.password) {
    return errorResponse(c, 400, "missing-fields", "email, imapHost, smtpHost, username, password are required");
  }
  const id = `mc_${uuid()}`;
  const conn: MailConnection = {
    id,
    userId: userIdOf(c),
    tenantId: tenantId(),
    provider: "imap",
    email: body.email,
    displayName: body.displayName,
    status: "active",
    passwordCipher: cipherToB64(body.password),
    imapHost: body.imapHost,
    imapPort: body.imapPort ?? 993,
    imapTLS: body.imapTLS ?? true,
    smtpHost: body.smtpHost,
    smtpPort: body.smtpPort ?? 587,
    smtpTLS: body.smtpTLS ?? true,
    username: body.username,
    isDefault: countConnections(userIdOf(c)) === 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  saveRecord("mail.connection", conn as unknown as Record<string, unknown>);
  recordAudit({
    actor: userIdOf(c),
    action: "mail.connection.added",
    resource: "mail.connection",
    recordId: id,
    payload: { provider: "imap", host: body.imapHost },
  });
  broadcastResourceChange("mail.connection", id, "create", userIdOf(c));
  return c.json(publicShape(conn));
});

connectionsRoutes.post("/:id/default", (c) => {
  const id = c.req.param("id") ?? "";
  const conn = loadRecord<MailConnection>("mail.connection", id);
  if (!conn || conn.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "connection not found");
  // Clear other defaults.
  const others = db
    .prepare(`SELECT id, data FROM records WHERE resource = 'mail.connection' AND json_extract(data, '$.userId') = ?`)
    .all(userIdOf(c)) as { id: string; data: string }[];
  for (const o of others) {
    const r = JSON.parse(o.data) as MailConnection;
    if (r.id === id) continue;
    if (r.isDefault) {
      r.isDefault = false;
      saveRecord("mail.connection", r as unknown as Record<string, unknown>);
    }
  }
  conn.isDefault = true;
  saveRecord("mail.connection", conn as unknown as Record<string, unknown>);
  recordAudit({ actor: userIdOf(c), action: "mail.connection.default", resource: "mail.connection", recordId: id });
  broadcastResourceChange("mail.connection", id, "update", userIdOf(c));
  return c.json(publicShape(conn));
});

connectionsRoutes.post("/:id/disable", (c) => {
  const id = c.req.param("id") ?? "";
  const conn = loadRecord<MailConnection>("mail.connection", id);
  if (!conn || conn.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "connection not found");
  conn.status = "disabled";
  saveRecord("mail.connection", conn as unknown as Record<string, unknown>);
  recordAudit({ actor: userIdOf(c), action: "mail.connection.disabled", resource: "mail.connection", recordId: id });
  broadcastResourceChange("mail.connection", id, "update", userIdOf(c));
  return c.json(publicShape(conn));
});

connectionsRoutes.delete("/:id", (c) => {
  const id = c.req.param("id") ?? "";
  const conn = loadRecord<MailConnection>("mail.connection", id);
  if (!conn || conn.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "connection not found");
  // Soft delete: keep tokens encrypted but mark deleted to satisfy retention.
  (conn as unknown as { deletedAt?: string }).deletedAt = nowIso();
  conn.status = "disabled";
  saveRecord("mail.connection", conn as unknown as Record<string, unknown>);
  recordAudit({
    actor: userIdOf(c),
    action: "mail.connection.removed",
    resource: "mail.connection",
    recordId: id,
    payload: { email: conn.email, provider: conn.provider },
  });
  broadcastResourceChange("mail.connection", id, "delete", userIdOf(c));
  return c.json({ ok: true });
});

/* -------- helpers -------- */

function cipherToB64(plain: string): string {
  return Buffer.from(encryptString(plain)).toString("base64");
}

function publicShape(conn: MailConnection): Record<string, unknown> {
  // Strip cipher fields before returning.
  const out: Record<string, unknown> = { ...conn };
  delete out.accessTokenCipher;
  delete out.refreshTokenCipher;
  delete out.passwordCipher;
  return out;
}

function countConnections(userId: string): number {
  const r = db
    .prepare(
      `SELECT COUNT(*) AS c FROM records WHERE resource = 'mail.connection'
       AND json_extract(data, '$.userId') = ?`,
    )
    .get(userId) as { c: number };
  return r.c;
}

function publicBase(): string {
  return process.env.PUBLIC_BASE_URL ?? "http://127.0.0.1:8787";
}

async function resolveProfileEmail(provider: string, accessToken: string, idToken?: string): Promise<string | null> {
  if (idToken) {
    const claims = decodeJwt(idToken);
    const email = claims?.email;
    if (typeof email === "string") return email;
  }
  if (provider === "google") {
    const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { email?: string };
    return data.email ?? null;
  }
  if (provider === "microsoft") {
    const r = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { mail?: string; userPrincipalName?: string };
    return data.mail ?? data.userPrincipalName ?? null;
  }
  return null;
}

function decodeJwt(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

void currentUser;
