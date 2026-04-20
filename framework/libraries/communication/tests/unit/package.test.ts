import { describe, expect, it } from "bun:test";
import React from "react";

import {
  compileDraft,
  createCommunicationIdempotencyKey,
  createLocalCommunicationProviderRegistry,
  createRetryDecision,
  defineInAppCompiler,
  defineSmsCompiler,
  definePushCompiler,
  defineCommunicationRoute,
  packageId,
  registerChannelCompiler
} from "../../src";
import { createEmailTemplateRegistry, defineEmailTemplate } from "@platform/email-templates";

describe("communication", () => {
  it("exposes a stable package id", () => {
    expect(packageId).toBe("communication");
  });

  it("delegates email compilation to @platform/email-templates", async () => {
    const templates = createEmailTemplateRegistry([
      defineEmailTemplate({
        id: "notifications.invoice-ready",
        from: "billing@platform.test",
        replyTo: "support@platform.test",
        previewText: "Your invoice is ready",
        subject: ({ name }: { name: string }) => `Invoice ready for ${name}`,
        component: ({ name }: { name: string }) => React.createElement("div", null, `Hello ${name}`)
      })
    ]);

    const compiled = await compileDraft({
      draft: {
        messageId: "msg-email-1",
        tenantId: "tenant-platform",
        channel: "email",
        recipientRef: "user:ada",
        directAddress: "ada@example.com",
        templateId: "notifications.invoice-ready",
        templateProps: {
          name: "Ada"
        },
        deliveryMode: "immediate",
        priority: "high",
        idempotencyKey: "msg-email-1"
      },
      emailTemplates: templates
    });

    expect(compiled.route.channel).toBe("email");
    expect(compiled.payload.subject).toBe("Invoice ready for Ada");
    expect(compiled.payload.html).toContain("Hello Ada");
    expect(compiled.payload.text.toLowerCase()).toContain("hello ada");
  });

  it("supports sms, push, and in-app compilers through the shared registry", async () => {
    const sms = registerChannelCompiler(defineSmsCompiler());
    const push = registerChannelCompiler(definePushCompiler());
    const inApp = registerChannelCompiler(defineInAppCompiler());

    const smsCompiled = await sms.compile({
      messageId: "msg-sms-1",
      tenantId: "tenant-platform",
      channel: "sms",
      recipientRef: "user:ada",
      directAddress: "+15550000001",
      bodyText: "Your code is 424242",
      deliveryMode: "immediate",
      priority: "normal",
      idempotencyKey: "msg-sms-1"
    });
    const pushCompiled = await push.compile({
      messageId: "msg-push-1",
      tenantId: "tenant-platform",
      channel: "push",
      recipientRef: "device:ada",
      directAddress: "push-token-1",
      title: "Build finished",
      bodyText: "The release bundle is ready.",
      deliveryMode: "immediate",
      priority: "high",
      idempotencyKey: "msg-push-1",
      data: {
        releaseId: "rel_1"
      }
    });
    const inAppCompiled = await inApp.compile({
      messageId: "msg-app-1",
      tenantId: "tenant-platform",
      channel: "in-app",
      recipientRef: "user:ada",
      title: "Approval needed",
      bodyText: "Review the latest export request.",
      deliveryMode: "digest",
      priority: "normal",
      idempotencyKey: "msg-app-1",
      data: {
        href: "/admin/exports/req_1"
      }
    });

    expect(smsCompiled.payload.text).toBe("Your code is 424242");
    expect(pushCompiled.payload.title).toBe("Build finished");
    expect(pushCompiled.payload.data.releaseId).toBe("rel_1");
    expect(inAppCompiled.payload.body).toBe("Review the latest export request.");
  });

  it("provides deterministic local providers for success, timeout, transient, permanent, and callback flows", async () => {
    const providers = createLocalCommunicationProviderRegistry();
    const route = defineCommunicationRoute({
      id: "local-email-callback",
      channel: "email",
      providerKind: "local"
    });

    const accepted = await providers.send({
      route,
      payload: {
        to: "ada@example.com",
        subject: "Queued",
        html: "<p>Queued</p>",
        text: "Queued"
      }
    });
    const timeout = await providers.send({
      route: {
        ...route,
        id: "local-email-timeout"
      },
      payload: {
        to: "ada@example.com",
        subject: "Timeout",
        html: "<p>Timeout</p>",
        text: "Timeout"
      }
    });

    expect(accepted.kind).toBe("accepted");
    expect(accepted.callbackToken).toContain("callback");
    expect(timeout.kind).toBe("failed");
    expect(timeout.failureClass).toBe("timeout");
  });

  it("classifies retryable and terminal failures deterministically", () => {
    const transient = createRetryDecision({
      maxAttempts: 3,
      nextAttempt: 2,
      result: {
        kind: "failed",
        failureClass: "transient",
        code: "provider.unavailable",
        message: "provider unavailable",
        retryAfterMs: 500
      }
    });
    const terminal = createRetryDecision({
      maxAttempts: 2,
      nextAttempt: 2,
      result: {
        kind: "failed",
        failureClass: "permanent",
        code: "recipient.invalid",
        message: "invalid recipient"
      }
    });

    expect(transient.retryable).toBe(true);
    expect(transient.nextStatus).toBe("queued");
    expect(terminal.retryable).toBe(false);
    expect(terminal.nextStatus).toBe("dead-letter");
  });

  it("derives stable idempotency keys for normalized communication drafts", () => {
    expect(
      createCommunicationIdempotencyKey({
        tenantId: "tenant-platform",
        channel: "push",
        recipientRef: "device:ada",
        templateId: "release.ready",
        deliveryMode: "immediate"
      })
    ).toBe("tenant-platform:push:device:ada:release.ready:immediate");
  });
});
