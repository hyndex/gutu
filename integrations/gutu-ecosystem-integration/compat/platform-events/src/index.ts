import { randomUUID } from "node:crypto";

export function createEventIdempotencyKey(type: string, key: string): string {
  return `${type}:${key}`;
}

export function createEventEnvelope<TPayload extends Record<string, unknown>>(input: {
  type: string;
  source: string;
  occurredAt: string;
  payload: TPayload;
  correlation?: Record<string, unknown> | undefined;
}) {
  return {
    id: randomUUID(),
    ...input
  };
}

export function createOutboxRecord<TPayload extends Record<string, unknown>>(
  event: {
    id: string;
    type: string;
    occurredAt: string;
    payload: TPayload;
  },
  tenantId: string
) {
  return {
    id: randomUUID(),
    tenantId,
    type: event.type,
    occurredAt: event.occurredAt,
    payload: event.payload
  };
}
