/** REST client for `/api/editors/<resource>/...`.
 *
 *  Hardened with:
 *    - `Idempotency-Key` on every create
 *    - `If-Match` on snapshot writes (optimistic locking)
 *    - cooperative cancel via AbortSignal
 *    - structured error parsing — server returns `{error, code, ...}`
 *
 *  Auth + tenant headers are sourced from the shared `authStore` so the
 *  editor flows participate in the same session lifecycle as every other
 *  REST call (logout clears the token, tenant switching re-targets, 401
 *  triggers session clear). */

import { authStore } from "@/runtime/auth";
import type { EditorKind, EditorRecord } from "./types";

const RESOURCE_FOR: Record<EditorKind, string> = {
  spreadsheet: "spreadsheet",
  document: "document",
  slides: "slides",
  page: "page",
  whiteboard: "whiteboard",
};

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (authStore.token) headers.Authorization = `Bearer ${authStore.token}`;
  if (authStore.activeTenant?.id) headers["x-tenant"] = authStore.activeTenant.id;
  return headers;
}

function apiBase(): string {
  const base =
    (typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_BASE : undefined) ?? "/api";
  return base.toString().replace(/\/+$/, "");
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Parse `{error, code, ...}` from a non-OK response. */
async function readErr(res: Response): Promise<Error> {
  let body: { error?: string; code?: string } | null = null;
  try { body = (await res.json()) as { error?: string; code?: string }; } catch { /* tolerate */ }
  const msg = body?.error ?? `HTTP ${res.status}`;
  const code = body?.code ?? "http-error";
  const err = new Error(msg) as Error & { code?: string; status?: number };
  err.code = code;
  err.status = res.status;
  return err;
}

export async function listEditorRecords(
  kind: EditorKind,
  signal?: AbortSignal,
): Promise<EditorRecord[]> {
  const res = await fetch(`${apiBase()}/editors/${RESOURCE_FOR[kind]}`, {
    headers: getAuthHeaders(),
    credentials: "include",
    ...(signal && { signal }),
  });
  if (!res.ok) throw await readErr(res);
  const body = (await res.json()) as { rows: EditorRecord[] };
  return body.rows;
}

export async function createEditorRecord(
  kind: EditorKind,
  payload: { title: string; folder?: string; slug?: string; parentId?: string },
  signal?: AbortSignal,
): Promise<EditorRecord> {
  const res = await fetch(`${apiBase()}/editors/${RESOURCE_FOR[kind]}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": newIdempotencyKey(),
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
    ...(signal && { signal }),
  });
  if (!res.ok) throw await readErr(res);
  return (await res.json()) as EditorRecord;
}

export async function updateEditorRecord(
  kind: EditorKind,
  id: string,
  patch: Partial<EditorRecord>,
  signal?: AbortSignal,
): Promise<EditorRecord> {
  const res = await fetch(`${apiBase()}/editors/${RESOURCE_FOR[kind]}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    credentials: "include",
    body: JSON.stringify(patch),
    ...(signal && { signal }),
  });
  if (!res.ok) throw await readErr(res);
  return (await res.json()) as EditorRecord;
}

export async function deleteEditorRecord(
  kind: EditorKind,
  id: string,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${apiBase()}/editors/${RESOURCE_FOR[kind]}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: "include",
    ...(signal && { signal }),
  });
  if (!res.ok) throw await readErr(res);
}

export async function fetchEditorRecord(
  kind: EditorKind,
  id: string,
  signal?: AbortSignal,
): Promise<EditorRecord> {
  const res = await fetch(`${apiBase()}/editors/${RESOURCE_FOR[kind]}/${id}`, {
    headers: getAuthHeaders(),
    credentials: "include",
    ...(signal && { signal }),
  });
  if (!res.ok) throw await readErr(res);
  return (await res.json()) as EditorRecord;
}

