import { describe, test, expect } from "bun:test";
import { evalExpression } from "./expression";

const rec = { revenue: 1000, cost: 300, discount: 10, customer: { vip: true, tier: "gold" } };

describe("evalExpression — literals + arithmetic", () => {
  test("numeric literal", () => {
    expect(evalExpression("42", {}).value).toBe(42);
  });
  test("string literal", () => {
    expect(evalExpression("'hello'", {}).value).toBe("hello");
    expect(evalExpression("\"world\"", {}).value).toBe("world");
  });
  test("add / sub / mul / div", () => {
    expect(evalExpression("2 + 3", {}).value).toBe(5);
    expect(evalExpression("10 - 4", {}).value).toBe(6);
    expect(evalExpression("6 * 7", {}).value).toBe(42);
    expect(evalExpression("10 / 4", {}).value).toBe(2.5);
  });
  test("modulo", () => {
    expect(evalExpression("10 % 3", {}).value).toBe(1);
  });
  test("operator precedence", () => {
    expect(evalExpression("2 + 3 * 4", {}).value).toBe(14);
    expect(evalExpression("(2 + 3) * 4", {}).value).toBe(20);
  });
  test("unary minus", () => {
    expect(evalExpression("-5 + 3", {}).value).toBe(-2);
  });
  test("divide by zero returns null", () => {
    expect(evalExpression("5 / 0", {}).value).toBeNull();
  });
});

describe("evalExpression — field references", () => {
  test("simple field", () => {
    expect(evalExpression("revenue", rec).value).toBe(1000);
  });
  test("dotted path", () => {
    expect(evalExpression("customer.tier", rec).value).toBe("gold");
  });
  test("missing field returns null", () => {
    expect(evalExpression("nonexistent", rec).value).toBeNull();
  });
  test("arithmetic on fields", () => {
    expect(evalExpression("revenue - cost", rec).value).toBe(700);
    expect(evalExpression("(revenue - cost) * (1 - discount/100)", rec).value).toBe(630);
  });
});

describe("evalExpression — comparisons + logical", () => {
  test("eq / neq", () => {
    expect(evalExpression("revenue == 1000", rec).value).toBe(true);
    expect(evalExpression("revenue != 500", rec).value).toBe(true);
  });
  test("lt / gt / lte / gte", () => {
    expect(evalExpression("cost < revenue", rec).value).toBe(true);
    expect(evalExpression("cost >= 300", rec).value).toBe(true);
  });
  test("&& / ||", () => {
    expect(evalExpression("revenue > 500 && cost < 500", rec).value).toBe(true);
    expect(evalExpression("revenue < 100 || cost > 100", rec).value).toBe(true);
  });
  test("short-circuit", () => {
    // If short-circuit works, `missing / 0` never evaluates.
    expect(evalExpression("false && (missing / 0)", rec).value).toBe(false);
  });
});

describe("evalExpression — ternary", () => {
  test("true branch", () => {
    expect(evalExpression("revenue > 500 ? 'big' : 'small'", rec).value).toBe("big");
  });
  test("false branch", () => {
    expect(evalExpression("revenue < 500 ? 'big' : 'small'", rec).value).toBe("small");
  });
});

describe("evalExpression — functions", () => {
  test("abs / min / max", () => {
    expect(evalExpression("abs(-5)", {}).value).toBe(5);
    expect(evalExpression("min(1, 2, 3)", {}).value).toBe(1);
    expect(evalExpression("max(1, 2, 3)", {}).value).toBe(3);
  });
  test("round / floor / ceil", () => {
    expect(evalExpression("round(3.6)", {}).value).toBe(4);
    expect(evalExpression("round(3.14159, 2)", {}).value).toBe(3.14);
    expect(evalExpression("floor(3.9)", {}).value).toBe(3);
    expect(evalExpression("ceil(3.1)", {}).value).toBe(4);
  });
  test("coalesce", () => {
    expect(evalExpression("coalesce(nullish, 'fallback')", {}).value).toBe("fallback");
    expect(evalExpression("coalesce(revenue, 0)", rec).value).toBe(1000);
  });
  test("upper / lower", () => {
    expect(evalExpression("upper('hello')", {}).value).toBe("HELLO");
    expect(evalExpression("lower('WORLD')", {}).value).toBe("world");
  });
  test("len", () => {
    expect(evalExpression("len('hello')", {}).value).toBe(5);
  });
});

describe("evalExpression — error handling", () => {
  test("syntax error surfaces", () => {
    const r = evalExpression("revenue +", rec);
    expect(r.error).toBeDefined();
  });
  test("unknown function surfaces", () => {
    const r = evalExpression("bogus(1)", rec);
    expect(r.error).toBeDefined();
  });
  test("empty expression returns undefined without error", () => {
    const r = evalExpression("", rec);
    expect(r.value).toBeUndefined();
    expect(r.error).toBeUndefined();
  });
});
