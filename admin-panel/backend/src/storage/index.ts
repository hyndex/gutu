/** Local copy of the `@platform/storage` contract for the admin-panel
 *  backend. Kept in sync with `libraries/gutu-lib-storage` — the canonical
 *  source of truth. Consumers inside admin-panel/backend/src/** import
 *  from here; when the backend is split into its own package, this folder
 *  will become a single re-export from `@platform/storage`.
 */

export type { StorageAdapter, StorageAdapterFactory } from "./contract";
export type {
  AdapterCapabilities,
  BodyInput,
  CopyOptions,
  EncryptionOption,
  GetOptions,
  GetResult,
  ListOptions,
  ListResult,
  MultipartCompleteInput,
  MultipartHandle,
  MultipartPart,
  ObjectMetadata,
  PresignOperation,
  PresignOptions,
  PresignedUrl,
  PutOptions,
  StorageClass,
  Visibility,
} from "./types";
export {
  StorageError,
  type StorageErrorCode,
  ObjectNotFound,
  AccessDenied,
  InvalidKey,
  ChecksumMismatch,
  Unsupported,
  PayloadTooLarge,
  isStorageError,
} from "./errors";
export {
  StorageRegistry,
  type StorageBackendConfig,
  getStorageRegistry,
  resetStorageRegistry,
} from "./registry";
export {
  validateObjectKey,
  joinTenantKey,
  percentEncodeKey,
} from "./keys";
export {
  toReadableStream,
  collectStream,
  sha256Hex,
} from "./body";

export { LocalStorageAdapter, type LocalAdapterConfig } from "./adapters/local";
export { S3StorageAdapter, type S3AdapterConfig, type S3Provider } from "./adapters/s3";
export { preset as s3Preset, PROVIDERS as S3_PROVIDERS, PROVIDER_LABEL as S3_PROVIDER_LABEL, type PresetInput as S3PresetInput } from "./adapters/s3-presets";

export { bootstrapStorage } from "./bootstrap";
