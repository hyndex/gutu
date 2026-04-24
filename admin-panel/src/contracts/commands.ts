export interface CommandDescriptor {
  readonly id: string;
  readonly label: string;
  /** Extra search tokens users might type (aliases, synonyms). */
  readonly keywords?: readonly string[];
  readonly section?: string;
  readonly shortcut?: string;
  readonly icon?: string;
  readonly run: () => void | Promise<void>;
}
