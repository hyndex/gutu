/** Stable TypeScript types plugins depend on. */
export * from "../../../src/contracts/actions";
export * from "../../../src/contracts/commands";
export * from "../../../src/contracts/fields";
export * from "../../../src/contracts/nav";
export * from "../../../src/contracts/resources";
export * from "../../../src/contracts/views";
// Plugin-v2 owns the canonical `Capability` + `PermissionGate` types so
// it re-exports first; other modules' same-named exports are intentionally
// not re-exported here to avoid ambiguity.
export type {
  PluginManifest,
  PluginV2,
  AnyPlugin,
  Disposable,
  PluginContext,
  PluginContributions,
  ScopedRuntime,
  PermissionGate,
  Capability,
  ActivationEvent,
  ViewExtension,
  RouteGuard,
  KeyboardShortcut,
  ScheduledJob,
  ResourceSeed,
  ExtensionRegistries,
  Registry,
  FieldKindSpec,
  WidgetTypeSpec,
  ViewModeSpec,
  ThemeSpec,
  LayoutSpec,
  ChartKindSpec,
  ExporterSpec,
  ImporterSpec,
  AuthProviderSpec,
  DataSourceAdapter,
  PluginInstallRecord,
  PluginStatus,
  PeerAccess,
} from "../../../src/contracts/plugin-v2";
export { definePlugin, isV2Plugin } from "../../../src/contracts/plugin-v2";
export type { PermissionContext, PermissionDecision } from "../../../src/contracts/permissions";
export * from "../../../src/contracts/analytics";
export type { CapabilityRegistry, FeatureFlagStore } from "../../../src/contracts/feature-flags";
export * from "../../../src/contracts/saved-views";
export * from "../../../src/contracts/widgets";
