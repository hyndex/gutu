/** OAuth helpers — generic registry over named providers.
 *
 *  We support Google + Microsoft + a generic OIDC strategy. Each provider
 *  exposes `buildAuthUrl`, `exchangeCode`, `refresh`. State + PKCE
 *  verifiers live in `mail_oauth_state`. Tokens are stored encrypted on
 *  `mail.connection` records via `at-rest.ts`. */

import crypto from "node:crypto";
import { db, nowIso } from "../../../db";

export interface OAuthProvider {
  id: string;
  name: string;
  defaultScope: string[];
  authorize(args: AuthorizeArgs): { url: string; state: string };
  exchange(code: string, args: ExchangeArgs): Promise<TokenSet>;
  refresh(refreshToken: string): Promise<TokenSet>;
  introspect?(token: string): Promise<{ active: boolean }>;
}

export interface AuthorizeArgs {
  redirectUri: string;
  state: string;
  pkceVerifier?: string;
  scope?: string[];
  loginHint?: string;
  prompt?: "none" | "login" | "consent" | "select_account";
}

export interface ExchangeArgs {
  redirectUri: string;
  pkceVerifier?: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresInSec: number;
  idToken?: string;
  tokenType: string;
  scope?: string;
  /** Provider-specific payload (e.g. id_token claims). */
  raw?: Record<string, unknown>;
}

export const providers = new Map<string, OAuthProvider>();

export function registerProvider(p: OAuthProvider): void {
  providers.set(p.id, p);
}

export function getProvider(id: string): OAuthProvider | undefined {
  return providers.get(id);
}

export function ensureProviders(): void {
  if (providers.size > 0) return;
  registerProvider(googleProvider());
  registerProvider(microsoftProvider());
  registerProvider(genericOidcProvider());
}

/* ---------------- state machine ---------------- */

export function genState(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function genPkceVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function pkceChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function persistState(args: {
  state: string;
  provider: string;
  tenantId: string;
  userId: string;
  pkceVerifier?: string;
  redirectUri: string;
  scope: string;
  returnTo?: string;
  ttlMs?: number;
}): void {
  const ttl = args.ttlMs ?? 10 * 60 * 1000;
  db.prepare(
    `INSERT INTO mail_oauth_state
       (state, provider, tenant_id, user_id, pkce_verifier, redirect_uri, scope, return_to, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    args.state,
    args.provider,
    args.tenantId,
    args.userId,
    args.pkceVerifier ?? null,
    args.redirectUri,
    args.scope,
    args.returnTo ?? null,
    nowIso(),
    new Date(Date.now() + ttl).toISOString(),
  );
}

export interface OAuthStateRow {
  state: string;
  provider: string;
  tenantId: string;
  userId: string;
  pkceVerifier: string | null;
  redirectUri: string;
  scope: string;
  returnTo: string | null;
}

export function consumeState(state: string): OAuthStateRow | null {
  const row = db
    .prepare(
      `SELECT state, provider, tenant_id AS tenantId, user_id AS userId,
              pkce_verifier AS pkceVerifier, redirect_uri AS redirectUri,
              scope, return_to AS returnTo, expires_at AS expiresAt
         FROM mail_oauth_state WHERE state = ?`,
    )
    .get(state) as (OAuthStateRow & { expiresAt: string }) | undefined;
  if (!row) return null;
  // Always single-use.
  db.prepare("DELETE FROM mail_oauth_state WHERE state = ?").run(state);
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;
  return row;
}

/* ---------------- providers ---------------- */

function googleProvider(): OAuthProvider {
  const clientId = process.env.MAIL_GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.MAIL_GOOGLE_CLIENT_SECRET ?? "";
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const authzUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const defaultScope = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.metadata",
  ];
  return {
    id: "google",
    name: "Google",
    defaultScope,
    authorize(args) {
      ensureClient(clientId, "MAIL_GOOGLE_CLIENT_ID");
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: args.redirectUri,
        response_type: "code",
        access_type: "offline",
        include_granted_scopes: "true",
        prompt: args.prompt ?? "consent",
        scope: (args.scope ?? defaultScope).join(" "),
        state: args.state,
      });
      if (args.loginHint) params.set("login_hint", args.loginHint);
      if (args.pkceVerifier) {
        params.set("code_challenge", pkceChallenge(args.pkceVerifier));
        params.set("code_challenge_method", "S256");
      }
      return { url: `${authzUrl}?${params.toString()}`, state: args.state };
    },
    async exchange(code, args) {
      ensureClient(clientId, "MAIL_GOOGLE_CLIENT_ID");
      const body = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: args.redirectUri,
        grant_type: "authorization_code",
      });
      if (args.pkceVerifier) body.set("code_verifier", args.pkceVerifier);
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) throw new Error(`google.token ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as Record<string, unknown>;
      return tokenSetFromJson(data);
    },
    async refresh(refreshToken) {
      ensureClient(clientId, "MAIL_GOOGLE_CLIENT_ID");
      const body = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      });
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) throw new Error(`google.refresh ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as Record<string, unknown>;
      // Refresh response often omits refresh_token; preserve old.
      const ts = tokenSetFromJson(data);
      ts.refreshToken = ts.refreshToken ?? refreshToken;
      return ts;
    },
  };
}

function microsoftProvider(): OAuthProvider {
  const clientId = process.env.MAIL_MICROSOFT_CLIENT_ID ?? "";
  const clientSecret = process.env.MAIL_MICROSOFT_CLIENT_SECRET ?? "";
  const tenant = process.env.MAIL_MICROSOFT_TENANT ?? "common";
  const authzUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`;
  const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const defaultScope = [
    "openid",
    "email",
    "profile",
    "offline_access",
    "https://graph.microsoft.com/Mail.ReadWrite",
    "https://graph.microsoft.com/Mail.Send",
    "https://graph.microsoft.com/MailboxSettings.ReadWrite",
    "https://graph.microsoft.com/User.Read",
  ];
  return {
    id: "microsoft",
    name: "Microsoft",
    defaultScope,
    authorize(args) {
      ensureClient(clientId, "MAIL_MICROSOFT_CLIENT_ID");
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: args.redirectUri,
        response_type: "code",
        response_mode: "query",
        scope: (args.scope ?? defaultScope).join(" "),
        state: args.state,
      });
      if (args.prompt) params.set("prompt", args.prompt);
      if (args.loginHint) params.set("login_hint", args.loginHint);
      if (args.pkceVerifier) {
        params.set("code_challenge", pkceChallenge(args.pkceVerifier));
        params.set("code_challenge_method", "S256");
      }
      return { url: `${authzUrl}?${params.toString()}`, state: args.state };
    },
    async exchange(code, args) {
      ensureClient(clientId, "MAIL_MICROSOFT_CLIENT_ID");
      const body = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: args.redirectUri,
        grant_type: "authorization_code",
      });
      if (args.pkceVerifier) body.set("code_verifier", args.pkceVerifier);
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) throw new Error(`microsoft.token ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as Record<string, unknown>;
      return tokenSetFromJson(data);
    },
    async refresh(refreshToken) {
      ensureClient(clientId, "MAIL_MICROSOFT_CLIENT_ID");
      const body = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      });
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) throw new Error(`microsoft.refresh ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as Record<string, unknown>;
      return tokenSetFromJson(data);
    },
  };
}

