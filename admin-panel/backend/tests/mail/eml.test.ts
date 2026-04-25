import { describe, expect, test } from "bun:test";
import { exportEml, exportMbox, splitMbox, toRawMessage } from "../../src/lib/mail/eml";

const MSG = {
  id: "m1",
  connectionId: "c1",
  tenantId: "default",
  userId: "u1",
  providerMessageId: "p1",
  providerThreadId: "t1",
  threadId: "t1",
  messageIdHeader: "abc@x.test",
  from: { email: "alice@x.test", name: "Alice" },
  to: [{ email: "bob@y.test" }],
  subject: "Hello",
  bodyText: "plain text",
  bodyHtml: "<p>html body</p>",
  receivedAt: "2026-04-26T10:00:00.000Z",
};

describe("eml export/import", () => {
  test("exportEml round-trips through toRawMessage", () => {
    const eml = exportEml(MSG);
    const raw = toRawMessage(eml, { connectionId: "c2", userId: "u1", tenantId: "default", threadId: "t99", providerMessageId: "p99" });
    expect(raw.from?.email).toBe("alice@x.test");
    expect(raw.to[0].email).toBe("bob@y.test");
    expect(raw.subject).toBe("Hello");
    expect(raw.bodyHtml).toContain("html body");
  });

  test("exportMbox emits one segment per message and round-trips through splitMbox", () => {
    const blob = exportMbox([MSG, { ...MSG, id: "m2", subject: "Second", from: { email: "carol@z.test" } }]);
    const segments = splitMbox(blob);
    expect(segments.length).toBe(2);
    const raw = toRawMessage(segments[1], { connectionId: "c1", userId: "u1", tenantId: "default", threadId: "tx", providerMessageId: "px" });
    expect(raw.from?.email).toBe("carol@z.test");
    expect(raw.subject).toBe("Second");
  });

  test("exportMbox escapes lines beginning with `From `", () => {
    const tricky = { ...MSG, bodyText: "From bob@x.test\nbody continues", bodyHtml: undefined };
    const blob = Buffer.from(exportMbox([tricky])).toString("utf8");
    // First "From " is the mbox separator; the body's "From " becomes ">From ".
    expect(blob.match(/^From /gm)?.length).toBe(1);
    expect(blob).toContain(">From bob@x.test");
  });
});
