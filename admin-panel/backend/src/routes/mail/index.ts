/** Mail plugin route mount.
 *
 *  Wired by `server.ts` under `/api/mail`. */

import { Hono } from "hono";
import { connectionsRoutes } from "./connections";
import { threadsRoutes } from "./threads";
import { messagesRoutes } from "./messages";
import { labelsRoutes } from "./labels";
import { searchRoutes } from "./search";
import { aiRoutes } from "./ai";
import { templatesRoutes } from "./templates";
import { notesRoutes } from "./notes";
import { settingsRoutes } from "./settings";
import { rulesRoutes } from "./rules";
import { sharedRoutes } from "./shared-inbox";
import { agentRoutes } from "./agent";
import { contactsRoutes } from "./contacts";
import { unsubscribeRoutes } from "./unsubscribe";
import { icalRoutes } from "./ical";
import { imageProxyRoutes } from "./image-proxy";
import { googleWebhookRoutes } from "./webhooks/google";
import { microsoftWebhookRoutes } from "./webhooks/microsoft";
import { attachmentsRoutes } from "./attachments";
import { pushRoutes } from "./push";
import { exportImportRoutes } from "./export-import";
import { blockRoutes } from "./block";
import { receiptsRoutes } from "./receipts";
import { selfHostedRoutes } from "./selfhosted";

export const mailRoutes = new Hono();

mailRoutes.route("/connections", connectionsRoutes);
mailRoutes.route("/threads", threadsRoutes);
mailRoutes.route("/messages/attachments", attachmentsRoutes);
mailRoutes.route("/messages", messagesRoutes);
mailRoutes.route("/labels", labelsRoutes);
mailRoutes.route("/search", searchRoutes);
mailRoutes.route("/ai", aiRoutes);
mailRoutes.route("/templates", templatesRoutes);
mailRoutes.route("/notes", notesRoutes);
mailRoutes.route("/settings", settingsRoutes);
mailRoutes.route("/rules", rulesRoutes);
mailRoutes.route("/shared", sharedRoutes);
mailRoutes.route("/agent", agentRoutes);
mailRoutes.route("/contacts", contactsRoutes);
mailRoutes.route("/unsubscribe", unsubscribeRoutes);
mailRoutes.route("/ical", icalRoutes);
mailRoutes.route("/image-proxy", imageProxyRoutes);
mailRoutes.route("/push", pushRoutes);
mailRoutes.route("/export", exportImportRoutes);
mailRoutes.route("/block", blockRoutes);
mailRoutes.route("/receipts", receiptsRoutes);
mailRoutes.route("/self-hosted", selfHostedRoutes);
mailRoutes.route("/webhooks/google", googleWebhookRoutes);
mailRoutes.route("/webhooks/microsoft", microsoftWebhookRoutes);

mailRoutes.get("/health", (c) => c.json({ ok: true, service: "mail" }));
