import type { EmailTemplateRegistry, RenderedEmail } from "@platform/email-templates";

export const packageId = "communication" as const;
export const packageDisplayName = "Communication" as const;
export const packageDescription =
  "Channel compilers, deterministic providers, and delivery orchestration helpers for outbound communications." as const;

export const communicationChannelValues = ["email", "sms", "push", "in-app"] as const;
export const communicationDeliveryModeValues = ["immediate", "scheduled", "digest"] as const;
export const communicationPriorityValues = ["low", "normal", "high", "critical"] as const;

export type CommunicationChannel = (typeof communicationChannelValues)[number];
export type CommunicationDeliveryMode = (typeof communicationDeliveryModeValues)[number];
export type CommunicationPriority = (typeof communicationPriorityValues)[number];

export type CommunicationRoute = {
  id: string;
  channel: CommunicationChannel;
  providerKind: "local" | "provider" | "builtin";
  providerLabel?: string | undefined;
  callbackSupported?: boolean | undefined;
  metadata?: Record<string, string> | undefined;
};

type CommunicationDraftBase<TChannel extends CommunicationChannel> = {
  messageId: string;
  tenantId: string;
  channel: TChannel;
  recipientRef: string;
  deliveryMode: CommunicationDeliveryMode;
  priority: CommunicationPriority;
  idempotencyKey: string;
  providerRoute?: string | undefined;
  endpointId?: string | undefined;
  directAddress?: string | undefined;
  sendAt?: string | undefined;
  reason?: string | undefined;
};

export type EmailCommunicationDraft = CommunicationDraftBase<"email"> & {
  templateId: string;
  templateProps?: Record<string, unknown> | undefined;
};

export type SmsCommunicationDraft = CommunicationDraftBase<"sms"> & {
  bodyText: string;
};

export type PushCommunicationDraft = CommunicationDraftBase<"push"> & {
  title: string;
  bodyText: string;
  data?: Record<string, unknown> | undefined;
};

export type InAppCommunicationDraft = CommunicationDraftBase<"in-app"> & {
  title: string;
  bodyText: string;
  data?: Record<string, unknown> | undefined;
};

export type CommunicationDraft =
  | EmailCommunicationDraft
  | SmsCommunicationDraft
  | PushCommunicationDraft
  | InAppCommunicationDraft;

export type CommunicationPayloadByChannel = {
  email: RenderedEmail & { to: string };
  sms: { to: string; text: string };
  push: { to: string; title: string; body: string; data: Record<string, unknown> };
  "in-app": { to: string; title: string; body: string; data: Record<string, unknown> };
};

export type CommunicationPayload = CommunicationPayloadByChannel[CommunicationChannel];

export type CompiledCommunication<
  TChannel extends CommunicationChannel = CommunicationChannel
> = {
  draft: Extract<CommunicationDraft, { channel: TChannel }>;
  route: CommunicationRoute;
  payload: CommunicationPayloadByChannel[TChannel];
};

export type AnyCompiledCommunication = {
  [TChannel in CommunicationChannel]: CompiledCommunication<TChannel>;
}[CommunicationChannel];

export type CommunicationCompileContext = {
  emailTemplates?: EmailTemplateRegistry | undefined;
};

export type CommunicationCompiler<TChannel extends CommunicationChannel = CommunicationChannel> = {
  channel: TChannel;
  compile(
    draft: Extract<CommunicationDraft, { channel: TChannel }>,
    context?: CommunicationCompileContext
  ): Promise<CompiledCommunication<TChannel>> | CompiledCommunication<TChannel>;
};

export type CommunicationFailureClass = "timeout" | "transient" | "permanent";

export type CommunicationDeliveryResult = {
  kind: "delivered" | "accepted" | "failed";
  providerMessageId?: string | undefined;
  deliveredAt?: string | undefined;
  acceptedAt?: string | undefined;
  callbackToken?: string | undefined;
  failureClass?: CommunicationFailureClass | undefined;
  code?: string | undefined;
  message?: string | undefined;
  retryAfterMs?: number | undefined;
};

export type CommunicationDeliveryFailure = CommunicationDeliveryResult & {
  kind: "failed";
  failureClass: CommunicationFailureClass;
  code: string;
  message: string;
};

export type CommunicationProviderRegistry = {
  send(input: {
    route: CommunicationRoute;
    payload: CommunicationPayload;
  }): Promise<CommunicationDeliveryResult>;
  records: Array<{
    routeId: string;
    providerMessageId: string;
    payload: CommunicationPayload;
    result: CommunicationDeliveryResult;
  }>;
};

export type RetryDecision = {
  retryable: boolean;
  nextStatus: "queued" | "failed" | "dead-letter";
  retryAfterMs?: number | undefined;
  outcomeCategory: "timeout" | "transient-failure" | "permanent-failure";
};

export type CommunicationCallbackEvent = {
  attemptId: string;
  messageId: string;
  event: "accepted" | "delivered" | "failed";
  providerMessageId?: string | null | undefined;
  occurredAt: string;
  code?: string | undefined;
  message?: string | undefined;
};

