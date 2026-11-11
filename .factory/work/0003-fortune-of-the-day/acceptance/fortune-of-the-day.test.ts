// The planner's acceptance test for work order 0003 (hapi-factory docs/runbooks/engine.md).
// The verify container runs it with the bakery up: bun test ./.factory/work/0003-fortune-of-the-day/acceptance
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

async function ofTheDay(client: Client, date: string): Promise<Fortune> {
  const result = await client.callTool({ name: "fortune_of_the_day", arguments: { date } });
  expect(result.isError).not.toBe(true);
  const content = result.content as { type: string; text?: string }[];
  expect(content[0]?.type).toBe("text");
  return JSON.parse(content[0]?.text ?? "") as Fortune;
}

test("fortune_of_the_day gives the same fixture fortune for 2026-11-01 on every call", async () => {
  const client = await connected();
  try {
    const first = await ofTheDay(client, "2026-11-01");
    const second = await ofTheDay(client, "2026-11-01");
    expect(second).toEqual(first);
    expect(fixtures).toContainEqual({ id: first.id, text: first.text });
  } finally {
    await client.close();
  }
});
