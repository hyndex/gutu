import * as React from "react";
import type {
  Plugin,
  AdminContribution,
} from "@/contracts/plugin";
import type { NavItem, NavSection } from "@/contracts/nav";
import type { ResourceDefinition } from "@/contracts/resources";
import type { View } from "@/contracts/views";
import type { ActionDescriptor } from "@/contracts/actions";
import type { CommandDescriptor } from "@/contracts/commands";

/** React context that exposes the aggregated AdminRegistry to deeply-nested
 *  custom views (e.g. rich detail pages) that need to introspect plugins
 *  beyond their own. Set by AppShell at the root. */
export const RegistryContext = React.createContext<AdminRegistry | null>(null);

/** Hook — returns the live registry or null when no provider is mounted. */
export function useRegistry(): AdminRegistry | null {
  return React.useContext(RegistryContext);
}

/** Aggregates all active plugin contributions into lookup tables the shell
 *  and view renderers consume. */
export interface AdminRegistry {
  plugins: readonly Plugin[];
  navSections: readonly NavSection[];
  nav: readonly NavItem[];
  resources: Readonly<Record<string, ResourceDefinition>>;
  views: Readonly<Record<string, View>>;
  pluginByResource: Readonly<Record<string, string>>;
  globalActions: readonly ActionDescriptor[];
  commands: readonly CommandDescriptor[];
}

export function buildRegistry(plugins: readonly Plugin[]): AdminRegistry {
  const resources: Record<string, ResourceDefinition> = {};
  const views: Record<string, View> = {};
  const pluginByResource: Record<string, string> = {};
  const nav: NavItem[] = [];
  const navSections: Record<string, NavSection> = {};
  const globalActions: ActionDescriptor[] = [];
  const commands: CommandDescriptor[] = [];

  for (const p of plugins) {
    const a: AdminContribution | undefined = p.admin;
    if (!a) continue;

    for (const section of a.navSections ?? []) {
      if (!navSections[section.id]) navSections[section.id] = section;
    }
    for (const item of a.nav ?? []) {
      nav.push(item);
    }
    for (const r of a.resources ?? []) {
      if (resources[r.id]) {
        console.warn(
          `[registry] resource "${r.id}" already contributed; plugin "${p.id}" overwriting.`,
        );
      }
      resources[r.id] = r;
      pluginByResource[r.id] = p.id;
    }
    for (const v of a.views ?? []) {
      if (views[v.id]) {
        console.warn(
          `[registry] view "${v.id}" already contributed; plugin "${p.id}" overwriting.`,
        );
      }
      views[v.id] = v;
    }
    for (const act of a.globalActions ?? []) globalActions.push(act);
    for (const cmd of a.commands ?? []) commands.push(cmd);
  }

  const sortedSections = Object.values(navSections).sort(
    (a, b) => (a.order ?? 100) - (b.order ?? 100),
  );
  const sortedNav = [...nav].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

  return {
    plugins,
    navSections: sortedSections,
    nav: sortedNav,
    resources,
    views,
    pluginByResource,
    globalActions,
    commands,
  };
}
