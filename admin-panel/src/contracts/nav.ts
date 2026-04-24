export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  /** Hash-route path (e.g. "/booking/bookings"). Omit for group parents. */
  readonly path?: string;
  /** View id this nav item opens. Falls back to a resource-based lookup
   *  if omitted — see router.ts. Prefer setting this explicitly. */
  readonly view?: string;
  /** Optional section to group under in the sidebar. */
  readonly section?: string;
  /** Sort key within the section. */
  readonly order?: number;
  /** Child nav items (for expandable groups). */
  readonly children?: readonly NavItem[];
  /** Badge text (e.g. a pending count) — resolved by the host runtime. */
  readonly badge?: string | number;
}

export interface NavSection {
  readonly id: string;
  readonly label: string;
  readonly order?: number;
  readonly collapsible?: boolean;
}
