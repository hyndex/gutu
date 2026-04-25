import { z } from "zod";
import { defineResource } from "@/builders";

export const IcsEventSchema = z.object({
  id: z.string(),
  uid: z.string(),
  sequence: z.number().int().default(0),
  method: z.string().optional(),
  status: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  duration: z.string().optional(),
  organizer: z.object({ email: z.string(), cn: z.string().optional() }).optional(),
  attendees: z.array(z.object({ email: z.string(), cn: z.string().optional(), partstat: z.string().optional(), role: z.string().optional(), rsvp: z.boolean().optional() })).default([]),
  rrule: z.string().optional(),
  tenantId: z.string().optional(),
});

export const icsEventResource = defineResource({
  id: "mail.ics-event",
  singular: "Calendar event",
  plural: "Calendar events",
  schema: IcsEventSchema,
  displayField: "summary",
  icon: "Calendar",
});