export function defineCommunicationRoute(route: CommunicationRoute): CommunicationRoute {
  return Object.freeze({
    ...route,
    metadata: route.metadata ? Object.freeze({ ...route.metadata }) : undefined
  });
}

export function registerChannelCompiler<TChannel extends CommunicationChannel>(
  compiler: CommunicationCompiler<TChannel>
): CommunicationCompiler<TChannel> {
  return Object.freeze(compiler);
}

export function defineSmsCompiler(): CommunicationCompiler<"sms"> {
  return registerChannelCompiler({
    channel: "sms",
    compile(draft) {
      if (!draft.bodyText.trim()) {
        throw new Error("sms bodyText is required");
      }

      return {
        draft,
        route: resolveRouteForDraft(draft),
        payload: {
          to: requireDirectAddress(draft, "sms"),
          text: draft.bodyText
        }
      };
    }
  });
}

export function definePushCompiler(): CommunicationCompiler<"push"> {
  return registerChannelCompiler({
    channel: "push",
    compile(draft) {
      if (!draft.title.trim()) {
        throw new Error("push title is required");
      }
      if (!draft.bodyText.trim()) {
        throw new Error("push bodyText is required");
      }

      return {
        draft,
        route: resolveRouteForDraft(draft),
        payload: {
          to: requireDirectAddress(draft, "push"),
          title: draft.title,
          body: draft.bodyText,
          data: Object.freeze({ ...(draft.data ?? {}) })
        }
      };
    }
  });
}

export function defineInAppCompiler(): CommunicationCompiler<"in-app"> {
  return registerChannelCompiler({
    channel: "in-app",
    compile(draft) {
      if (!draft.title.trim()) {
        throw new Error("in-app title is required");
      }
      if (!draft.bodyText.trim()) {
        throw new Error("in-app bodyText is required");
      }

      return {
        draft,
        route: resolveRouteForDraft(draft),
        payload: {
          to: draft.directAddress?.trim() || draft.recipientRef,
          title: draft.title,
          body: draft.bodyText,
          data: Object.freeze({ ...(draft.data ?? {}) })
        }
      };
    }
  });
}

export function compileDraft(input: {
  draft: EmailCommunicationDraft;
  emailTemplates?: EmailTemplateRegistry | undefined;
}): Promise<CompiledCommunication<"email">>;
export function compileDraft(input: {
  draft: SmsCommunicationDraft;
  emailTemplates?: EmailTemplateRegistry | undefined;
}): Promise<CompiledCommunication<"sms">>;
export function compileDraft(input: {
  draft: PushCommunicationDraft;
  emailTemplates?: EmailTemplateRegistry | undefined;
}): Promise<CompiledCommunication<"push">>;
export function compileDraft(input: {
  draft: InAppCommunicationDraft;
  emailTemplates?: EmailTemplateRegistry | undefined;
}): Promise<CompiledCommunication<"in-app">>;
export function compileDraft(input: {
  draft: CommunicationDraft;
  emailTemplates?: EmailTemplateRegistry | undefined;
}): Promise<AnyCompiledCommunication>;
export async function compileDraft(input: {
  draft: CommunicationDraft;
  emailTemplates?: EmailTemplateRegistry | undefined;
}): Promise<AnyCompiledCommunication> {
  const { draft, emailTemplates } = input;
  switch (draft.channel) {
    case "email":
      return compileEmailDraft(draft, {
        emailTemplates
      });
    case "sms":
      return Promise.resolve(defineSmsCompiler().compile(draft));
    case "push":
      return Promise.resolve(definePushCompiler().compile(draft));
    case "in-app":
      return Promise.resolve(defineInAppCompiler().compile(draft));
  }
}

export function createLocalCommunicationProviderRegistry(options?: {
  scriptedOutcomes?: Record<
    string,
    "success" | "callback" | "timeout" | "transient" | "permanent"
  >;
}): CommunicationProviderRegistry {
  let sequence = 0;
  const records: CommunicationProviderRegistry["records"] = [];

  return {
    records,
    send({ route, payload }) {
      sequence += 1;
      const providerMessageId = `${route.id}:${sequence}`;
      const scenario = resolveLocalScenario(route.id, options?.scriptedOutcomes);
      const result = createLocalDeliveryResult(scenario, providerMessageId);

      records.push({
        routeId: route.id,
        providerMessageId,
        payload,
        result
      });

      return Promise.resolve(result);
    }
  };
}

export function createRetryDecision(input: {
  maxAttempts: number;
  nextAttempt: number;
  result: CommunicationDeliveryFailure;
}): RetryDecision {
  const transientFailure = input.result.failureClass === "transient" || input.result.failureClass === "timeout";
  const retryable = transientFailure && input.nextAttempt <= input.maxAttempts;

  return {
    retryable,
    nextStatus: retryable ? "queued" : "dead-letter",
    retryAfterMs: retryable ? input.result.retryAfterMs : undefined,
    outcomeCategory: mapFailureClassToOutcome(input.result.failureClass)
  };
}

