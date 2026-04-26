/** Cross-plugin hook for installing & consuming sidecar services
 *  (mail server, websocket sync, AI inference workers, search engines,
 *  etc.).
 *
 *  Why an adapter and not a baked-in implementation: provisioning is an
 *  *operator* concern that varies wildly between deployments — bare VPS
 *  uses docker-compose, single-machine self-hosters use systemd units,
 *  cluster operators want a Kubernetes operator with CRDs, and many
 *  users will simply paste a URL of a managed instance. Each of those is
 *  a different adapter implementing the same contract.
 *
 *  The default ships an `ExternalProvisioner` that reads pre-configured
 *  service URLs from settings and does not actually orchestrate anything
 *  — pasting a URL of a managed Stalwart instance "just works" with no
 *  cluster, no Docker daemon, no operator. That is the path of least
 *  resistance for the common self-hoster.
 *
 *  Future plugins (`gutu-plugin-orchestrator-docker-core`,
 *  `gutu-plugin-orchestrator-k8s-core`) implement the same contract and
 *  bring real lifecycle management. Pages that depend on services don't
 *  change when the orchestrator does. */

import * as React from "react";

/** Stable, well-known service kinds. Plugins that ship their own kinds
 *  should prefix with the plugin id (e.g., `acme.search`). */
export type ServiceKind =
  | "stalwart-mail"
  | "yjs-ws"
  | "ai-inference"
  | "search-engine"
  | (string & { __brand?: "service-kind" });

export interface ServiceSpec {
  kind: ServiceKind;
  /** Tenant scope. `"shared"` means cluster-wide, otherwise a tenant id. */
  tenantId: string;
  /** Provisioner-specific configuration (image tag, replicas, env, …).
   *  The `ExternalProvisioner` ignores everything here. */
  config?: Record<string, unknown>;
}

export type ServiceStatus =
  | "running"
  | "starting"
  | "degraded"
  | "stopped"
  | "failed"
  | "unknown";

export interface ServiceHandle {
  /** Stable id chosen by the provisioner. */
  id: string;
  spec: ServiceSpec;
  /** URL the application uses to reach the service (https/jmap/imap…). */
  url: string;
  /** Credentials the application uses to authenticate to the service.
   *  Stored via the framework's secret store at rest — never logged. */
  secrets?: Readonly<Record<string, string>>;
  status: ServiceStatus;
  /** ISO timestamp of last successful health check. */
  lastHealthyAt?: string;
  /** Human-readable error if status === "failed". */
  error?: string;
}

export interface ServiceProvisioner {
  /** Provision (or look up an existing) service matching `spec`.
   *  Idempotent — calling twice with the same spec returns the same
   *  handle. */
  provision(spec: ServiceSpec): Promise<ServiceHandle>;
  /** List every service the provisioner owns. */
  list(): Promise<readonly ServiceHandle[]>;
  /** Tear down a service (irreversible). The default `ExternalProvisioner`
   *  cannot destroy anything — it just forgets the handle. */
  destroy(handleId: string): Promise<void>;
  /** Active health probe. Updates `status` + `lastHealthyAt`. */
  healthCheck(handleId: string): Promise<ServiceHandle>;
}

/** No-op default. Returns `unknown` status for everything; safe to render
 *  pages against without crashing. Real adapters are mounted via
 *  `<ServiceProvisionerProvider>` near the app root. */
const NOOP_PROVISIONER: ServiceProvisioner = {
  async provision(spec) {
    return {
      id: `noop:${spec.kind}:${spec.tenantId}`,
      spec,
      url: "",
      status: "unknown",
    };
  },
  async list() {
    return [];
  },
  async destroy() {
    // nothing to tear down
  },
  async healthCheck(handleId) {
    return {
      id: handleId,
      spec: { kind: "unknown", tenantId: "shared" },
      url: "",
      status: "unknown",
    };
  },
};

const ServiceProvisionerContext = React.createContext<ServiceProvisioner>(NOOP_PROVISIONER);

export interface ServiceProvisionerProviderProps {
  adapter: ServiceProvisioner;
  children: React.ReactNode;
}

export function ServiceProvisionerProvider({
  adapter,
  children,
}: ServiceProvisionerProviderProps) {
  return (
    <ServiceProvisionerContext.Provider value={adapter}>
      {children}
    </ServiceProvisionerContext.Provider>
  );
}

export interface UseServiceResult {
  handle?: ServiceHandle;
  loading: boolean;
  error?: unknown;
  /** Re-run `provision()` (idempotent). */
  refresh: () => Promise<void>;
}

/** Resolve a single service. Re-runs when the spec changes. The hook
 *  swallows errors — pages render empty/disabled UI when the service is
 *  unavailable rather than crashing. */
export function useService(spec: ServiceSpec | null): UseServiceResult {
  const provisioner = React.useContext(ServiceProvisionerContext);
  const [handle, setHandle] = React.useState<ServiceHandle | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(undefined);
  const reqRef = React.useRef(0);

  const key = spec ? `${spec.kind}:${spec.tenantId}:${JSON.stringify(spec.config ?? null)}` : "";

  const refresh = React.useCallback(async () => {
    if (!spec) {
      setHandle(undefined);
      setLoading(false);
      setError(undefined);
      return;
    }
    const id = ++reqRef.current;
    setLoading(true);
    setError(undefined);
    try {
      const next = await provisioner.provision(spec);
      if (id !== reqRef.current) return;
      setHandle(next);
      setLoading(false);
    } catch (err) {
      if (id !== reqRef.current) return;
      setError(err);
      setLoading(false);
    }
  }, [provisioner, key]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { handle, loading, error, refresh };
}

/** Lower-level access for pages that need the full provisioner surface
 *  (admin "Services" page that calls `list()` + `destroy()`). */
export function useServiceProvisioner(): ServiceProvisioner {
  return React.useContext(ServiceProvisionerContext);
}

/** Thin built-in adapter that reads service URLs + secrets from a static
 *  config object. Intended for the common case where the operator has
 *  already brought up Stalwart (or whatever) elsewhere and the framework
 *  just consumes it. The framework's settings page writes to the same
 *  config object, so admins can configure services via UI without any
 *  orchestrator plugin installed. */
export function createExternalProvisioner(
  registry: ReadonlyMap<string, Omit<ServiceHandle, "spec">>,
): ServiceProvisioner {
  const handles = new Map<string, ServiceHandle>();
  for (const [key, partial] of registry) {
    const [kind, tenantId] = key.split(":");
    if (!kind || !tenantId) continue;
    handles.set(key, { ...partial, spec: { kind, tenantId } });
  }
  return {
    async provision(spec) {
      const key = `${spec.kind}:${spec.tenantId}`;
      const existing = handles.get(key);
      if (existing) {
        return { ...existing, spec };
      }
      // Caller asked for a service we don't know about. Return an
      // unconfigured handle — the consuming page will render the
      // "configure this service" empty state.
      return {
        id: `external:${key}`,
        spec,
        url: "",
        status: "unknown",
        error: "service not configured",
      };
    },
    async list() {
      return Array.from(handles.values());
    },
    async destroy(handleId) {
      for (const [key, h] of handles) {
        if (h.id === handleId) {
          handles.delete(key);
          return;
        }
      }
    },
    async healthCheck(handleId) {
      for (const [, h] of handles) {
        if (h.id === handleId) return h;
      }
      throw new Error(`unknown service handle ${handleId}`);
    },
  };
}
