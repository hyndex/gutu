/** ConnectionDescriptor — back-references panels.
 *
 *  We wire mail.thread as a "linked record" panel for CRM contacts and
 *  deals. The shell handles the actual list rendering — we only declare
 *  filter functions that produce a FilterTree from the parent record. */

import type { ConnectionDescriptor } from "@/contracts/widgets";

export const MAIL_CONNECTIONS: ConnectionDescriptor = {
  parentResource: "crm.contact",
  categories: [
    {
      id: "communications",
      label: "Communications",
      items: [
        {
          id: "mail.threads",
          label: "Email threads",
          resource: "mail.thread",
          icon: "Mail",
          filter: (parent: Record<string, unknown>) => ({
            kind: "leaf",
            field: "fromEmail",
            op: "eq",
            value: String((parent as { email?: string }).email ?? ""),
          }),
          href: (parent: Record<string, unknown>) =>
            `#/mail/search?q=from:${encodeURIComponent(String((parent as { email?: string }).email ?? ""))}`,
        },
      ],
    },
  ],
};
