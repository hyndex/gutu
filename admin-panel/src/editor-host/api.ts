/** Thin REST client for `/api/editors/<resource>/...`.
 *
 *  Exposes typed wrappers used by `<EditorList>` (list + create + delete) and
 *  `<EditorHost>` (snapshot read/write).
 */

import type { EditorKind, EditorRecord } from "./types";

const RESOURCE_FOR: Record<EditorKind, string> = {
  spreadsheet: "spreadsheet",
  document: "document",
  slides: "slides",
  page: "page",
  whiteboard: "whiteboard",
};

function getAuthHeader(): Record<string, string> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("auth-token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function apiBase(): string {
  // VITE_API_BASE may set this; default to same-origin /api for prod, or
  // localhost:3333 in dev (matched by proxy in vite.config).
  const base = (typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_BASE : undefined) ??
    "/api";
  return base.toString().replace(/\/+$/, "");
}

export async function listEditorRecords(kind: EditorKind): Promise<EditorRecord[]> {
  const res = await fetch(`${apiBase()}/editors/${RESOURCE_FOR[kind]}`, {
    headers: getAuthHeader(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`list ${kind} failed: ${res.status}`);
  const body = (await res.json()) as { rows: EditorRecord[] };
  return body.rows;
}

export async function createEditorRecord(
  kind: EditorKind,
  payload: { title: string; folder?: string; slug?: string; parentId?: string },
): Promise<EditorRecord> {
  const res = await fetch(`${apiBase()}/editors/${RESOURCE_FOR[kind]}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`create ${kind} failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as EditorRecord;
}

export async function deleteEditorRecord(kind: EditorKind, id: string): Promise<void> {
  const res = await fetch(`${apiBase()}/editors/${RESOURCE_FOR[kind]}/${id}`, {
    method: "DELETE",
    headers: getAuthHeader(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`delete ${kind} failed: ${res.status}`);
}

export async function fetchEditorRecord(
  kind: EditorKind,
  id: string,
): Promise<EditorRecord> {
  const res = await fetch(`${apiBase()}/editors/${RESOURCE_FOR[kind]}/${id}`, {
    headers: getAuthHeader(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`fetch ${kind} ${id} failed: ${res.status}`);
  return (await res.json()) as EditorRecord;
}

export async function fetchSnapshot(
  kind: EditorKind,
  id: string,
  which: "yjs" | "export",
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const res = await fetch(
    `${apiBase()}/editors/${RESOURCE_FOR[kind]}/${id}/snapshot/${which}`,
    { headers: getAuthHeader(), credentials: "include" },
  );
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`fetch snapshot ${kind}/${id}/${which} failed: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return { bytes: buf, contentType: res.headers.get("content-type") ?? "application/octet-stream" };
}

export async function postSnapshot(
  kind: EditorKind,
  id: string,
  which: "yjs" | "export",
  bytes: Uint8Array,
  contentType: string,
): Promise<{ size: number; etag: string }> {
  const res = await fetch(
    `${apiBase()}/editors/${RESOURCE_FOR[kind]}/${id}/snapshot/${which}`,
    {
      method: "POST",
      headers: { "Content-Type": contentType, ...getAuthHeader() },
      credentials: "include",
      body: bytes as BodyInit,
    },
  );
  if (!res.ok) throw new Error(`save snapshot failed: ${res.status}`);
  return (await res.json()) as { size: number; etag: string };
}
