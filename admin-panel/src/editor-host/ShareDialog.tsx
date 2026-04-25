/** Sharing UI — modal dialog over the EditorHost.
 *
 *  What it does:
 *    - Shows every existing ACL grant (users, tenant, public-link, public)
 *      with revoke buttons (owners only)
 *    - Lets owners grant editor / viewer access by email (resolves via
 *      `/share` endpoint, reports unknown emails inline)
 *    - Lets owners create a public-link token; the resulting URL is
 *      copyable and grants the chosen role to anyone who has it
 *
 *  Built with the existing Radix Dialog so it inherits the shell's
 *  focus-trap, escape handling, and overlay animation. */
import React, { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  type AclEntry,
  type AclRole,
  createPublicLink,
  listAcl,
  revokeAclEntry,
  shareByEmail,
} from "./api";
import type { EditorKind } from "./types";

interface Props {
  kind: EditorKind;
  id: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ kind, id, title, open, onOpenChange }: Props): React.JSX.Element {
  const [acl, setAcl] = useState<AclEntry[]>([]);
  const [selfRole, setSelfRole] = useState<AclRole>("viewer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [grantRole, setGrantRole] = useState<AclRole>("editor");
  const [notFound, setNotFound] = useState<string[]>([]);
  const [linkToken, setLinkToken] = useState<{ token: string; role: AclRole } | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listAcl(kind, id);
      setAcl(r.rows);
      setSelfRole(r.selfRole);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [kind, id]);

  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  const isOwner = selfRole === "owner";

  const handleShare = async () => {
    const emails = emailInput
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes("@"));
    if (emails.length === 0) return;
    setLoading(true);
    setError(null);
    setNotFound([]);
    try {
      const r = await shareByEmail(kind, id, emails, grantRole);
      setNotFound(r.notFound);
      setEmailInput("");
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (e: AclEntry) => {
    if (!isOwner) return;
    setLoading(true);
    setError(null);
    try {
      await revokeAclEntry(kind, id, e.subjectKind, e.subjectId);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async (role: AclRole) => {
    setLoading(true);
    setError(null);
    try {
      const r = await createPublicLink(kind, id, role);
      setLinkToken(r);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/editor-frame.html?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}&link=${encodeURIComponent(token)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyMsg("Link copied!");
      setTimeout(() => setCopyMsg(null), 2000);
    } catch {
      setCopyMsg(`Copy this URL: ${url}`);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 9998,
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            width: 520,
            maxWidth: "90vw",
            maxHeight: "85vh",
            overflow: "auto",
            zIndex: 9999,
            padding: 24,
            fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
            color: "#111827",
          }}
        >
          <Dialog.Title style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
            Share "{title}"
          </Dialog.Title>
          <Dialog.Description style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            {isOwner
              ? "Add people by email or create a shareable link."
              : `You have ${selfRole} access. Only the document owner can change sharing.`}
          </Dialog.Description>

          {error && (
            <div
              role="alert"
              style={{
                padding: "8px 12px",
                background: "#fef2f2",
                color: "#991b1b",
                borderRadius: 6,
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          {isOwner && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="alice@example.com, bob@example.com"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleShare(); }}
                />
                <select
                  value={grantRole}
                  onChange={(e) => setGrantRole(e.target.value as AclRole)}
                  disabled={loading}
                  style={{
                    padding: "8px 8px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                    background: "#fff",
                  }}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="owner">Owner</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  disabled={loading || !emailInput.trim()}
                  style={{
                    padding: "8px 16px",
                    background: "#2563eb",
                    color: "#fff",
                    border: 0,
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Share
                </button>
              </div>
              {notFound.length > 0 && (
                <div style={{ fontSize: 12, color: "#b91c1c", marginBottom: 12 }}>
                  Not found: {notFound.join(", ")}
                </div>
              )}
            </>
          )}

          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "16px 0 8px" }}>
            People with access
          </h3>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {acl.length === 0 && !loading && (
              <li style={{ padding: 8, color: "#6b7280", fontSize: 13 }}>No grants yet.</li>
            )}
            {acl.map((e) => (
              <li
                key={`${e.subjectKind}:${e.subjectId}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid #f3f4f6",
                  fontSize: 14,
                }}
              >
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500 }}>{e.displayName ?? e.subjectId}</span>
                  {e.email && (
                    <span style={{ color: "#6b7280", marginLeft: 6, fontSize: 12 }}>
                      &lt;{e.email}&gt;
                    </span>
                  )}
                  <span
                    style={{
                      display: "inline-block",
                      marginLeft: 8,
                      padding: "1px 6px",
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      borderRadius: 3,
                      background:
                        e.role === "owner" ? "#fef3c7" :
                        e.role === "editor" ? "#dbeafe" :
                        "#f3f4f6",
                      color:
                        e.role === "owner" ? "#92400e" :
                        e.role === "editor" ? "#1e40af" :
                        "#4b5563",
                    }}
                  >
                    {e.role}
                  </span>
                </span>
                {e.subjectKind === "public-link" && (
                  <button
                    type="button"
                    onClick={() => void handleCopyLink(e.subjectId)}
                    style={{
                      padding: "4px 10px",
                      fontSize: 12,
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      borderRadius: 4,
                      cursor: "pointer",
                      marginRight: 6,
                    }}
                  >
                    Copy link
                  </button>
                )}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => void handleRevoke(e)}
                    disabled={loading}
                    style={{
                      padding: "4px 10px",
                      fontSize: 12,
                      border: 0,
                      background: "transparent",
                      color: "#b91c1c",
                      cursor: "pointer",
                    }}
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>

          {isOwner && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 8px" }}>
                Public link
              </h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => void handleCreateLink("viewer")}
                  disabled={loading}
                  style={{
                    padding: "6px 12px",
                    fontSize: 13,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  Create view-only link
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateLink("editor")}
                  disabled={loading}
                  style={{
                    padding: "6px 12px",
                    fontSize: 13,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  Create edit link
                </button>
              </div>
              {linkToken && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 8,
                    background: "#f3f4f6",
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: "ui-monospace, monospace",
                    wordBreak: "break-all",
                  }}
                >
                  {`${window.location.origin}/editor-frame.html?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}&link=${encodeURIComponent(linkToken.token)}`}
                  <button
                    type="button"
                    onClick={() => void handleCopyLink(linkToken.token)}
                    style={{
                      marginLeft: 8,
                      padding: "2px 6px",
                      fontSize: 11,
                      border: 0,
                      background: "#2563eb",
                      color: "#fff",
                      borderRadius: 3,
                      cursor: "pointer",
                    }}
                  >
                    Copy
                  </button>
                </div>
              )}
              {copyMsg && <div style={{ marginTop: 6, fontSize: 12, color: "#10b981" }}>{copyMsg}</div>}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <Dialog.Close asChild>
              <button
                type="button"
                style={{
                  padding: "6px 16px",
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
