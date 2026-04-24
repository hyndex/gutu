/** Activation engine — turns the plugin manifest's `activationEvents`
 *  array into real triggers.
 *
 *  When a plugin is registered with the host, its `onStart` plugins are
 *  activated immediately (default). Anything else is held as `pending` in
 *  the engine. The engine subscribes to every potential trigger (hashchange
 *  for onNav, runtime bus for onEvent + onResource + onPluginActivate,
 *  command registry for onCommand) and activates the plugin on first match.
 *
 *  Activation is a one-shot — once a plugin activates, its other triggers
 *  are cleared.
 *
 *  This is what makes "200 plugins" scale: only the plugins the user
 *  actually visits pay activation cost. */

import type {
  ActivationEvent,
  AnyPlugin,
  PluginInstallRecord,
} from "@/contracts/plugin-v2";
import { isV2Plugin } from "@/contracts/plugin-v2";
import type { AdminRuntime } from "@/runtime/context";
import type { PluginHost2 } from "./pluginHost2";

export interface ActivationEngine {
  /** Register a plugin — activates now if `onStart` or no events,
   *  otherwise holds it until a matching trigger fires. */
  register(plugin: AnyPlugin): Promise<PluginInstallRecord | null>;
  /** Force-activate a pending plugin (e.g. user clicks "Activate" in UI). */
  activateNow(pluginId: string): Promise<PluginInstallRecord | null>;
  /** Drop a pending plugin. */
  drop(pluginId: string): void;
  /** Snapshot of every plugin known to the engine (active or pending). */
  getPending(): readonly { id: string; events: readonly ActivationEvent[] }[];
  /** Cleanup all subscriptions. */
  dispose(): void;
}

export interface ActivationEngineOptions {
  host: PluginHost2;
  runtime: AdminRuntime;
}

interface PendingEntry {
  plugin: AnyPlugin;
  events: readonly ActivationEvent[];
}

export function createActivationEngine(
  options: ActivationEngineOptions,
): ActivationEngine {
  const { host, runtime } = options;
  const pending = new Map<string, PendingEntry>();
  const disposers: Array<() => void> = [];

  const idOf = (p: AnyPlugin): string =>
    isV2Plugin(p) ? p.manifest.id : (p as { id: string }).id;
  const eventsOf = (p: AnyPlugin): readonly ActivationEvent[] => {
    if (!isV2Plugin(p)) return [{ kind: "onStart" }];
    return p.manifest.activationEvents ?? [{ kind: "onStart" }];
  };

  const activateAndRemove = async (id: string): Promise<PluginInstallRecord | null> => {
    const entry = pending.get(id);
    if (!entry) return null;
    pending.delete(id);
    try {
      const rec = await host.install(entry.plugin);
      // Fire onPluginActivate triggers for peers that were waiting for this.
      onPluginActivated(id);
      return rec;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[activation] "${id}" threw during deferred activate`, err);
      return null;
    }
  };

  const hashListener = () => {
    const hash = window.location.hash.replace(/^#/, "");
    for (const [id, { events }] of pending) {
      for (const e of events) {
        if (e.kind === "onNav" && (hash === e.path || hash.startsWith(e.path + "/"))) {
          void activateAndRemove(id);
          break;
        }
      }
    }
  };
  window.addEventListener("hashchange", hashListener);
  disposers.push(() => window.removeEventListener("hashchange", hashListener));

  // Runtime bus — scoped plugin bus events carry the event name; we listen
  // to "*" via a general forwarder. The actual Emitter<RuntimeEvents> has a
  // typed map, but plugins also emit free-form strings; we tap into the
  // underlying bus via an untyped facade.
  const bus = runtime.bus as unknown as {
    on: (ev: string, fn: (p: unknown) => void) => () => void;
  };

  /* Scan plugin manifests for any onEvent / onResource triggers so we can
   * lazily attach bus listeners only for the events we care about. */
  const knownEventNames = () => {
    const names = new Set<string>();
    for (const { events } of pending.values()) {
      for (const e of events) {
        if (e.kind === "onEvent") names.add(e.event);
        if (e.kind === "onResource") names.add("realtime:resource-changed");
      }
    }
    return names;
  };

  let busDisposers: Array<() => void> = [];
  const rewireBusListeners = () => {
    for (const d of busDisposers) d();
    busDisposers = [];
    for (const name of knownEventNames()) {
      const off = bus.on(name, (payload: unknown) => {
        for (const [id, { events }] of pending) {
          for (const e of events) {
            if (e.kind === "onEvent" && e.event === name) {
              void activateAndRemove(id);
              break;
            }
            if (
              e.kind === "onResource" &&
              name === "realtime:resource-changed" &&
              payload &&
              typeof payload === "object" &&
              (payload as { resource?: string }).resource === e.resource
            ) {
              void activateAndRemove(id);
              break;
            }
          }
        }
      });
      busDisposers.push(off);
    }
  };
  disposers.push(() => busDisposers.forEach((d) => d()));

  /* Command palette — listen for `nav:to` / custom "command:run" events. We
   * ship a small helper that plugins can emit when a command fires. */
  const commandOff = bus.on("command:run", (payload: unknown) => {
    const id = (payload as { id?: string } | undefined)?.id;
    if (!id) return;
    for (const [pid, { events }] of pending) {
      for (const e of events) {
        if (e.kind === "onCommand" && e.command === id) {
          void activateAndRemove(pid);
          break;
        }
      }
    }
  });
  disposers.push(commandOff);

  const onPluginActivated = (activatedId: string) => {
    for (const [pid, { events }] of pending) {
      for (const e of events) {
        if (e.kind === "onPluginActivate" && e.plugin === activatedId) {
          void activateAndRemove(pid);
          break;
        }
      }
    }
  };

  /* Register / activateNow / drop */
  const register = async (plugin: AnyPlugin): Promise<PluginInstallRecord | null> => {
    const id = idOf(plugin);
    const events = eventsOf(plugin);
    // Decide whether to activate immediately.
    const activateNow = events.length === 0 || events.some((e) => e.kind === "onStart");
    if (activateNow) {
      try {
        const rec = await host.install(plugin);
        onPluginActivated(id);
        return rec;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[activation] "${id}" threw on activate`, err);
        return null;
      }
    }
    pending.set(id, { plugin, events });
    rewireBusListeners();
    // Also check if current hash already matches an onNav event.
    hashListener();
    return null;
  };

  return {
    register,
    async activateNow(id) {
      return activateAndRemove(id);
    },
    drop(id) {
      pending.delete(id);
      rewireBusListeners();
    },
    getPending() {
      return Array.from(pending.entries()).map(([id, { events }]) => ({ id, events }));
    },
    dispose() {
      for (const d of disposers) d();
    },
  };
}
