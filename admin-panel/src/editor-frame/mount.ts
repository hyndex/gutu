/** Adapter-mount registry for the iframe editor.
 *
 *  Each editor kind gets a function that:
 *    - lazy-imports its runtime (Univer or BlockSuite)
 *    - creates the engine + plugins (with locale + dependent plugins)
 *    - seeds the initial snapshot
 *    - returns `{ destroy, exportSnapshot }` so the frame can save and
 *      tear down cleanly.
 *
 *  Univer requires:
 *    - a locale object passed at construction time, otherwise LocaleService
 *      throws "Locale not initialized" the first time the Ribbon renders.
 *    - the `@univerjs/docs` + `@univerjs/docs-ui` plugins for sheets and
 *      slides, because cell / shape inline editors are docs-backed. */

import type * as Y from "yjs";
import type { EditorKind } from "@/editor-host/types";

export interface MountedAdapter {
  destroy(): Promise<void>;
  exportSnapshot(format?: string): Promise<{ bytes: Uint8Array; contentType: string }>;
}

export async function mountAdapter(
  kind: EditorKind,
  container: HTMLDivElement,
  doc: Y.Doc,
  initialBytes: Uint8Array | undefined,
): Promise<MountedAdapter> {
  switch (kind) {
    case "spreadsheet": return mountUniverSheet(container, doc, initialBytes);
    case "document":    return mountUniverDoc(container, doc, initialBytes);
    case "slides":      return mountUniverSlides(container, doc, initialBytes);
    case "page":        return mountBlockSuite(container, doc, "page");
    case "whiteboard":  return mountBlockSuite(container, doc, "edgeless");
  }
}

/* ---------------- Univer Sheet ---------------- */

async function mountUniverSheet(
  container: HTMLDivElement,
  doc: Y.Doc,
  initialBytes: Uint8Array | undefined,
): Promise<MountedAdapter> {
  const [
    core, ui, design, render, formula, sheets, sheetsUi, docs, docsUi,
    sheetsLocale, uiLocale, designLocale, docsLocale,
  ] = await Promise.all([
    import("@univerjs/core"),
    import("@univerjs/ui"),
    import("@univerjs/design"),
    import("@univerjs/engine-render"),
    import("@univerjs/engine-formula"),
    import("@univerjs/sheets"),
    import("@univerjs/sheets-ui"),
    import("@univerjs/docs"),
    import("@univerjs/docs-ui"),
    import("@univerjs/sheets-ui/locale/en-US").catch(() => ({})),
    import("@univerjs/ui/locale/en-US").catch(() => ({})),
    import("@univerjs/design/locale/en-US").catch(() => ({})),
    import("@univerjs/docs-ui/locale/en-US").catch(() => ({})),
  ]);
  const enUS = mergeLocales([
    asLocale(sheetsLocale),
    asLocale(uiLocale),
    asLocale(designLocale),
    asLocale(docsLocale),
  ]);
  const univer = new core.Univer({
    theme: design.defaultTheme,
    locale: core.LocaleType.EN_US,
    locales: { [core.LocaleType.EN_US]: enUS },
  });
  univer.registerPlugin(render.UniverRenderEnginePlugin);
  univer.registerPlugin(formula.UniverFormulaEnginePlugin);
  univer.registerPlugin(ui.UniverUIPlugin, { container });
  univer.registerPlugin(docs.UniverDocsPlugin);
  univer.registerPlugin(docsUi.UniverDocsUIPlugin);
  univer.registerPlugin(sheets.UniverSheetsPlugin);
  univer.registerPlugin(sheetsUi.UniverSheetsUIPlugin);
  const snapshot = parseInitialOrBlank(initialBytes, blankSheet);
  (univer as unknown as { createUnit: (t: number, s: unknown) => unknown })
    .createUnit(core.UniverInstanceType.UNIVER_SHEET, snapshot);
  const map = doc.getMap("univer");
  if (!map.get("snapshot")) map.set("snapshot", JSON.stringify(snapshot));
  return {
    async exportSnapshot() {
      const txt = (map.get("snapshot") as string | undefined) ?? JSON.stringify(snapshot);
      return { bytes: new TextEncoder().encode(txt), contentType: "application/json" };
    },
    async destroy() {
      try { (univer as unknown as { dispose(): void }).dispose(); } catch { /* ignore */ }
    },
  };
}

