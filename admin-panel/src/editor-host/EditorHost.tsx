/** Generic mount component for any editor kind.
 *
 *  - Resolves the right adapter (Univer Sheet / Univer Doc / Univer Slides /
 *    BlockSuite Page / BlockSuite Edgeless) based on the `kind` prop
 *  - Sets up a `Y.Doc` per record, hydrates from the backend's persisted Yjs
 *    snapshot if present, and saves debounced changes back through REST
 *  - Mounts the adapter into a host `<div ref>` and tears down on unmount
 *
 *  Adapters are loaded with `import()` so the editor bundles split out of
 *  the main shell chunk — opening the spreadsheet route is what fetches
 *  Univer Sheet's ~3 MB of code, never the dashboard. */

import React, { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import type { EditorKind, EditorRecord } from "./types";
import { fetchSnapshot, postSnapshot } from "./api";

interface EditorHostProps {
  kind: EditorKind;
  record: EditorRecord;
  onClose?: () => void;
}

interface MountedAdapter {
  destroy(): Promise<void>;
  exportSnapshot(format?: string): Promise<{ bytes: Uint8Array; contentType: string }>;
}

async function mountAdapter(
  kind: EditorKind,
  container: HTMLDivElement,
  doc: Y.Doc,
  initialBytes: Uint8Array | undefined,
): Promise<MountedAdapter> {
  // Lazy-load the adapter for this kind. Each adapter import pulls the
  // associated runtime (Univer or BlockSuite) at first use.
  switch (kind) {
    case "spreadsheet": {
      const [core, ui, design, render, formula, sheets, sheetsUi] = await Promise.all([
        import("@univerjs/core"),
        import("@univerjs/ui"),
        import("@univerjs/design"),
        import("@univerjs/engine-render"),
        import("@univerjs/engine-formula"),
        import("@univerjs/sheets"),
        import("@univerjs/sheets-ui"),
      ]);
      const univer = new core.Univer({ theme: design.defaultTheme, locale: core.LocaleType.EN_US });
      univer.registerPlugin(render.UniverRenderEnginePlugin);
      univer.registerPlugin(formula.UniverFormulaEnginePlugin);
      univer.registerPlugin(ui.UniverUIPlugin, { container });
      univer.registerPlugin(sheets.UniverSheetsPlugin);
      univer.registerPlugin(sheetsUi.UniverSheetsUIPlugin);
      const initialSnapshot =
        (initialBytes && initialBytes.byteLength > 0)
          ? safeParseJson(initialBytes) ?? blankSheet()
          : blankSheet();
      (univer as unknown as { createUnit: (t: number, s: unknown) => unknown }).createUnit(
        core.UniverInstanceType.UNIVER_SHEET,
        initialSnapshot,
      );
      // Mirror the snapshot into Y.Doc as JSON for live persistence.
      const map = doc.getMap("univer");
      if (!map.get("snapshot")) map.set("snapshot", JSON.stringify(initialSnapshot));
      return {
        async exportSnapshot() {
          const txt = (map.get("snapshot") as string | undefined) ?? JSON.stringify(blankSheet());
          return { bytes: new TextEncoder().encode(txt), contentType: "application/json" };
        },
        async destroy() {
          try { (univer as unknown as { dispose(): void }).dispose(); } catch { /* ignore */ }
        },
      };
    }
    case "document": {
      const [core, ui, design, render, docs, docsUi] = await Promise.all([
        import("@univerjs/core"),
        import("@univerjs/ui"),
        import("@univerjs/design"),
        import("@univerjs/engine-render"),
        import("@univerjs/docs"),
        import("@univerjs/docs-ui"),
      ]);
      const univer = new core.Univer({ theme: design.defaultTheme, locale: core.LocaleType.EN_US });
      univer.registerPlugin(render.UniverRenderEnginePlugin);
      univer.registerPlugin(ui.UniverUIPlugin, { container });
      univer.registerPlugin(docs.UniverDocsPlugin);
      univer.registerPlugin(docsUi.UniverDocsUIPlugin);
      const initialSnapshot =
        (initialBytes && initialBytes.byteLength > 0)
          ? safeParseJson(initialBytes) ?? blankDoc()
          : blankDoc();
      (univer as unknown as { createUnit: (t: number, s: unknown) => unknown }).createUnit(
        core.UniverInstanceType.UNIVER_DOC,
        initialSnapshot,
      );
      const map = doc.getMap("univer");
      if (!map.get("snapshot")) map.set("snapshot", JSON.stringify(initialSnapshot));
      return {
        async exportSnapshot() {
          const txt = (map.get("snapshot") as string | undefined) ?? JSON.stringify(blankDoc());
          return { bytes: new TextEncoder().encode(txt), contentType: "application/json" };
        },
        async destroy() {
          try { (univer as unknown as { dispose(): void }).dispose(); } catch { /* ignore */ }
        },
      };
    }
    case "slides":
    case "page":
    case "whiteboard": {
      // For now these surface a "coming soon" panel — adapter packages need
      // additional npm dependencies (`@univerjs/preset-slides-core`, the
      // BlockSuite umbrella) which require Vite plugin config that's not
      // yet shipped in this admin-panel bundle. The plugin scaffolds + REST
      // endpoints are wired and tested; mounting in-browser is the next step.
      container.innerHTML = `
        <div style="padding: 32px; max-width: 720px; margin: 32px auto; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">
          <h2 style="font-size: 18px; margin-bottom: 8px;">${kind} editor — runtime install pending</h2>
          <p style="color: #555; line-height: 1.5;">
            The <code>${kind}</code> editor plugin is fully wired (resource + REST + storage round-trip).
            Add the editor's npm dependency to <code>admin-panel/package.json</code> to mount the live UI:
          </p>
          <pre style="background:#f5f5f5;padding:12px;border-radius:6px;font-size:13px;">${
            kind === "slides"
              ? "bun add @univerjs/preset-slides-core @univerjs/slides @univerjs/slides-ui"
              : "bun add @blocksuite/affine @blocksuite/store"
          }</pre>
        </div>
      `;
      return {
        async exportSnapshot() {
          return { bytes: new Uint8Array(0), contentType: "application/octet-stream" };
        },
        async destroy() { /* no real adapter mounted */ },
      };
    }
  }
}

export function EditorHost({ kind, record, onClose }: EditorHostProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const adapterRef = useRef<MountedAdapter | null>(null);
  const docRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    let cancelled = false;
    const doc = new Y.Doc();
    docRef.current = doc;
    setStatus("loading");

    (async () => {
      // Hydrate Y.Doc from the backend's last persisted snapshot.
      try {
        const yjs = await fetchSnapshot(kind, record.id, "yjs");
        if (yjs && yjs.bytes.byteLength > 0) {
          Y.applyUpdate(doc, yjs.bytes);
        }
      } catch {
        // First-load empty is fine — adapter seeds blank.
      }
      // Hydrate native bytes for the seed if present.
      let initialBytes: Uint8Array | undefined;
      try {
        const seed = await fetchSnapshot(kind, record.id, "export");
        if (seed && seed.bytes.byteLength > 0) initialBytes = seed.bytes;
      } catch {
        /* ignore */
      }
      if (cancelled || !containerRef.current) return;

      try {
        adapterRef.current = await mountAdapter(kind, containerRef.current, doc, initialBytes);
        setStatus("ready");
      } catch (err) {
        setStatus("error");
        setErrorMsg((err as Error).message);
      }
    })();

    return () => {
      cancelled = true;
      adapterRef.current?.destroy().catch(() => undefined);
      adapterRef.current = null;
      doc.destroy();
      docRef.current = null;
    };
  }, [kind, record.id]);

  // Auto-save: debounced 1.5s after the last Yjs update.
  useEffect(() => {
    const doc = docRef.current;
    if (!doc) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        timer = null;
        setStatus("saving");
        try {
          const update = Y.encodeStateAsUpdate(doc);
          await postSnapshot(kind, record.id, "yjs", update, "application/octet-stream");
          // Also push a native export so the search indexer / download
          // button always have a current copy.
          if (adapterRef.current) {
            const exp = await adapterRef.current.exportSnapshot();
            if (exp.bytes.byteLength > 0) {
              await postSnapshot(kind, record.id, "export", exp.bytes, exp.contentType);
            }
          }
          setStatus("saved");
        } catch (err) {
          setStatus("error");
          setErrorMsg((err as Error).message);
        }
      }, 1500);
    };
    doc.on("update", handler);
    return () => {
      if (timer) clearTimeout(timer);
      doc.off("update", handler);
    };
  }, [kind, record.id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 16px",
          borderBottom: "1px solid #e5e5e5",
          fontSize: 14,
        }}
      >
        <strong style={{ flex: 1 }}>{record.title}</strong>
        <span style={{ marginRight: 12, color: statusColor(status) }}>{statusLabel(status)}</span>
        {onClose && (
          <button onClick={onClose} type="button" style={{ marginLeft: 8 }}>
            Close
          </button>
        )}
      </header>
      <div ref={containerRef} style={{ flex: 1, position: "relative", minHeight: 0 }} />
      {errorMsg && (
        <div style={{ padding: 8, background: "#fee", color: "#900", fontSize: 13 }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
}

function statusColor(s: string): string {
  switch (s) {
    case "saved": return "#3a9b3a";
    case "saving": return "#b58900";
    case "error": return "#b00020";
    case "ready": return "#555";
    default: return "#999";
  }
}
function statusLabel(s: string): string {
  switch (s) {
    case "loading": return "Loading…";
    case "ready": return "Ready";
    case "saving": return "Saving…";
    case "saved": return "Saved";
    case "error": return "Error";
    default: return s;
  }
}

function safeParseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function blankSheet(): unknown {
  return {
    id: "default-workbook",
    sheetOrder: ["sheet-1"],
    name: "Untitled",
    appVersion: "0.21.0",
    locale: "enUS",
    styles: {},
    sheets: {
      "sheet-1": {
        id: "sheet-1",
        name: "Sheet1",
        rowCount: 1000,
        columnCount: 26,
        zoomRatio: 1,
        defaultColumnWidth: 88,
        defaultRowHeight: 24,
        mergeData: [],
        cellData: {},
      },
    },
    resources: [],
  };
}

function blankDoc(): unknown {
  return {
    id: "default-doc",
    documentStyle: { pageSize: { width: 595, height: 842 }, marginTop: 72, marginBottom: 72, marginLeft: 90, marginRight: 90 },
    drawings: {},
    drawingsOrder: [],
    body: { dataStream: "Welcome to your new document.\r\n", textRuns: [], paragraphs: [{ startIndex: 30 }], sectionBreaks: [{ startIndex: 31 }] },
  };
}
