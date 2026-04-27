import { describe, test, expect, beforeEach } from "bun:test";
import {
  cancelPendingForAgent,
  pendingCount,
  registerSamplingTransport,
  requestSampling,
  resolveSamplingResult,
  _resetSampling_forTest,
  type SamplingResult,
} from "./sampling";

describe("sampling correlation", () => {
  beforeEach(() => _resetSampling_forTest());

  test("requestSampling fails fast when no transport is registered", async () => {
    await expect(
      requestSampling({
        agentId: "agent-x",
        params: { messages: [{ role: "user", content: { type: "text", text: "hi" } }] },
      }),
    ).rejects.toThrow(/no sampling transport open/);
    expect(pendingCount()).toBe(0);
  });

  test("registered transport receives the request and the promise resolves with the response", async () => {
    let captured: { id: string; method: string } | null = null;
    registerSamplingTransport((agentId, request) => {
      if (agentId !== "agent-1") return false;
      captured = { id: request.id, method: request.method };
      return true;
    });

    const promise = requestSampling({
      agentId: "agent-1",
      params: { messages: [{ role: "user", content: { type: "text", text: "summarise" } }] },
    });
    expect(captured).not.toBeNull();
    expect(captured!.method).toBe("sampling/createMessage");

    const result: SamplingResult = {
      role: "assistant",
      content: { type: "text", text: "summary" },
      model: "claude-x",
      stopReason: "endTurn",
    };
    expect(resolveSamplingResult({ id: captured!.id, agentId: "agent-1", result })).toBe(true);
    await expect(promise).resolves.toEqual(result);
    expect(pendingCount()).toBe(0);
  });

  test("error response rejects the promise", async () => {
    let capturedId = "";
    registerSamplingTransport((_, request) => { capturedId = request.id; return true; });
    const promise = requestSampling({
      agentId: "agent-2",
      params: { messages: [{ role: "user", content: { type: "text", text: "x" } }] },
    });
    resolveSamplingResult({
      id: capturedId,
      agentId: "agent-2",
      error: { code: -32603, message: "model unavailable" },
    });
    await expect(promise).rejects.toThrow(/model unavailable/);
    expect(pendingCount()).toBe(0);
  });

  test("cross-agent leakage is rejected — wrong agentId on response is ignored", async () => {
    let capturedId = "";
    registerSamplingTransport((_, request) => { capturedId = request.id; return true; });
    const promise = requestSampling({
      agentId: "agent-A",
      params: { messages: [{ role: "user", content: { type: "text", text: "x" } }] },
      timeoutMs: 200,
    });
    // Wrong agentId — must not satisfy the pending promise.
    expect(resolveSamplingResult({
      id: capturedId,
      agentId: "agent-B",
      result: { role: "assistant", content: { type: "text", text: "leak" }, model: "x" },
    })).toBe(false);
    await expect(promise).rejects.toThrow(/timed out/);
  });

  test("timeout rejects and clears the pending entry", async () => {
    registerSamplingTransport(() => true);
    const promise = requestSampling({
      agentId: "agent-3",
      params: { messages: [{ role: "user", content: { type: "text", text: "x" } }] },
      timeoutMs: 50,
    });
    await expect(promise).rejects.toThrow(/timed out/);
    expect(pendingCount()).toBe(0);
  });

  test("cancelPendingForAgent rejects all in-flight requests for an agent", async () => {
    registerSamplingTransport(() => true);
    const p1 = requestSampling({
      agentId: "agent-X",
      params: { messages: [{ role: "user", content: { type: "text", text: "1" } }] },
      timeoutMs: 5_000,
    });
    const p2 = requestSampling({
      agentId: "agent-X",
      params: { messages: [{ role: "user", content: { type: "text", text: "2" } }] },
      timeoutMs: 5_000,
    });
    const p3 = requestSampling({
      agentId: "agent-Y",
      params: { messages: [{ role: "user", content: { type: "text", text: "3" } }] },
      timeoutMs: 5_000,
    });
    expect(pendingCount()).toBe(3);

    const cancelled = cancelPendingForAgent("agent-X", "transport closed");
    expect(cancelled).toBe(2);
    await expect(p1).rejects.toThrow(/transport closed/);
    await expect(p2).rejects.toThrow(/transport closed/);
    expect(pendingCount()).toBe(1); // p3 still pending

    // Clean up p3.
    cancelPendingForAgent("agent-Y", "cleanup");
    await expect(p3).rejects.toThrow();
  });

  test("multiple registered transports — first that returns true wins", async () => {
    let calls = 0;
    registerSamplingTransport(() => { calls++; return false; });
    registerSamplingTransport(() => { calls++; return true; });
    registerSamplingTransport(() => { calls++; return true; });

    const promise = requestSampling({
      agentId: "agent-multi",
      params: { messages: [{ role: "user", content: { type: "text", text: "x" } }] },
      timeoutMs: 100,
    });
    // All three transports were tried; at least one delivered, so we
    // don't fail-fast — promise pends until timeout.
    expect(calls).toBe(3);
    await expect(promise).rejects.toThrow(/timed out/);
  });

  test("misbehaving transport (throws) does not break sampling for others", async () => {
    registerSamplingTransport(() => { throw new Error("boom"); });
    let goodFired = false;
    registerSamplingTransport(() => { goodFired = true; return true; });

    const promise = requestSampling({
      agentId: "agent-misbe",
      params: { messages: [{ role: "user", content: { type: "text", text: "x" } }] },
      timeoutMs: 100,
    });
    expect(goodFired).toBe(true);
    await expect(promise).rejects.toThrow(/timed out/);
  });

  test("response missing both result and error is rejected with a clear error", async () => {
    let capturedId = "";
    registerSamplingTransport((_, request) => { capturedId = request.id; return true; });
    const promise = requestSampling({
      agentId: "agent-bad",
      params: { messages: [{ role: "user", content: { type: "text", text: "x" } }] },
    });
    resolveSamplingResult({ id: capturedId, agentId: "agent-bad" });
    await expect(promise).rejects.toThrow(/missing result \+ error/);
  });

  test("resolveSamplingResult on an unknown id returns false", () => {
    expect(resolveSamplingResult({
      id: "srv-nonexistent",
      agentId: "agent-q",
      result: { role: "assistant", content: { type: "text", text: "x" }, model: "x" },
    })).toBe(false);
  });

  test("registerSamplingTransport's unregister removes the hook", async () => {
    const unregister = registerSamplingTransport(() => true);
    unregister();
    await expect(
      requestSampling({
        agentId: "agent-unreg",
        params: { messages: [{ role: "user", content: { type: "text", text: "x" } }] },
      }),
    ).rejects.toThrow(/no sampling transport open/);
  });
});
