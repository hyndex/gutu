/** Aggregate view contributions for the mail plugin. */

import * as React from "react";
import { defineCustomView } from "@/builders";
import { MailInboxPage } from "./inbox";
import { MailComposePage } from "./compose";
import { MailSearchPage } from "./search";
import { MailLabelManagerPage } from "./label-manager";
import { MailFiltersPage } from "./filters";
import { MailContactsPage } from "./contacts";
import { MailDashboardPage } from "./dashboard";
import { MailDeveloperPage } from "./developer";
import { MailSettingsPage } from "./settings/Settings";

export const MAIL_VIEWS = [
  defineCustomView({ id: "mail.inbox.view", title: "Mail", description: "Multi-account inbox.", resource: "mail.thread", render: () => React.createElement(MailInboxPage) }),
  defineCustomView({ id: "mail.compose.view", title: "Compose", description: "Compose a message.", resource: "mail.draft", render: () => React.createElement(MailComposePage) }),
  defineCustomView({ id: "mail.search.view", title: "Search mail", description: "Hybrid lexical + semantic search.", resource: "mail.thread", render: () => React.createElement(MailSearchPage) }),
  defineCustomView({ id: "mail.labels.view", title: "Labels", description: "Manage labels.", resource: "mail.label", render: () => React.createElement(MailLabelManagerPage) }),
  defineCustomView({ id: "mail.filters.view", title: "Filters", description: "Rules engine.", resource: "mail.rule", render: () => React.createElement(MailFiltersPage) }),
  defineCustomView({ id: "mail.contacts.view", title: "Contacts", description: "Address book.", resource: "mail.contact", render: () => React.createElement(MailContactsPage) }),
  defineCustomView({ id: "mail.dashboard.view", title: "Mail dashboard", description: "KPIs + activity.", resource: "mail.thread", render: () => React.createElement(MailDashboardPage) }),
  defineCustomView({ id: "mail.developer.view", title: "Mail developer", description: "Endpoints, AI usage, queue.", resource: "mail.thread", render: () => React.createElement(MailDeveloperPage) }),
  defineCustomView({ id: "mail.settings.view", title: "Mail settings", description: "Mail settings.", resource: "mail.settings", render: () => React.createElement(MailSettingsPage) }),
];
