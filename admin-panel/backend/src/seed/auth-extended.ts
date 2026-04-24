import { db } from "../db";
import { bulkInsert } from "../lib/query";

const FIRST = ["Ada", "Grace", "Linus", "Guido", "Alan", "Donald", "Katherine", "Barbara"];
const LAST = ["Lovelace", "Hopper", "Torvalds", "van Rossum", "Turing", "Knuth", "Johnson", "Liskov"];

const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length]!;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();
const personName = (i: number) => `${pick(FIRST, i)} ${pick(LAST, i + 2)}`;
const personEmail = (i: number, d = "gutu.dev") =>
  `${pick(FIRST, i).toLowerCase()}.${pick(LAST, i + 2).toLowerCase().replace(/\s+/g, "")}@${d}`;

const count = (r: string) =>
  (db.prepare("SELECT COUNT(*) AS c FROM records WHERE resource = ?").get(r) as { c: number }).c;
const seedIf = (r: string, rows: Record<string, unknown>[]) =>
  count(r) > 0 ? 0 : bulkInsert(r, rows);

export function seedAuthExtended(): Record<string, number> {
  const out: Record<string, number> = {};

  out["auth.user"] = seedIf("auth.user", Array.from({ length: 40 }, (_, i) => {
    const lastLogin = hoursAgo(i * 4);
    return {
      id: `auth_user_ext_${i + 1}`,
      name: personName(i),
      email: personEmail(i),
      role: pick(["admin", "member", "member", "member", "viewer", "owner", "billing"], i),
      status: pick(["active", "active", "active", "active", "invited", "suspended"], i),
      department: pick(["Engineering", "Ops", "Sales", "Marketing", "Finance", "Support"], i),
      mfa: i % 3 !== 0,
      mfaEnrolledNumeric: i % 3 !== 0 ? 100 : 0,
      ssoProvider: pick(["google", "microsoft", "okta", "email"], i),
      lastLogin,
      inactiveOver90d: (Date.now() - Date.parse(lastLogin)) / 86_400_000 > 90,
      createdAt: daysAgo(i * 20),
      locale: pick(["en-US", "en-GB", "de-DE", "ja-JP"], i),
      timezone: pick(["America/Los_Angeles", "America/New_York", "Europe/London", "Asia/Tokyo"], i),
    };
  }));

  out["auth.session"] = seedIf("auth.session", Array.from({ length: 30 }, (_, i) => ({
    id: `auth_sess_ext_${i + 1}`,
    user: personEmail(i),
    ip: `10.0.${i}.${(i * 7) % 255}`,
    userAgent: pick(["Safari/17", "Chrome/131", "Firefox/133", "iOS Safari"], i),
    provider: pick(["google", "microsoft", "okta", "password", "magic-link"], i),
    location: pick(["San Francisco, USA", "New York, USA", "London, UK", "Tokyo, JP"], i),
    active: i < 20,
    createdAt: daysAgo(i * 0.5),
    expiresAt: daysFromNow(30 - i * 0.5),
  })));

  out["auth.role"] = seedIf("auth.role", Array.from({ length: 8 }, (_, i) => ({
    id: `auth_role_${i + 1}`,
    key: pick(["owner", "admin", "billing", "member", "viewer", "support", "engineering", "custom"], i),
    name: pick(["Owner", "Admin", "Billing", "Member", "Viewer", "Support Agent", "Engineer", "Custom"], i),
    description: "Role description",
    members: 1 + (i * 3) % 30,
    permissions: 5 + (i * 2) % 30,
    system: i < 5,
  })));

  out["auth.permission"] = seedIf("auth.permission", Array.from({ length: 20 }, (_, i) => ({
    id: `auth_perm_${i + 1}`,
    key: `${pick(["read", "write", "delete"], i)}.${pick(["invoice", "contact", "user", "role"], i)}`,
    resource: pick(["accounting.invoice", "crm.contact", "auth.user", "auth.role"], i),
    action: pick(["read", "write", "delete", "admin"], i),
    description: "",
  })));

  out["auth.invitation"] = seedIf("auth.invitation", Array.from({ length: 14 }, (_, i) => ({
    id: `auth_inv_${i + 1}`,
    email: `invited+${i}@example.com`,
    role: pick(["admin", "member", "viewer"], i),
    invitedBy: "sam@gutu.dev",
    invitedAt: daysAgo(i * 3),
    expiresAt: daysFromNow(30 - i * 2),
    status: pick(["pending", "accepted", "accepted", "expired", "revoked"], i),
  })));

  out["auth.api-token"] = seedIf("auth.api-token", Array.from({ length: 10 }, (_, i) => ({
    id: `auth_token_${i + 1}`,
    name: pick(["CI deploy token", "Integration: Slack", "Integration: GitHub", "Readonly reports", "Webhook relay"], i),
    owner: personEmail(i),
    scopes: pick([["read"], ["read", "write"], ["admin"], ["webhook"]], i),
    prefix: `gutu_${pick(["pat", "svc", "wh"], i)}_${String(1000 + i).slice(-4)}`,
    lastUsedAt: hoursAgo(i * 8),
    createdAt: daysAgo(i * 30),
    expiresAt: daysFromNow(365),
    revoked: i % 7 === 6,
  })));

  out["auth.login-event"] = seedIf("auth.login-event", Array.from({ length: 60 }, (_, i) => {
    const success = i % 5 !== 4;
    return {
      id: `auth_login_${i + 1}`,
      occurredAt: hoursAgo(i * 2),
      user: personEmail(i),
      ip: `10.0.${i % 255}.${(i * 7) % 255}`,
      userAgent: pick(["Safari/17", "Chrome/131", "Firefox/133", "iOS Safari"], i),
      provider: pick(["google", "microsoft", "okta", "password", "magic-link"], i),
      success,
      reason: success ? "" : pick(["bad-password", "mfa-failed", "account-locked"], i),
    };
  }));

  out["auth.ip-policy"] = seedIf("auth.ip-policy", Array.from({ length: 6 }, (_, i) => ({
    id: `auth_ip_${i + 1}`,
    name: pick(["HQ office", "VPN", "Deny TOR", "Deny country X", "Partner"], i),
    cidr: pick(["192.168.1.0/24", "10.0.0.0/16", "1.1.1.0/24", "0.0.0.0/0"], i),
    action: i === 2 || i === 3 ? "deny" : "allow",
    appliesTo: pick(["admin", "all", "member"], i),
    status: "active",
  })));

  return out;
}
