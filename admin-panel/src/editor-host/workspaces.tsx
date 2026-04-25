/** Per-kind workspace components — thin wrappers around `<EditorList>`.
 *  Lives in its own .tsx file so the barrel index can stay .ts-only. */

import React from "react";
import { EditorList } from "./EditorList";

export function SpreadsheetWorkspace(): React.JSX.Element {
  return <EditorList kind="spreadsheet" title="Spreadsheets" newButtonLabel="New spreadsheet" />;
}
export function DocumentWorkspace(): React.JSX.Element {
  return <EditorList kind="document" title="Documents" newButtonLabel="New document" />;
}
export function SlidesWorkspace(): React.JSX.Element {
  return <EditorList kind="slides" title="Slides" newButtonLabel="New deck" />;
}
export function PagesWorkspace(): React.JSX.Element {
  return <EditorList kind="page" title="Pages" newButtonLabel="New page" />;
}
export function WhiteboardWorkspace(): React.JSX.Element {
  return <EditorList kind="whiteboard" title="Whiteboards" newButtonLabel="New whiteboard" />;
}
