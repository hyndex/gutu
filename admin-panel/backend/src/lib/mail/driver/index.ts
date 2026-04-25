/** Driver factory — creates a provider-specific driver from a connection
 *  record. Drivers are lightweight per-call objects; the per-account
 *  rate-limit + token-refresh state is shared via SQL so we don't need
 *  long-lived instances. */

import { db } from "../../../db";
import type { ConnectionRecord, MailDriver } from "./types";
import { GoogleDriver } from "./google";
import { MicrosoftDriver } from "./microsoft";
import { ImapDriver } from "./imap";

export interface ResolveArgs {
  connectionId: string;
  tenantId: string;
}

export async function driverFor(args: ResolveArgs): Promise<MailDriver> {
  const conn = loadConnection(args.connectionId);
  if (!conn) throw new Error(`unknown connection ${args.connectionId}`);
  switch (conn.provider) {
    case "google": return new GoogleDriver(conn, args.tenantId);
    case "microsoft": return new MicrosoftDriver(conn, args.tenantId);
    case "imap": return new ImapDriver(conn, args.tenantId);
    default: throw new Error(`unsupported provider ${conn.provider}`);
  }
}

export function loadConnection(connectionId: string): ConnectionRecord | null {
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = 'mail.connection' AND id = ?`)
    .get(connectionId) as { data: string } | undefined;
  if (!row) return null;
  const rec = JSON.parse(row.data) as Record<string, unknown>;
  return {
    id: connectionId,
    userId: String(rec.userId ?? ""),
    provider: String(rec.provider ?? ""),
    email: String(rec.email ?? ""),
    displayName: rec.displayName as string | undefined,
    status: String(rec.status ?? "active"),
    accessTokenCipher: rec.accessTokenCipher as string | undefined,
    refreshTokenCipher: rec.refreshTokenCipher as string | undefined,
    tokenExpiresAt: rec.tokenExpiresAt as string | undefined,
    imapHost: rec.imapHost as string | undefined,
    imapPort: rec.imapPort as number | undefined,
    imapTLS: rec.imapTLS as boolean | undefined,
    smtpHost: rec.smtpHost as string | undefined,
    smtpPort: rec.smtpPort as number | undefined,
    smtpTLS: rec.smtpTLS as boolean | undefined,
    username: rec.username as string | undefined,
    passwordCipher: rec.passwordCipher as string | undefined,
  };
}
