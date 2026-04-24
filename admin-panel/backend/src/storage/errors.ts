/** Typed error hierarchy for storage adapters. Consumers can catch by name
 *  or by `code` without having to import the adapter-specific class. */

export type StorageErrorCode =
  | "not-found"
  | "already-exists"
  | "access-denied"
  | "invalid-argument"
  | "invalid-key"
  | "payload-too-large"
  | "precondition-failed"
  | "quota-exceeded"
  | "rate-limited"
  | "network"
  | "timeout"
  | "checksum-mismatch"
  | "unsupported"
  | "upstream-error";

export class StorageError extends Error {
  public readonly code: StorageErrorCode;
  public readonly adapter: string;
  public readonly cause?: unknown;
  public readonly retryable: boolean;

  constructor(opts: {
    code: StorageErrorCode;
    message: string;
    adapter: string;
    cause?: unknown;
    retryable?: boolean;
  }) {
    super(opts.message);
    this.name = "StorageError";
    this.code = opts.code;
    this.adapter = opts.adapter;
    this.cause = opts.cause;
    this.retryable = opts.retryable ?? isRetryableByDefault(opts.code);
  }
}

function isRetryableByDefault(code: StorageErrorCode): boolean {
  switch (code) {
    case "network":
    case "timeout":
    case "rate-limited":
    case "upstream-error":
      return true;
    default:
      return false;
  }
}

export class ObjectNotFound extends StorageError {
  constructor(adapter: string, key: string, cause?: unknown) {
    super({
      code: "not-found",
      message: `object not found: ${key}`,
      adapter,
      cause,
    });
    this.name = "ObjectNotFound";
  }
}

export class AccessDenied extends StorageError {
  constructor(adapter: string, detail: string, cause?: unknown) {
    super({
      code: "access-denied",
      message: `access denied: ${detail}`,
      adapter,
      cause,
    });
    this.name = "AccessDenied";
  }
}

export class InvalidKey extends StorageError {
  constructor(adapter: string, key: string, reason: string) {
    super({
      code: "invalid-key",
      message: `invalid key "${key}": ${reason}`,
      adapter,
    });
    this.name = "InvalidKey";
  }
}

export class ChecksumMismatch extends StorageError {
  public readonly expected: string;
  public readonly actual: string;
  constructor(adapter: string, expected: string, actual: string) {
    super({
      code: "checksum-mismatch",
      message: `checksum mismatch: expected ${expected}, got ${actual}`,
      adapter,
    });
    this.name = "ChecksumMismatch";
    this.expected = expected;
    this.actual = actual;
  }
}

export class Unsupported extends StorageError {
  constructor(adapter: string, op: string) {
    super({
      code: "unsupported",
      message: `operation "${op}" is not supported by adapter "${adapter}"`,
      adapter,
    });
    this.name = "Unsupported";
  }
}

export class PayloadTooLarge extends StorageError {
  constructor(adapter: string, limit: number, actual: number) {
    super({
      code: "payload-too-large",
      message: `payload ${actual} bytes exceeds limit ${limit}`,
      adapter,
    });
    this.name = "PayloadTooLarge";
  }
}

export function isStorageError(e: unknown): e is StorageError {
  return e instanceof StorageError;
}
