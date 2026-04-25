/** Plugin manifest constants — kept separate so they can be referenced
 *  from feature flags, analytics, and tests without importing React. */

export const MAIL_PLUGIN_ID = "com.gutu.mail";
export const MAIL_PLUGIN_VERSION = "1.0.0";
export const MAIL_PLUGIN_LABEL = "Mail";
export const MAIL_PLUGIN_DESCRIPTION =
  "Gutu Mail — multi-account inbox with AI summary, smart reply, scheduled send, undo, snooze, rules engine, shared inboxes, and PGP/SMIME-ready encryption-at-rest.";
export const MAIL_PLUGIN_VENDOR = { name: "Gutu", url: "https://gutu.app" };
export const MAIL_PLUGIN_ICON = "Mail";
export const MAIL_PLUGIN_LICENSE = "MIT";
export const MAIL_PLUGIN_KEYWORDS = ["mail", "email", "inbox", "gmail", "outlook", "imap"] as const;

/** API + bus event names — surface for cross-plugin integrations. */
export const MAIL_EVENTS = {
  threadOpened: "mail.thread.opened",
  threadArchived: "mail.thread.archived",
  threadStarred: "mail.thread.starred",
  composeOpened: "mail.compose.opened",
  messageSent: "mail.message.sent",
  ruleFired: "mail.rule.fired",
} as const;
