import { describe, expect, test } from "bun:test";
import { categorize } from "../../src/lib/mail/categorize";

describe("categorize", () => {
  test("social domains route to social", () => {
    expect(categorize({ fromEmail: "no-reply@facebookmail.com", subject: "Notif" })).toBe("social");
    expect(categorize({ fromEmail: "messages-noreply@linkedin.com", subject: "View" })).toBe("social");
  });

  test("ESP / bulk domains route to promotions", () => {
    expect(categorize({ fromEmail: "n@news.list-manage.com", subject: "Hello", headers: { "list-unsubscribe": "<mailto:u@x>" }, hasUnsubscribe: true })).toBe("promotions");
  });

  test("update keywords route to updates", () => {
    expect(categorize({ fromEmail: "billing@acme.test", subject: "Your invoice INV-123", bodyText: "" })).toBe("updates");
    expect(categorize({ fromEmail: "x@y.test", subject: "Order shipped" })).toBe("updates");
  });

  test("List-Id without keyword routes to forums", () => {
    expect(categorize({ fromEmail: "a@x.test", subject: "topic", headers: { "list-id": "<dev.list.example>" }, hasListId: true })).toBe("forums");
  });

  test("primary fallback for normal mail", () => {
    expect(categorize({ fromEmail: "alice@partner.test", subject: "Quick question" })).toBe("primary");
  });

  test("List-Unsubscribe alone falls back to promotions", () => {
    expect(categorize({ fromEmail: "a@b.test", subject: "Hi", hasUnsubscribe: true })).toBe("promotions");
  });
});
