import type { NavItem, NavSection } from "@/contracts/nav";
import { SECTIONS } from "@/examples/_factory/sections";

export const MAIL_NAV_SECTION: NavSection = SECTIONS.workspace;

export const MAIL_NAV_ITEMS: NavItem[] = [
  {
    id: "mail.inbox.nav",
    label: "Mail",
    icon: "Mail",
    path: "/mail",
    view: "mail.inbox.view",
    section: MAIL_NAV_SECTION.id,
    order: 60,
  },
  {
    id: "mail.compose.nav",
    label: "Compose",
    icon: "Send",
    path: "/mail/compose",
    view: "mail.compose.view",
    section: MAIL_NAV_SECTION.id,
    order: 61,
  },
  {
    id: "mail.contacts.nav",
    label: "Contacts",
    icon: "UserSquare",
    path: "/mail/contacts",
    view: "mail.contacts.view",
    section: MAIL_NAV_SECTION.id,
    order: 62,
  },
  {
    id: "mail.dashboard.nav",
    label: "Mail dashboard",
    icon: "BarChart3",
    path: "/mail/dashboard",
    view: "mail.dashboard.view",
    section: MAIL_NAV_SECTION.id,
    order: 63,
  },
  {
    id: "mail.settings.nav",
    label: "Mail settings",
    icon: "Settings",
    path: "/mail/settings",
    view: "mail.settings.view",
    section: MAIL_NAV_SECTION.id,
    order: 64,
  },
];