export async function fetchSnapshot(
  kind: EditorKind,
  id: string,
  which: "yjs" | "export",
  signal?: AbortSignal,
): Promise<{ bytes: Uint8Array; contentType: string; etag: string | null } | null> {
  const res = await fetch(
    `${apiBase()}/editors/${RESOURCE_FOR[kind]}/${id}/snapshot/${which}`,
    {
      headers: getAuthHeaders(),
      credentials: "include",
      ...(signal && { signal }),
    },
  );
  if (res.status === 204) return null;
  if (!res.ok) throw await readErr(res);
  const buf = new Uint8Array(await res.arrayBuffer());
  return {
    bytes: buf,
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
    etag: res.headers.get("etag"),
  };
}

export async function postSnapshot(
  kind: EditorKind,
  id: string,
  which: "yjs" | "export",
  bytes: Uint8Array,
  contentType: string,
  opts: { ifMatch?: string; signal?: AbortSignal } = {},
): Promise<{ size: number; etag: string }> {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Length": String(bytes.byteLength),
    ...getAuthHeaders(),
  };
  if (opts.ifMatch) headers["If-Match"] = opts.ifMatch;
  const res = await fetch(
    `${apiBase()}/editors/${RESOURCE_FOR[kind]}/${id}/snapshot/${which}`,
    {
      method: "POST",
      headers,
      credentials: "include",
      body: bytes as BodyInit,
      ...(opts.signal && { signal: opts.signal }),
    },
  );
  if (!res.ok) throw await readErr(res);
  return (await res.json()) as { size: number; etag: string };
}

/* ---------------- ACL / sharing ---------------- */

export type AclSubjectKind = "user" | "tenant" | "public-link" | "public";
export type AclRole = "owner" | "editor" | "viewer";

export interface AclEntry {
  resource: string;
  recordId: string;
  subjectKind: AclSubjectKind;
  subjectId: string;
  role: AclRole;
  grantedBy: string;
  grantedAt: string;
  /** Server-resolved display info (only present for `user` subjects). */
  displayName?: string;
  email?: string | null;
}

export interface AclResponse {
  rows: AclEntry[];
  /** The current user's role on this doc — for hiding mutate UI. */
  selfRole: AclRole;
}

export async function listAcl(kind: EditorKind, id: string, signal?: AbortSignal): Promise<AclResponse> {
  const res = await fetch(`${apiBase()}/editors/${RESOURCE_FOR[kind]}/${id}/acl`, {
    headers: getAuthHeaders(),
    credentials: "include",
    ...(signal && { signal }),
  });
  if (!res.ok) throw await readErr(res);
  return (await res.json()) as AclResponse;
}

export async function shareByEmail(
  kind: EditorKind,
  id: string,
  emails: string[],
  role: AclRole,
  signal?: AbortSignal,
): Promise<{
  granted: Array<{ email: string; userId: string; role: AclRole }>;
  notFound: string[];
}> {
  const res = await fetch(`${apiBase()}/editors/${RESOURCE_FOR[kind]}/${id}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    credentials: "include",
    body: JSON.stringify({ emails, role }),
    ...(signal && { signal }),
  });
  if (!res.ok) throw await readErr(res);
  return (await res.json()) as {
    granted: Array<{ email: string; userId: string; role: AclRole }>;
    notFound: string[];
  };
}

export async function revokeAclEntry(
  kind: EditorKind,
  id: string,
  subjectKind: AclSubjectKind,
  subjectId: string,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(
    `${apiBase()}/editors/${RESOURCE_FOR[kind]}/${id}/acl/${subjectKind}/${encodeURIComponent(subjectId)}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
      credentials: "include",
      ...(signal && { signal }),
    },
  );
  if (!res.ok) throw await readErr(res);
}

export async function createPublicLink(
  kind: EditorKind,
  id: string,
  role: AclRole = "viewer",
  signal?: AbortSignal,
): Promise<{ token: string; role: AclRole }> {
  const res = await fetch(
    `${apiBase()}/editors/${RESOURCE_FOR[kind]}/${id}/public-link`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      credentials: "include",
      body: JSON.stringify({ role }),
      ...(signal && { signal }),
    },
  );
  if (!res.ok) throw await readErr(res);
  return (await res.json()) as { token: string; role: AclRole };
}
