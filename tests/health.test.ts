import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { type Bakery, createBakery } from "../src/bakery.ts";
import { createServer } from "../src/server.ts";

async function connect(bakery: Bakery): Promise<Client> {
  const server = await createServer({ bakery });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await server.connect(s);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(c);
  return client;
}

test("health gives {ok:true} when the bakery answers", async () => {
  const fake = (async () => Response.json({ ok: true })) as unknown as typeof fetch;
  const client = await connect(createBakery("http://bakery.test", fake));
  const result = await client.callTool({ name: "health", arguments: {} });
  const content = result.content as { type: string; text: string }[];
  expect(content).toHaveLength(1);
  expect(content[0]?.type).toBe("text");
  expect(JSON.parse(content[0]?.text ?? "")).toEqual({ ok: true });
  await client.close();
});

test("health reports an error when the bakery is down", async () => {
  const fake = (async () => {
    throw new Error("down");
  }) as unknown as typeof fetch;
  const client = await connect(createBakery("http://bakery.test", fake));
  const result = await client.callTool({ name: "health", arguments: {} });
  expect(result.isError).toBe(true);
  await client.close();
});

test("every tool is read-only", async () => {
  const client = await connect(createBakery("http://bakery.test", fetch));
  const { tools } = await client.listTools();
  expect(tools.map((t) => t.name)).toContain("health");
  for (const t of tools) expect([t.name, t.annotations?.readOnlyHint]).toEqual([t.name, true]);
  await client.close();
});
