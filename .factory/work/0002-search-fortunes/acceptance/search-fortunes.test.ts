// The planner's acceptance tests for work order 0002 (hapi-factory docs/runbooks/engine.md).
// The verify container runs them with the bakery up: bun test ./.factory/work/0002-search-fortunes/acceptance
import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../../../src/server.ts";

type Fortune = { id: number; text: string };

const fixtures: Fortune[] = await Bun.file(new URL("../../../../smoke/bakery/fortunes.json", import.meta.url)).json();

async function connected(): Promise<Client> {
  const server = await createServer();
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "acceptance", version: "0.0.0" });
  await client.connect(clientSide);
  return client;
}

async function search(client: Client, keyword: string): Promise<Fortune[]> {
  const result = await client.callTool({ name: "search_fortunes", arguments: { keyword } });
  expect(result.isError).not.toBe(true);
  const content = result.content as { type: string; text?: string }[];
  expect(content[0]?.type).toBe("text");
  return (JSON.parse(content[0]?.text ?? "") as { fortunes: Fortune[] }).fortunes;
}

const byId = (a: Fortune, b: Fortune) => a.id - b.id;

test("search_fortunes finds exactly the fixture fortunes holding a keyword in another case, at most 10", async () => {
  const keyword = "TOMORROW";
  const want = fixtures.filter((f) => f.text.toLowerCase().includes(keyword.toLowerCase()));
  expect(want.length).toBeGreaterThan(1);
  const client = await connected();
  try {
    const got = await search(client, keyword);
    expect(got.length).toBeLessThanOrEqual(10);
    expect([...got].sort(byId)).toEqual([...want].sort(byId).slice(0, 10));
  } finally {
    await client.close();
  }
});

test("search_fortunes finds none for a keyword no fixture holds", async () => {
  const keyword = "zeppelin";
  expect(fixtures.some((f) => f.text.toLowerCase().includes(keyword))).toBe(false);
  const client = await connected();
  try {
    expect(await search(client, keyword)).toEqual([]);
  } finally {
    await client.close();
  }
});