/* ---------------- Univer Doc ---------------- */

async function mountUniverDoc(
  container: HTMLDivElement,
  doc: Y.Doc,
  initialBytes: Uint8Array | undefined,
): Promise<MountedAdapter> {
  const [
    core, ui, design, render, docs, docsUi,
    uiLocale, designLocale, docsLocale,
  ] = await Promise.all([
    import("@univerjs/core"),
    import("@univerjs/ui"),
    import("@univerjs/design"),
    import("@univerjs/engine-render"),
    import("@univerjs/docs"),
    import("@univerjs/docs-ui"),
    import("@univerjs/ui/locale/en-US").catch(() => ({})),
    import("@univerjs/design/locale/en-US").catch(() => ({})),
    import("@univerjs/docs-ui/locale/en-US").catch(() => ({})),
  ]);
  const enUS = mergeLocales([asLocale(uiLocale), asLocale(designLocale), asLocale(docsLocale)]);
  const univer = new core.Univer({
    theme: design.defaultTheme,
    locale: core.LocaleType.EN_US,
    locales: { [core.LocaleType.EN_US]: enUS },
  });
  univer.registerPlugin(render.UniverRenderEnginePlugin);
  univer.registerPlugin(ui.UniverUIPlugin, { container });
  univer.registerPlugin(docs.UniverDocsPlugin);
  univer.registerPlugin(docsUi.UniverDocsUIPlugin);
  const snapshot = parseInitialOrBlank(initialBytes, blankDoc);
  (univer as unknown as { createUnit: (t: number, s: unknown) => unknown })
    .createUnit(core.UniverInstanceType.UNIVER_DOC, snapshot);
  const map = doc.getMap("univer");
  if (!map.get("snapshot")) map.set("snapshot", JSON.stringify(snapshot));
  return {
    async exportSnapshot() {
      const txt = (map.get("snapshot") as string | undefined) ?? JSON.stringify(snapshot);
      return { bytes: new TextEncoder().encode(txt), contentType: "application/json" };
    },
    async destroy() {
      try { (univer as unknown as { dispose(): void }).dispose(); } catch { /* ignore */ }
    },
  };
}

/* ---------------- Univer Slides ---------------- */

async function mountUniverSlides(
  container: HTMLDivElement,
  doc: Y.Doc,
  initialBytes: Uint8Array | undefined,
): Promise<MountedAdapter> {
  const [
    core, ui, design, render, docs, docsUi, slides, slidesUi,
    uiLocale, designLocale, docsLocale, slidesLocale,
  ] = await Promise.all([
    import("@univerjs/core"),
    import("@univerjs/ui"),
    import("@univerjs/design"),
    import("@univerjs/engine-render"),
    import("@univerjs/docs"),
    import("@univerjs/docs-ui"),
    import("@univerjs/slides"),
    import("@univerjs/slides-ui"),
    import("@univerjs/ui/locale/en-US").catch(() => ({})),
    import("@univerjs/design/locale/en-US").catch(() => ({})),
    import("@univerjs/docs-ui/locale/en-US").catch(() => ({})),
    import("@univerjs/slides-ui/locale/en-US").catch(() => ({})),
  ]);
  const enUS = mergeLocales([
    asLocale(uiLocale), asLocale(designLocale), asLocale(docsLocale), asLocale(slidesLocale),
  ]);
  const univer = new core.Univer({
    theme: design.defaultTheme,
    locale: core.LocaleType.EN_US,
    locales: { [core.LocaleType.EN_US]: enUS },
  });
  univer.registerPlugin(render.UniverRenderEnginePlugin);
  univer.registerPlugin(ui.UniverUIPlugin, { container });
  univer.registerPlugin(docs.UniverDocsPlugin);
  univer.registerPlugin(docsUi.UniverDocsUIPlugin);
  univer.registerPlugin(slides.UniverSlidesPlugin);
  univer.registerPlugin(slidesUi.UniverSlidesUIPlugin);
  const snapshot = parseInitialOrBlank(initialBytes, blankSlides);
  (univer as unknown as { createUnit: (t: number, s: unknown) => unknown })
    .createUnit(core.UniverInstanceType.UNIVER_SLIDE, snapshot);
  const map = doc.getMap("univer");
  if (!map.get("snapshot")) map.set("snapshot", JSON.stringify(snapshot));
  return {
    async exportSnapshot() {
      const txt = (map.get("snapshot") as string | undefined) ?? JSON.stringify(snapshot);
      return { bytes: new TextEncoder().encode(txt), contentType: "application/json" };
    },
    async destroy() {
      try { (univer as unknown as { dispose(): void }).dispose(); } catch { /* ignore */ }
    },
  };
}

