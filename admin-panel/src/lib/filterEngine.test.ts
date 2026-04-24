import { describe, test, expect } from "bun:test";
import { evalFilter, filterRows, getPath } from "./filterEngine";

const rows = [
  { id: "1", name: "Alice", age: 30, status: "active",  email: "a@x.co",  createdAt: "2024-01-15T00:00:00Z" },
  { id: "2", name: "Bob",   age: 25, status: "draft",   email: "b@x.co",  createdAt: "2023-06-01T00:00:00Z" },
  { id: "3", name: "Carol", age: 42, status: "active",  email: null,      createdAt: "2024-10-01T00:00:00Z" },
  { id: "4", name: "Dan",   age: 19, status: "retired", email: "d@y.org", createdAt: "2022-01-01T00:00:00Z" },
];

describe("getPath", () => {
  test("shallow", () => {
    expect(getPath({ a: 1 }, "a")).toBe(1);
  });
  test("dotted", () => {
    expect(getPath({ a: { b: { c: 42 } } }, "a.b.c")).toBe(42);
  });
  test("missing", () => {
    expect(getPath({ a: 1 }, "b.c")).toBeUndefined();
  });
  test("non-object root", () => {
    expect(getPath(null, "a")).toBeUndefined();
    expect(getPath(5, "a")).toBeUndefined();
  });
});

describe("evalFilter", () => {
  test("eq / neq", () => {
    expect(evalFilter(rows[0], { field: "status", op: "eq", value: "active" })).toBe(true);
    expect(evalFilter(rows[0], { field: "status", op: "neq", value: "active" })).toBe(false);
  });
  test("lt / lte / gt / gte", () => {
    expect(evalFilter(rows[0], { field: "age", op: "lt", value: 35 })).toBe(true);
    expect(evalFilter(rows[0], { field: "age", op: "gt", value: 35 })).toBe(false);
    expect(evalFilter(rows[0], { field: "age", op: "gte", value: 30 })).toBe(true);
    expect(evalFilter(rows[0], { field: "age", op: "lte", value: 30 })).toBe(true);
  });
  test("in / nin", () => {
    expect(evalFilter(rows[0], { field: "status", op: "in", value: ["active", "draft"] })).toBe(true);
    expect(evalFilter(rows[3], { field: "status", op: "in", value: ["active", "draft"] })).toBe(false);
    expect(evalFilter(rows[3], { field: "status", op: "nin", value: ["active", "draft"] })).toBe(true);
  });
  test("contains / starts_with / ends_with", () => {
    expect(evalFilter(rows[0], { field: "name", op: "contains", value: "lic" })).toBe(true);
    expect(evalFilter(rows[0], { field: "name", op: "starts_with", value: "Al" })).toBe(true);
    expect(evalFilter(rows[0], { field: "name", op: "ends_with", value: "ice" })).toBe(true);
  });
  test("between", () => {
    expect(evalFilter(rows[0], { field: "age", op: "between", value: [25, 35] })).toBe(true);
    expect(evalFilter(rows[3], { field: "age", op: "between", value: [25, 35] })).toBe(false);
  });
  test("is_null / is_not_null", () => {
    expect(evalFilter(rows[2], { field: "email", op: "is_null", value: null })).toBe(true);
    expect(evalFilter(rows[0], { field: "email", op: "is_null", value: null })).toBe(false);
    expect(evalFilter(rows[2], { field: "email", op: "is_not_null", value: null })).toBe(false);
    expect(evalFilter(rows[0], { field: "email", op: "is_not_null", value: null })).toBe(true);
  });
  test("is_empty / is_not_empty for empty string + null", () => {
    expect(evalFilter({ x: "" }, { field: "x", op: "is_empty", value: null })).toBe(true);
    expect(evalFilter({ x: null }, { field: "x", op: "is_empty", value: null })).toBe(true);
    expect(evalFilter({ x: "abc" }, { field: "x", op: "is_not_empty", value: null })).toBe(true);
  });
  test("last_n_days", () => {
    const now = new Date("2024-06-01T00:00:00Z");
    expect(evalFilter(
      { createdAt: "2024-05-25T00:00:00Z" },
      { field: "createdAt", op: "last_n_days", value: 30 },
      now,
    )).toBe(true);
    expect(evalFilter(
      { createdAt: "2024-04-01T00:00:00Z" },
      { field: "createdAt", op: "last_n_days", value: 30 },
      now,
    )).toBe(false);
  });
});

describe("evalFilter — AND/OR groups", () => {
  test("AND — all children must pass", () => {
    const tree = {
      and: [
        { field: "status", op: "eq" as const, value: "active" },
        { field: "age", op: "gt" as const, value: 20 },
      ],
    };
    expect(evalFilter(rows[0], tree)).toBe(true);
    expect(evalFilter(rows[3], tree)).toBe(false);
  });
  test("OR — any child passing is enough", () => {
    const tree = {
      or: [
        { field: "status", op: "eq" as const, value: "retired" },
        { field: "age", op: "lt" as const, value: 22 },
      ],
    };
    expect(evalFilter(rows[3], tree)).toBe(true);
    expect(evalFilter(rows[0], tree)).toBe(false);
  });
  test("nested AND-of-OR", () => {
    const tree = {
      and: [
        { field: "status", op: "eq" as const, value: "active" },
        {
          or: [
            { field: "age", op: "lt" as const, value: 30 },
            { field: "age", op: "gt" as const, value: 40 },
          ],
        },
      ],
    };
    expect(evalFilter(rows[2], tree)).toBe(true); // active + age 42
    expect(evalFilter(rows[0], tree)).toBe(false); // active + age 30 (neither <30 nor >40)
  });
});

describe("filterRows", () => {
  test("keeps only matching rows", () => {
    const out = filterRows(rows, { field: "status", op: "eq", value: "active" });
    expect(out.map((r) => r.id)).toEqual(["1", "3"]);
  });
});
