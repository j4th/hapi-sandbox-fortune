import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Bakery, Fortune } from "../src/bakery.ts";
import { createServer } from "../src/server.ts";

const fortunes: Fortune[] = [
  { id: 1, text: "One" },
  { id: 2, text: "Two" },
  { id: 3, text: "Three" },
];
const bakery: Bakery = { health: async () => true, fortunes: async () => fortunes };

async function crack(args: Record<string, unknown>) {
  const server = await createServer({ bakery });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await server.connect(s);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(c);
  const result = await client.callTool({ name: "crack_cookie", arguments: args });
  await client.close();
  return result;
}

type Cookie = { id: number; text: string; lucky_numbers: number[] };

function parse(result: Awaited<ReturnType<typeof crack>>): Cookie {
  const content = result.content as { type: string; text: string }[];
  expect(content).toHaveLength(1);
  expect(content[0]?.type).toBe("text");
  return JSON.parse(content[0]?.text ?? "") as Cookie;
}

function checkShape(r: Cookie) {
  expect(fortunes).toContainEqual({ id: r.id, text: r.text });
  expect(r.lucky_numbers).toHaveLength(3);
  expect(new Set(r.lucky_numbers).size).toBe(3);
  for (const n of r.lucky_numbers) {
    expect(Number.isInteger(n)).toBe(true);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(49);
  }
}

test("the same seed gives the same answer", async () => {
  const a = parse(await crack({ seed: 7 }));
  const b = parse(await crack({ seed: 7 }));
  expect(b).toEqual(a);
  checkShape(a);
});

test("without a seed it still gives a well-formed answer", async () => {
  checkShape(parse(await crack({})));
});

test("a non-integer seed is rejected", async () => {
  const result = await crack({ seed: 1.5 });
  expect(result.isError).toBe(true);
});

test("crack_cookie is read-only", async () => {
  const server = await createServer({ bakery });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await server.connect(s);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(c);
  const { tools } = await client.listTools();
  expect(tools.find((t) => t.name === "crack_cookie")?.annotations?.readOnlyHint).toBe(true);
  await client.close();
});

test("lucky numbers are distinct across many seeds", async () => {
  const { luckyNumbers, seededRandom } = await import("../src/tools/crack-cookie.ts");
  for (let seed = 0; seed < 500; seed++) {
    const ns = luckyNumbers(seededRandom(seed));
    expect(new Set(ns).size).toBe(3);
  }
});

test("a malformed fortune from the bakery is rejected", async () => {
  const bad: Bakery = {
    health: async () => true,
    fortunes: async () => [{ id: "x", text: 5 } as unknown as Fortune],
  };
  const server = await createServer({ bakery: bad });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await server.connect(s);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(c);
  const result = await client.callTool({ name: "crack_cookie", arguments: { seed: 1 } });
  await client.close();
  expect(result.isError).toBe(true);
});
