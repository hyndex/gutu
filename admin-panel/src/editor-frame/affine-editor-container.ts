/** Vendored copy of `TestAffineEditorContainer` from
 *  `ref/workspace/AFFiNE/blocksuite/integration-test/src/editors/editor-container.ts`.
 *
 *  Ported as-is (MIT, copyright toeverything) and re-registered as the
 *  `affine-editor-container` custom element so the AFFiNE block runtime
 *  has a host to render into.
 *
 *  The integration-test package isn't published to npm — this is the
 *  blessed-by-upstream way to embed BlockSuite outside the AFFiNE app
 *  itself; the AFFiNE web app's own editor host has a near-identical
 *  shape but uses React + Lit interop helpers we don't need here. */

import { SignalWatcher, WithDisposable } from "@blocksuite/affine/global/lit";
import type { DocMode } from "@blocksuite/affine/model";
import { ThemeProvider } from "@blocksuite/affine/shared/services";
import { BlockStdScope, ShadowlessElement } from "@blocksuite/affine/std";
import {
  type BlockModel,
  type ExtensionType,
  type Store,
} from "@blocksuite/affine/store";
import { computed, signal } from "@preact/signals-core";
import { css, html } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { when } from "lit/directives/when.js";

export class GutuAffineEditorContainer extends SignalWatcher(
  WithDisposable(ShadowlessElement),
) {
  static override styles = css`
    .affine-page-viewport {
      position: relative;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      overflow-y: auto;
      container-name: viewport;
      container-type: inline-size;
      font-family: var(--affine-font-family);
    }
    .affine-page-viewport * {
      box-sizing: border-box;
    }
    @media print {
      .affine-page-viewport {
        height: auto;
      }
    }
    .playground-page-editor-container {
      flex-grow: 1;
      font-family: var(--affine-font-family);
      display: block;
    }
    .playground-page-editor-container * {
      box-sizing: border-box;
    }
    @media print {
      .playground-page-editor-container {
        height: auto;
      }
    }
    .edgeless-editor-container {
      font-family: var(--affine-font-family);
      background: var(--affine-background-primary-color);
      display: block;
      height: 100%;
      position: relative;
      overflow: clip;
    }
    .edgeless-editor-container * {
      box-sizing: border-box;
    }
    @media print {
      .edgeless-editor-container {
        height: auto;
      }
    }
    .affine-edgeless-viewport {
      display: block;
      height: 100%;
      position: relative;
      overflow: clip;
      container-name: viewport;
      container-type: inline-size;
    }
  `;

  private readonly _doc = signal<Store | undefined>(undefined);
  private readonly _edgelessSpecs = signal<ExtensionType[]>([]);
  private readonly _mode = signal<DocMode>("page");
  private readonly _pageSpecs = signal<ExtensionType[]>([]);

  private readonly _specs = computed(() =>
    this._mode.value === "page"
      ? this._pageSpecs.value
      : this._edgelessSpecs.value,
  );

  private readonly _std = computed(() => {
    return new BlockStdScope({
      store: this.doc,
      extensions: this._specs.value,
    });
  });

  private readonly _editorTemplate = computed(() => {
    return this._std.value.render();
  });

  get doc(): Store {
    return this._doc.value as Store;
  }
  set doc(doc: Store) {
    this._doc.value = doc;
  }

  set edgelessSpecs(specs: ExtensionType[]) {
    this._edgelessSpecs.value = specs;
  }
  get edgelessSpecs(): ExtensionType[] {
    return this._edgelessSpecs.value;
  }

  set pageSpecs(specs: ExtensionType[]) {
    this._pageSpecs.value = specs;
  }
  get pageSpecs(): ExtensionType[] {
    return this._pageSpecs.value;
  }

  get host(): unknown {
    try {
      return this.std.host;
    } catch {
      return null;
    }
  }

  get mode(): DocMode {
    return this._mode.value;
  }
  set mode(mode: DocMode) {
    this._mode.value = mode;
  }

  get rootModel(): BlockModel {
    return this.doc.root as BlockModel;
  }

  get std(): BlockStdScope {
    return this._std.value;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._disposables.add(
      this.doc.slots.rootAdded.subscribe(() => this.requestUpdate()),
    );
  }

  override firstUpdated(): void {
    if (this.mode === "page") {
      setTimeout(() => {
        if (this.autofocus && this.mode === "page") {
          const richText = this.querySelector("rich-text") as
            | (HTMLElement & { inlineEditor?: { focusEnd: () => void } })
            | null;
          richText?.inlineEditor?.focusEnd();
        }
      });
    }
  }

  override render(): unknown {
    const mode = this._mode.value;
    const themeService = this.std.get(ThemeProvider);
    const appTheme = themeService.app$.value;
    const edgelessTheme = themeService.edgeless$.value;

    return html`${keyed(
      this.rootModel.id + mode,
      html`
        <div
          data-theme=${mode === "page" ? appTheme : edgelessTheme}
          class=${mode === "page"
            ? "affine-page-viewport"
            : "affine-edgeless-viewport"}
        >
          ${when(
            mode === "page",
            () => html` <doc-title .doc=${this.doc}></doc-title> `,
          )}
          <div
            class=${mode === "page"
              ? "page-editor playground-page-editor-container"
              : "edgeless-editor-container"}
          >
            ${this._editorTemplate.value}
          </div>
        </div>
      `,
    )}`;
  }

  switchEditor(mode: DocMode): void {
    this._mode.value = mode;
  }

  // Keep `autofocus` as a plain instance property — Lit doesn't need a
  // reactive property for it because we only read it once on
  // firstUpdated(). Avoids the TC39-stage-3 `accessor` keyword + decorator
  // combo which requires extra esbuild config.
  override autofocus = false;
}

/** Register the custom element. Idempotent — safe to call multiple times. */
export function registerAffineEditorContainer(): void {
  if (!customElements.get("affine-editor-container")) {
    customElements.define("affine-editor-container", GutuAffineEditorContainer);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "affine-editor-container": GutuAffineEditorContainer;
  }
}
