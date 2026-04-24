import * as React from "react";
import type { NavItem, NavSection } from "@/contracts/nav";
import type { ResourceDefinition } from "@/contracts/resources";
import type { View } from "@/contracts/views";
import type { ActionDescriptor } from "@/contracts/actions";
import type { CommandDescriptor } from "@/contracts/commands";
import type { PluginV2 } from "@/contracts/plugin-v2";

/** React context that exposes the aggregated AdminRegistry to deeply-nested
 *  custom views (e.g. rich detail pages) that need to introspect plugins
 *  beyond their own. Set by AppShell at the root. */
export const RegistryContext = React.createContext<AdminRegistry | null>(null);

/** Hook — returns the live registry or null when no provider is mounted. */
export function useRegistry(): AdminRegistry | null {
  return React.useContext(RegistryContext);
}

/** Aggregated view of every active plugin's contributions. The shell +
 *  view renderers read from this. Built by `PluginHost` from the live
 *  contribution store. */
export interface AdminRegistry {
  plugins: readonly PluginV2[];
  navSections: readonly NavSection[];
  nav: readonly NavItem[];
  resources: Readonly<Record<string, ResourceDefinition>>;
  views: Readonly<Record<string, View>>;
  pluginByResource: Readonly<Record<string, string>>;
  globalActions: readonly ActionDescriptor[];
  commands: readonly CommandDescriptor[];
}
