import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Bakery, Fortune } from "../src/bakery.ts";
import { createServer } from "../src/server.ts";
import { dayIndex, isIsoDate } from "../src/tools/fortune-of-the-day.ts";

const fortunes: Fortune[] = [
  { id: 1, text: "One" },
  { id: 2, text: "Two" },
  { id: 3, text: "Three" },
];

async function call(args: Record<string, unknown>, served: unknown[] = fortunes) {
  const bakery: Bakery = { health: async () => true, fortunes: async () => served as Fortune[] };
  const server = await createServer({ bakery });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await server.connect(s);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(c);
  const result = await client.callTool({ name: "fortune_of_the_day", arguments: args });
  await client.close();
  return result;
}

function parse(result: Awaited<ReturnType<typeof call>>) {
  const content = result.content as { type: string; text: string }[];
  expect(content).toHaveLength(1);
  expect(content[0]?.type).toBe("text");
  return JSON.parse(content[0]?.text ?? "");
}

test("same date gives the same served fortune on every call", async () => {
  const a = await call({ date: "2026-11-01" });
  const b = await call({ date: "2026-11-01" });
  expect(a.isError).not.toBe(true);
  expect(parse(a)).toEqual(parse(b));
  expect(fortunes).toContainEqual(parse(a));
});

test("result does not depend on the order the bakery serves", async () => {
  const a = parse(await call({ date: "2025-03-14" }));
  const b = parse(await call({ date: "2025-03-14" }, [...fortunes].reverse()));
  expect(b).toEqual(a);
});

test("different dates spread over the fortunes", () => {
  const seen = new Set<number>();
  for (let d = 1; d <= 28; d++) seen.add(dayIndex(`2026-02-${String(d).padStart(2, "0")}`, 3));
  expect(seen.size).toBe(3);
});

test("date validation", async () => {
  expect(isIsoDate("2024-02-29")).toBe(true);
  expect(isIsoDate("2023-02-29")).toBe(false);
  expect(isIsoDate("2026-1-01")).toBe(false);
  expect((await call({ date: "2026-13-01" })).isError).toBe(true);
  expect((await call({ date: "tomorrow" })).isError).toBe(true);
});

test("errors on empty or malformed bakery data", async () => {
  expect((await call({ date: "2026-11-01" }, [])).isError).toBe(true);
  expect((await call({ date: "2026-11-01" }, [{ id: "x", text: "" }])).isError).toBe(true);
});

test("is registered read-only", async () => {
  const bakery: Bakery = { health: async () => true, fortunes: async () => fortunes };
  const server = await createServer({ bakery });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await server.connect(s);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(c);
  const { tools } = await client.listTools();
  await client.close();
  expect(tools.find((t) => t.name === "fortune_of_the_day")?.annotations?.readOnlyHint).toBe(true);
});
