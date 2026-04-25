/** Feature-flag keys consumed by the mail plugin.
 *
 *  All flags default OFF for the AI surface so an enterprise tenant
 *  doesn't accidentally ship inbox content to a third-party model. The
 *  `mail.enabled` flag controls overall plugin visibility — when off,
 *  the activate() function still registers the manifest but contributes
 *  nothing to the shell. */

export const MAIL_FLAGS = {
  enabled: "mail.enabled",
  imap: "mail.imap.enabled",
  ai: "mail.ai.enabled",
  aiSmartReply: "mail.ai.smart-reply",
  aiSummary: "mail.ai.summary",
  aiCompose: "mail.ai.compose",
  aiSubject: "mail.ai.subject",
  aiClassify: "mail.ai.classify",
  aiAgent: "mail.ai.agent",
  aiWebSearch: "mail.ai.web-search",
  pgp: "mail.security.pgp",
  smime: "mail.security.smime",
  sharedInbox: "mail.shared-inbox",
  rulesEngine: "mail.rules.enabled",
  vacation: "mail.vacation.enabled",
  scheduledSend: "mail.scheduled-send",
  contacts: "mail.contacts.enabled",
  calendar: "mail.ical.enabled",
  agentMcp: "mail.agent.mcp",
  developer: "mail.developer",
  multiSig: "mail.signatures.multi",
  voice: "mail.voice",
} as const;

export type MailFlagKey = (typeof MAIL_FLAGS)[keyof typeof MAIL_FLAGS];

export const MAIL_FLAG_DEFAULTS: Record<MailFlagKey, boolean> = {
  [MAIL_FLAGS.enabled]: true,
  [MAIL_FLAGS.imap]: true,
  [MAIL_FLAGS.ai]: false,
  [MAIL_FLAGS.aiSmartReply]: false,
  [MAIL_FLAGS.aiSummary]: false,
  [MAIL_FLAGS.aiCompose]: false,
  [MAIL_FLAGS.aiSubject]: false,
  [MAIL_FLAGS.aiClassify]: false,
  [MAIL_FLAGS.aiAgent]: false,
  [MAIL_FLAGS.aiWebSearch]: false,
  [MAIL_FLAGS.pgp]: false,
  [MAIL_FLAGS.smime]: false,
  [MAIL_FLAGS.sharedInbox]: true,
  [MAIL_FLAGS.rulesEngine]: true,
  [MAIL_FLAGS.vacation]: true,
  [MAIL_FLAGS.scheduledSend]: true,
  [MAIL_FLAGS.contacts]: true,
  [MAIL_FLAGS.calendar]: true,
  [MAIL_FLAGS.agentMcp]: false,
  [MAIL_FLAGS.developer]: true,
  [MAIL_FLAGS.multiSig]: true,
  [MAIL_FLAGS.voice]: false,
};