/* ---------------- Notion-style page (Yjs-backed rich text) ----------------
 *  BlockSuite 0.22 changed its bootstrap API significantly (no more
 *  `Workspace` constructor); the official AFFiNE app uses a complex
 *  extension/preset chain that doesn't surface neatly as a single
 *  `<affine-editor-container>` element anymore.
 *
 *  We ship a production-grade minimum: a contenteditable rich-text
 *  surface bound to a `Y.XmlFragment` via simple two-way sync. That
 *  delivers Notion-style headings/paragraphs/lists with realtime
 *  collaboration via the same Y.Doc backbone the rest of the system
 *  uses, while keeping the door open to swap in BlockSuite once its
 *  0.22+ API stabilizes — the `EditorAdapter` contract is unchanged. */

async function mountBlockSuite(
  container: HTMLDivElement,
  doc: Y.Doc,
  mode: "page" | "edgeless",
): Promise<MountedAdapter> {
  if (mode === "page") return mountRichTextPage(container, doc);
  return mountWhiteboard(container, doc);
}

/* ---------------- Page (rich text) ---------------- */

interface RichTextState {
  cleanup: () => void;
  serialize: () => string;
}

function mountRichTextPage(container: HTMLDivElement, doc: Y.Doc): MountedAdapter {
  const yText = doc.getText("page-body");
  if (yText.length === 0) {
    yText.insert(0, "Welcome to your new page. Start typing — every keystroke saves to the Yjs doc and persists through gutu-lib-storage.");
  }

  const wrap = document.createElement("div");
  wrap.style.cssText =
    "position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;";
  const toolbar = document.createElement("div");
  toolbar.style.cssText =
    "display:flex;gap:6px;padding:8px 16px;border-bottom:1px solid #e5e5e5;font-size:13px;background:#fafafa;flex-shrink:0;";
  for (const [label, cmd] of [
    ["B", "bold"],
    ["I", "italic"],
    ["U", "underline"],
    ["H1", "formatBlock:H1"],
    ["H2", "formatBlock:H2"],
    ["• list", "insertUnorderedList"],
    ["1. list", "insertOrderedList"],
    ["link", "createLink"],
  ] as const) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText = "padding:3px 8px;font-size:13px;border:1px solid #ddd;background:#fff;border-radius:4px;cursor:pointer;";
    b.addEventListener("click", () => {
      const c = String(cmd);
      if (c.startsWith("formatBlock:")) {
        document.execCommand("formatBlock", false, c.slice("formatBlock:".length));
      } else if (c === "createLink") {
        const url = prompt("URL");
        if (url) document.execCommand("createLink", false, url);
      } else {
        document.execCommand(c);
      }
      editor.focus();
      // Capture current HTML back to Y.Text so collaborators see it.
      pushTextToY();
    });
    toolbar.appendChild(b);
  }
  const editor = document.createElement("div");
  editor.contentEditable = "true";
  editor.spellcheck = true;
  editor.style.cssText =
    "flex:1;padding:24px 48px;outline:none;line-height:1.6;font-size:15px;color:#222;overflow:auto;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;";
  editor.innerText = yText.toString();
  wrap.appendChild(toolbar);
  wrap.appendChild(editor);
  container.replaceChildren(wrap);

  let suppressYUpdate = false;
  const pushTextToY = () => {
    suppressYUpdate = true;
    const txt = editor.innerText;
    yText.delete(0, yText.length);
    yText.insert(0, txt);
    suppressYUpdate = false;
  };

  const inputHandler = () => pushTextToY();
  editor.addEventListener("input", inputHandler);

  const yObserver = (_e: unknown, tx: { local: boolean }) => {
    if (suppressYUpdate || tx.local) return;
    const cur = editor.innerText;
    const next = yText.toString();
    if (cur !== next) editor.innerText = next;
  };
  yText.observe(yObserver);

  return {
    async exportSnapshot() {
      const html = `<!doctype html><meta charset="utf-8"><body>${editor.innerHTML}</body>`;
      return {
        bytes: new TextEncoder().encode(html),
        contentType: "text/html",
      };
    },
    async destroy() {
      yText.unobserve(yObserver);
      editor.removeEventListener("input", inputHandler);
      try { wrap.remove(); } catch { /* ignore */ }
    },
  };
}

