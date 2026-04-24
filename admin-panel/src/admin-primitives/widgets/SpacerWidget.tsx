import * as React from "react";
import type { SpacerWidget as SpacerSpec } from "@/contracts/widgets";

export function SpacerWidget({ widget }: { widget: SpacerSpec }) {
  void widget;
  return <div aria-hidden className="h-4" />;
}