export function normalizeCommunicationCallback(callback: CommunicationCallbackEvent): {
  attemptStatus: "accepted" | "delivered" | "failed";
  messageStatus: "accepted" | "delivered" | "failed";
  outcomeCategory: "accepted" | "delivered" | "permanent-failure";
  code?: string | undefined;
  message?: string | undefined;
} {
  switch (callback.event) {
    case "accepted":
      return {
        attemptStatus: "accepted",
        messageStatus: "accepted",
        outcomeCategory: "accepted"
      };
    case "delivered":
      return {
        attemptStatus: "delivered",
        messageStatus: "delivered",
        outcomeCategory: "delivered"
      };
    case "failed":
      return {
        attemptStatus: "failed",
        messageStatus: "failed",
        outcomeCategory: "permanent-failure",
        code: callback.code,
        message: callback.message
      };
  }
}

export function createCommunicationIdempotencyKey(input: {
  tenantId: string;
  channel: CommunicationChannel;
  recipientRef: string;
  templateId?: string | undefined;
  deliveryMode: CommunicationDeliveryMode;
}): string {
  return [
    input.tenantId.trim(),
    input.channel,
    input.recipientRef.trim(),
    input.templateId?.trim() || "direct",
    input.deliveryMode
  ].join(":");
}

async function compileEmailDraft(
  draft: EmailCommunicationDraft,
  context: CommunicationCompileContext
): Promise<CompiledCommunication<"email">> {
  if (!context.emailTemplates) {
    throw new Error("emailTemplates registry is required to compile email drafts");
  }

  const rendered = await context.emailTemplates.render(draft.templateId, draft.templateProps ?? {});

  return {
    draft,
    route: resolveRouteForDraft(draft),
    payload: {
      ...rendered,
      to: requireDirectAddress(draft, "email")
    }
  };
}

function resolveRouteForDraft(draft: CommunicationDraft): CommunicationRoute {
  const routeId = draft.providerRoute ?? getDefaultRouteId(draft.channel);
  return defineCommunicationRoute({
    id: routeId,
    channel: draft.channel,
    providerKind: routeId.startsWith("local-") ? "local" : draft.channel === "in-app" ? "builtin" : "provider",
    callbackSupported: routeId.includes("callback")
  });
}

function requireDirectAddress(
  draft: CommunicationDraft,
  label: "email" | "sms" | "push"
): string {
  const value = draft.directAddress?.trim();
  if (!value) {
    throw new Error(`${label} drafts require a directAddress or resolved endpoint address`);
  }
  return value;
}

function getDefaultRouteId(channel: CommunicationChannel): string {
  switch (channel) {
    case "email":
      return "local-email-success";
    case "sms":
      return "local-sms-success";
    case "push":
      return "local-push-success";
    case "in-app":
      return "local-in-app-success";
  }
}

function resolveLocalScenario(
  routeId: string,
  scriptedOutcomes?: Record<string, "success" | "callback" | "timeout" | "transient" | "permanent">
): "success" | "callback" | "timeout" | "transient" | "permanent" {
  const scripted = scriptedOutcomes?.[routeId];
  if (scripted) {
    return scripted;
  }
  if (routeId.includes("callback")) {
    return "callback";
  }
  if (routeId.includes("timeout")) {
    return "timeout";
  }
  if (routeId.includes("transient")) {
    return "transient";
  }
  if (routeId.includes("permanent")) {
    return "permanent";
  }
  return "success";
}

function createLocalDeliveryResult(
  scenario: "success" | "callback" | "timeout" | "transient" | "permanent",
  providerMessageId: string
): CommunicationDeliveryResult {
  const occurredAt = new Date().toISOString();

  switch (scenario) {
    case "success":
      return {
        kind: "delivered",
        providerMessageId,
        deliveredAt: occurredAt
      };
    case "callback":
      return {
        kind: "accepted",
        providerMessageId,
        acceptedAt: occurredAt,
        callbackToken: `callback:${providerMessageId}`
      };
    case "timeout":
      return {
        kind: "failed",
        failureClass: "timeout",
        code: "provider.timeout",
        message: "Local delivery timed out",
        retryAfterMs: 500
      };
    case "transient":
      return {
        kind: "failed",
        failureClass: "transient",
        code: "provider.unavailable",
        message: "Local provider is temporarily unavailable",
        retryAfterMs: 1_000
      };
    case "permanent":
      return {
        kind: "failed",
        failureClass: "permanent",
        code: "recipient.invalid",
        message: "Local provider rejected the destination"
      };
  }
}

function mapFailureClassToOutcome(
  failureClass: CommunicationFailureClass
): "timeout" | "transient-failure" | "permanent-failure" {
  switch (failureClass) {
    case "timeout":
      return "timeout";
    case "transient":
      return "transient-failure";
    case "permanent":
      return "permanent-failure";
  }
}
