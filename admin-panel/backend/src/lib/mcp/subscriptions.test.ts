import { describe, test, expect, beforeEach } from "bun:test";
import {
  broadcastResourceChanged,
  drain,
  emitLog,
  getLogLevel,
  setLogLevel,
  subscribe,
  unsubscribe,
  _resetSubscriptionsState_forTest,
} from "./subscriptions";

describe("subscriptions + log channel", () => {
  beforeEach(() => _resetSubscriptionsState_forTest());

  test("subscribed agent receives resources/updated when broadcast", () => {
    subscribe("agent-1", "gutu://resource/crm.contact/abc");
    const count = broadcastResourceChanged("gutu://resource/crm.contact/abc");
    expect(count).toBe(1);
    const drained = drain("agent-1");
    expect(drained).toHaveLength(1);
    expect(drained[0]!.method).toBe("notifications/resources/updated");
    expect((drained[0]!.params as { uri: string }).uri).toBe("gutu://resource/crm.contact/abc");
  });

  test("unsubscribed agent does not receive notifications", () => {
    subscribe("agent-2", "gutu://resource/x");
    unsubscribe("agent-2", "gutu://resource/x");
    broadcastResourceChanged("gutu://resource/x");
    expect(drain("agent-2")).toHaveLength(0);
  });

  test("drain empties the queue", () => {
    subscribe("agent-3", "gutu://resource/y");
    broadcastResourceChanged("gutu://resource/y");
    drain("agent-3");
    expect(drain("agent-3")).toHaveLength(0);
  });

  test("default log level is info", () => {
    expect(getLogLevel("agent-fresh")).toBe("info");
  });

  test("setLogLevel filters lower-priority log emits", () => {
    subscribe("agent-4", "gutu://resource/y"); // create state
    setLogLevel("agent-4", "warning");
    emitLog("agent-4", "info", "should be dropped");
    emitLog("agent-4", "warning", "should pass");
    emitLog("agent-4", "error", "also passes");
    const got = drain("agent-4");
    expect(got).toHaveLength(2);
    expect((got[0]!.params as { message: string }).message).toBe("should pass");
  });

  test("queue caps at MAX_PENDING — newer notifications survive", () => {
    subscribe("agent-5", "gutu://resource/z");
    for (let i = 0; i < 250; i++) {
      broadcastResourceChanged("gutu://resource/z");
    }
    const drained = drain("agent-5");
    expect(drained.length).toBeLessThanOrEqual(200);
  });
});