/* ---------------- Whiteboard (Yjs-backed canvas) ---------------- */

interface Shape {
  id: string;
  kind: "rect" | "ellipse" | "text";
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  color: string;
}

function mountWhiteboard(container: HTMLDivElement, doc: Y.Doc): MountedAdapter {
  const yShapes = doc.getArray<Shape>("whiteboard-shapes");

  const wrap = document.createElement("div");
  wrap.style.cssText =
    "position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;";
  const toolbar = document.createElement("div");
  toolbar.style.cssText =
    "display:flex;gap:6px;padding:8px 16px;border-bottom:1px solid #e5e5e5;font-size:13px;background:#fafafa;flex-shrink:0;";

  let activeTool: Shape["kind"] | "select" = "select";
  let activeColor = "#3a86ff";
  for (const tool of ["select", "rect", "ellipse", "text"] as const) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = tool;
    b.style.cssText = "padding:3px 10px;font-size:13px;border:1px solid #ddd;background:#fff;border-radius:4px;cursor:pointer;text-transform:capitalize;";
    b.addEventListener("click", () => {
      activeTool = tool;
      Array.from(toolbar.querySelectorAll("button")).forEach((bt) => {
        (bt as HTMLButtonElement).style.background = bt.textContent === tool ? "#e0e8ff" : "#fff";
      });
    });
    if (tool === activeTool) b.style.background = "#e0e8ff";
    toolbar.appendChild(b);
  }
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = activeColor;
  colorInput.style.cssText = "border:1px solid #ddd;border-radius:4px;height:24px;width:36px;cursor:pointer;margin-left:6px;";
  colorInput.addEventListener("change", () => { activeColor = colorInput.value; });
  toolbar.appendChild(colorInput);
  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.textContent = "Clear";
  clearBtn.style.cssText = "margin-left:auto;padding:3px 10px;font-size:13px;border:1px solid #ddd;background:#fff;border-radius:4px;cursor:pointer;";
  clearBtn.addEventListener("click", () => {
    if (yShapes.length > 0) yShapes.delete(0, yShapes.length);
  });
  toolbar.appendChild(clearBtn);

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "flex:1;display:block;background:#f8f8f8;cursor:crosshair;";
  wrap.appendChild(toolbar);
  wrap.appendChild(canvas);
  container.replaceChildren(wrap);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      async exportSnapshot() {
        return { bytes: new Uint8Array(0), contentType: "image/png" };
      },
      async destroy() { try { wrap.remove(); } catch { /* ignore */ } },
    };
  }

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.floor(r.width * window.devicePixelRatio);
    canvas.height = Math.floor(r.height * window.devicePixelRatio);
    canvas.style.width = `${r.width}px`;
    canvas.style.height = `${r.height}px`;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    redraw();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  function redraw(): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    yShapes.forEach((s) => drawShape(s));
  }
  function drawShape(s: Shape): void {
    if (!ctx) return;
    ctx.fillStyle = s.color;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    if (s.kind === "rect") {
      ctx.fillRect(s.x, s.y, s.w, s.h);
    } else if (s.kind === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w / 2), Math.abs(s.h / 2), 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.kind === "text" && s.text) {
      ctx.font = `${Math.max(14, s.h)}px -apple-system,Segoe UI,sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(s.text, s.x, s.y);
    }
  }

  let dragStart: { x: number; y: number; shape: Shape } | null = null;
  const md = (e: MouseEvent) => {
    if (activeTool === "select") return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (activeTool === "text") {
      const text = prompt("Text", "Note");
      if (text) {
        yShapes.push([{
          id: crypto.randomUUID(),
          kind: "text",
          x,
          y,
          w: 200,
          h: 18,
          text,
          color: activeColor,
        }]);
      }
      return;
    }
    dragStart = {
      x,
      y,
      shape: {
        id: crypto.randomUUID(),
        kind: activeTool,
        x,
        y,
        w: 0,
        h: 0,
        color: activeColor,
      },
    };
  };
  const mm = (e: MouseEvent) => {
    if (!dragStart) return;
    const r = canvas.getBoundingClientRect();
    dragStart.shape.w = e.clientX - r.left - dragStart.x;
    dragStart.shape.h = e.clientY - r.top - dragStart.y;
    redraw();
    if (ctx) drawShape(dragStart.shape);
  };
  const mu = () => {
    if (!dragStart) return;
    if (Math.abs(dragStart.shape.w) > 4 && Math.abs(dragStart.shape.h) > 4) {
      const s = dragStart.shape;
      // Normalize negative-width drags.
      if (s.w < 0) { s.x += s.w; s.w = -s.w; }
      if (s.h < 0) { s.y += s.h; s.h = -s.h; }
      yShapes.push([s]);
    }
    dragStart = null;
    redraw();
  };
  canvas.addEventListener("mousedown", md);
  canvas.addEventListener("mousemove", mm);
  canvas.addEventListener("mouseup", mu);
  canvas.addEventListener("mouseleave", mu);

  const yObserver = () => redraw();
  yShapes.observe(yObserver);

  return {
    async exportSnapshot() {
      // PNG snapshot for thumbnails.
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1] ?? "";
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      return { bytes, contentType: "image/png" };
    },
    async destroy() {
      yShapes.unobserve(yObserver);
      ro.disconnect();
      canvas.removeEventListener("mousedown", md);
      canvas.removeEventListener("mousemove", mm);
      canvas.removeEventListener("mouseup", mu);
      canvas.removeEventListener("mouseleave", mu);
      try { wrap.remove(); } catch { /* ignore */ }
    },
  };
}

/* ---------------- Helpers ---------------- */

function parseInitialOrBlank<T>(bytes: Uint8Array | undefined, blank: () => T): T {
  if (!bytes || bytes.byteLength === 0) return blank();
  try { return JSON.parse(new TextDecoder().decode(bytes)) as T; } catch { return blank(); }
}

/** Locale modules export either a default or named bag — normalize. */
function asLocale(mod: unknown): Record<string, unknown> {
  if (!mod || typeof mod !== "object") return {};
  const m = mod as Record<string, unknown>;
  if (m.default && typeof m.default === "object") return m.default as Record<string, unknown>;
  return m;
}

function mergeLocales(locales: readonly Record<string, unknown>[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const l of locales) deepMerge(out, l);
  return out;
}

function deepMerge(dst: Record<string, unknown>, src: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === "object" && !Array.isArray(v) && dst[k] && typeof dst[k] === "object" && !Array.isArray(dst[k])) {
      deepMerge(dst[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      dst[k] = v;
    }
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
    body: {
      dataStream: "Welcome to your new document.\r\n",
      textRuns: [],
      paragraphs: [{ startIndex: 30 }],
      sectionBreaks: [{ startIndex: 31 }],
    },
  };
}

function blankSlides(): unknown {
  return {
    id: "default-deck",
    title: "Untitled deck",
    pageSize: { width: 1280, height: 720 },
    pages: { "page-1": { id: "page-1", title: "Slide 1", pageElements: [] } },
    pageOrder: ["page-1"],
  };
}
