import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Bakery, Fortune } from "../src/bakery.ts";
import { createServer } from "../src/server.ts";

const fortunes: Fortune[] = [
  ...Array.from({ length: 12 }, (_, i) => ({ id: i + 1, text: `Luck number ${i + 1}` })),
  { id: 100, text: "Tomorrow brings rain" },
  { id: 101, text: "Nothing here" },
];
const bakery: Bakery = { health: async () => true, fortunes: async () => fortunes };

async function connected(): Promise<Client> {
  const server = await createServer({ bakery });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await server.connect(s);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(c);
  return client;
}

async function search(keyword: unknown) {
  const client = await connected();
  try {
    return await client.callTool({ name: "search_fortunes", arguments: { keyword } });
  } finally {
    await client.close();
  }
}

function parse(result: Awaited<ReturnType<typeof search>>): Fortune[] {
  const content = result.content as { type: string; text: string }[];
  expect(content).toHaveLength(1);
  expect(content[0]?.type).toBe("text");
  return (JSON.parse(content[0]?.text ?? "") as { fortunes: Fortune[] }).fortunes;
}

test("matches case-insensitively", async () => {
  expect(parse(await search("tOMORROW"))).toEqual([{ id: 100, text: "Tomorrow brings rain" }]);
});

test("returns at most 10", async () => {
  const got = parse(await search("luck"));
  expect(got).toHaveLength(10);
  expect(got).toEqual(fortunes.slice(0, 10));
});

test("returns none when nothing matches", async () => {
  expect(parse(await search("zeppelin"))).toEqual([]);
});

test("rejects an empty keyword", async () => {
  expect((await search("")).isError).toBe(true);
});

test("search_fortunes is read-only", async () => {
  const client = await connected();
  const { tools } = await client.listTools();
  expect(tools.find((t) => t.name === "search_fortunes")?.annotations?.readOnlyHint).toBe(true);
  await client.close();
});
