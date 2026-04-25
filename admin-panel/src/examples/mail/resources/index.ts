/** Aggregate export of every mail.* resource definition. */

import { connectionResource } from "./connection";
import { threadResource } from "./thread";
import { messageResource } from "./message";
import { labelResource } from "./label";
import { folderResource } from "./folder";
import { draftResource } from "./draft";
import { attachmentResource } from "./attachment";
import { templateResource } from "./template";
import { signatureResource } from "./signature";
import { noteResource } from "./note";
import { snoozeResource } from "./snooze";
import { scheduledSendResource } from "./scheduled-send";
import { ruleResource } from "./rule";
import { contactResource } from "./contact";
import { contactGroupResource } from "./contact-group";
import { sharedInboxResource } from "./shared-inbox";
import { sharedAssignmentResource } from "./shared-assignment";
import { summaryResource } from "./summary";
import { writingStyleResource } from "./writing-style";
import { hotkeysResource } from "./hotkeys";
import { trackingBlockResource } from "./tracking-block";
import { tenantSettingsResource } from "./tenant-settings";
import { settingsResource } from "./settings";
import { icsEventResource } from "./ics-event";
import { securityKeyResource } from "./security-key";

export const MAIL_RESOURCES = [
  connectionResource,
  threadResource,
  messageResource,
  labelResource,
  folderResource,
  draftResource,
  attachmentResource,
  templateResource,
  signatureResource,
  noteResource,
  snoozeResource,
  scheduledSendResource,
  ruleResource,
  contactResource,
  contactGroupResource,
  sharedInboxResource,
  sharedAssignmentResource,
  summaryResource,
  writingStyleResource,
  hotkeysResource,
  trackingBlockResource,
  tenantSettingsResource,
  settingsResource,
  icsEventResource,
  securityKeyResource,
];

export {
  connectionResource,
  threadResource,
  messageResource,
  labelResource,
  folderResource,
  draftResource,
  attachmentResource,
  templateResource,
  signatureResource,
  noteResource,
  snoozeResource,
  scheduledSendResource,
  ruleResource,
  contactResource,
  contactGroupResource,
  sharedInboxResource,
  sharedAssignmentResource,
  summaryResource,
  writingStyleResource,
  hotkeysResource,
  trackingBlockResource,
  tenantSettingsResource,
  settingsResource,
  icsEventResource,
  securityKeyResource,
};
