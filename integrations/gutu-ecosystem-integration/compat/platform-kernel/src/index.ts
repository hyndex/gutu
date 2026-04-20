export type ValidationIssue = {
  code: string;
  message: string;
  path?: string | undefined;
  [key: string]: unknown;
};

export class ValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[] = []) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export type LegacyPackageDefinition = {
  id: string;
  kind: string;
  version: string;
  description: string;
  [key: string]: unknown;
};

export function definePackage<T extends LegacyPackageDefinition>(input: T): Readonly<T> {
  if (!input.id || !input.kind || !input.version || !input.description) {
    throw new ValidationError("Package definitions must include id, kind, version, and description.", [
      {
        code: "package.definition.invalid",
        message: "missing required package metadata"
      }
    ]);
  }

  return Object.freeze({
    ...input
  });
}
