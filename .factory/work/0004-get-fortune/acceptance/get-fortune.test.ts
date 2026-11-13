// The planner's acceptance test for work order 0004 (hapi-factory docs/runbooks/engine.md).
// The verify container runs it with the bakery up: bun test ./.factory/work/0004-get-fortune/acceptance
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

async function getFortune(client: Client, id: number): Promise<{ isError: boolean; body: Record<string, unknown> }> {
  const result = await client.callTool({ name: "get_fortune", arguments: { id } });
  const content = result.content as { type: string; text?: string }[];
  expect(content[0]?.type).toBe("text");
  return { isError: result.isError === true, body: JSON.parse(content[0]?.text ?? "") as Record<string, unknown> };
}

test("get_fortune returns a fixture fortune by its id, the first's and the last's", async () => {
  expect(fixtures.length).toBeGreaterThan(1);
  const client = await connected();
  try {
    for (const want of [fixtures[0], fixtures[fixtures.length - 1]] as Fortune[]) {
      expect(await getFortune(client, want.id)).toEqual({ isError: false, body: { id: want.id, text: want.text } });
    }
  } finally {
    await client.close();
  }
});

test("get_fortune gives an error result naming an id no fixture has", async () => {
  const missing = Math.max(...fixtures.map((f) => f.id)) + 1000;
  const client = await connected();
  try {
    const got = await getFortune(client, missing);
    expect(got.isError).toBe(true);
    expect(typeof got.body.error).toBe("string");
    expect(got.body.error as string).toContain(String(missing));
  } finally {
    await client.close();
  }
});
