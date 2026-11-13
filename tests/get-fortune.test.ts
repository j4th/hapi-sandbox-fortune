import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Bakery, Fortune } from "../src/bakery.ts";
import { createServer } from "../src/server.ts";
import { findFortune } from "../src/tools/get-fortune.ts";

const fortunes: Fortune[] = [
  { id: 1, text: "One" },
  { id: 2, text: "Two" },
  { id: 7, text: "Seven" },
];

async function call(args: Record<string, unknown>) {
  const bakery: Bakery = { health: async () => true, fortunes: async () => fortunes };
  const server = await createServer({ bakery });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await server.connect(s);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(c);
  const result = await client.callTool({ name: "get_fortune", arguments: args });
  await client.close();
  return result;
}

function parse(result: Awaited<ReturnType<typeof call>>) {
  const content = result.content as { type: string; text: string }[];
  expect(content).toHaveLength(1);
  expect(content[0]?.type).toBe("text");
  return JSON.parse(content[0]?.text ?? "");
}

test("findFortune finds by id and misses cleanly", () => {
  expect(findFortune(fortunes, 7)).toEqual({ id: 7, text: "Seven" });
  expect(findFortune(fortunes, 3)).toBeUndefined();
});

test("get_fortune returns the fortune with that id", async () => {
  const r = await call({ id: 2 });
  expect(r.isError).not.toBe(true);
  expect(parse(r)).toEqual({ id: 2, text: "Two" });
});

test("an unknown id is an error result naming the id", async () => {
  const r = await call({ id: 42 });
  expect(r.isError).toBe(true);
  expect(parse(r).error).toContain("42");
});

test("an id below 1 or not whole is rejected", async () => {
  expect((await call({ id: 0 })).isError).toBe(true);
  expect((await call({ id: 1.5 })).isError).toBe(true);
});

test("get_fortune is read-only", async () => {
  const server = await createServer({ bakery: { health: async () => true, fortunes: async () => fortunes } });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await server.connect(s);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(c);
  const { tools } = await client.listTools();
  await client.close();
  expect(tools.find((t) => t.name === "get_fortune")?.annotations?.readOnlyHint).toBe(true);
});