function genericOidcProvider(): OAuthProvider {
  const clientId = process.env.MAIL_OIDC_CLIENT_ID ?? "";
  const clientSecret = process.env.MAIL_OIDC_CLIENT_SECRET ?? "";
  const authzUrl = process.env.MAIL_OIDC_AUTH_URL ?? "";
  const tokenUrl = process.env.MAIL_OIDC_TOKEN_URL ?? "";
  return {
    id: "oidc",
    name: "OIDC",
    defaultScope: ["openid", "email", "profile"],
    authorize(args) {
      ensureClient(clientId, "MAIL_OIDC_CLIENT_ID");
      ensureClient(authzUrl, "MAIL_OIDC_AUTH_URL");
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: args.redirectUri,
        response_type: "code",
        scope: (args.scope ?? ["openid", "email", "profile"]).join(" "),
        state: args.state,
      });
      if (args.pkceVerifier) {
        params.set("code_challenge", pkceChallenge(args.pkceVerifier));
        params.set("code_challenge_method", "S256");
      }
      return { url: `${authzUrl}?${params.toString()}`, state: args.state };
    },
    async exchange(code, args) {
      const body = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: args.redirectUri,
        grant_type: "authorization_code",
      });
      if (args.pkceVerifier) body.set("code_verifier", args.pkceVerifier);
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) throw new Error(`oidc.token ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as Record<string, unknown>;
      return tokenSetFromJson(data);
    },
    async refresh(refreshToken) {
      const body = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      });
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) throw new Error(`oidc.refresh ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as Record<string, unknown>;
      return tokenSetFromJson(data);
    },
  };
}

function tokenSetFromJson(data: Record<string, unknown>): TokenSet {
  return {
    accessToken: String(data.access_token ?? ""),
    refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
    expiresInSec: Number(data.expires_in ?? 3600),
    idToken: data.id_token ? String(data.id_token) : undefined,
    tokenType: String(data.token_type ?? "Bearer"),
    scope: data.scope ? String(data.scope) : undefined,
    raw: data,
  };
}

function ensureClient(value: string, name: string): void {
  if (!value) {
    throw new Error(`[mail.oauth] ${name} not configured`);
  }
}
