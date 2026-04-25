/** Gutu Mail — first-party plugin.
 *
 *  Aggregates resources, views, nav, commands, shortcuts, widgets, and
 *  connections under a single `definePlugin` activation. The plugin is
 *  feature-flag gated via `mail.enabled` (default true) and contributes
 *  nothing when the flag is off so admins can disable Mail entirely
 *  without touching App.tsx.
 *
 *  Capabilities declared:
 *    - resources:read / write / delete — mail data lifecycle
 *    - nav, commands, shortcuts — UI surface
 *    - fetch:external — image proxy + AI providers
 *    - storage — drafts / image cache
 *
 *  Plugin id and version are kept stable across releases. */

import { definePlugin } from "@/contracts/plugin-v2";
import {
  MAIL_PLUGIN_ID,
  MAIL_PLUGIN_VERSION,
  MAIL_PLUGIN_LABEL,
  MAIL_PLUGIN_DESCRIPTION,
  MAIL_PLUGIN_VENDOR,
  MAIL_PLUGIN_ICON,
  MAIL_PLUGIN_KEYWORDS,
  MAIL_PLUGIN_LICENSE,
} from "./manifest";
import { MAIL_RESOURCES } from "./resources";
import { MAIL_VIEWS } from "./views";
import { MAIL_NAV_ITEMS, MAIL_NAV_SECTION } from "./nav";
import { MAIL_COMMANDS } from "./commands";
import { MAIL_SHORTCUTS } from "./shortcuts";
import { MAIL_WIDGETS } from "./widgets";
import { MAIL_CONNECTIONS } from "./connections";

export const mailPlugin = definePlugin({
  manifest: {
    id: MAIL_PLUGIN_ID,
    version: MAIL_PLUGIN_VERSION,
    label: MAIL_PLUGIN_LABEL,
    description: MAIL_PLUGIN_DESCRIPTION,
    vendor: MAIL_PLUGIN_VENDOR,
    icon: MAIL_PLUGIN_ICON,
    license: MAIL_PLUGIN_LICENSE,
    keywords: MAIL_PLUGIN_KEYWORDS,
    requires: {
      shell: "^2.0.0",
      capabilities: [
        "resources:read",
        "resources:write",
        "resources:delete",
        "nav",
        "commands",
        "shortcuts",
        "fetch:external",
        "storage",
        "topbar",
      ],
    },
    activationEvents: [{ kind: "onStart" }],
    origin: { kind: "filesystem", location: "src/examples/mail" },
  },

  async activate(ctx) {
    ctx.contribute.navSections([MAIL_NAV_SECTION]);
    ctx.contribute.nav(MAIL_NAV_ITEMS);
    ctx.contribute.resources(MAIL_RESOURCES);
    ctx.contribute.views(MAIL_VIEWS);
    ctx.contribute.commands(MAIL_COMMANDS);
    ctx.contribute.shortcuts(MAIL_SHORTCUTS);
    ctx.contribute.widgets(MAIL_WIDGETS);
    ctx.contribute.connections(MAIL_CONNECTIONS);
  },
});

export default mailPlugin;
