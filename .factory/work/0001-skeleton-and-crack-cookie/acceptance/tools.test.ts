// The planner's acceptance tests for work order 0001 (hapi-factory docs/runbooks/engine.md).
// The verify container runs them with the bakery up: bun test ./.factory/work/0001-skeleton-and-crack-cookie/acceptance
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

async function callJson(client: Client, name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const result = await client.callTool({ name, arguments: args });
  expect(result.isError).not.toBe(true);
  const content = result.content as { type: string; text?: string }[];
  expect(content[0]?.type).toBe("text");
  return JSON.parse(content[0]?.text ?? "");
}

test("health and crack_cookie are listed, and every tool is read-only", async () => {
  const client = await connected();
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("health");
    expect(names).toContain("crack_cookie");
    for (const tool of tools) expect([tool.name, tool.annotations?.readOnlyHint]).toEqual([tool.name, true]);
  } finally {
    await client.close();
  }
});

test("crack_cookie with a seed gives the same fixture fortune and three lucky numbers from 1 to 49", async () => {
  const client = await connected();
  try {
    const first = await callJson(client, "crack_cookie", { seed: 7 });
    const second = await callJson(client, "crack_cookie", { seed: 7 });
    expect(second).toEqual(first);
    expect(fixtures).toContainEqual({ id: first.id as number, text: first.text as string });
    const lucky = first.lucky_numbers as number[];
    expect(lucky).toHaveLength(3);
    for (const n of lucky) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(49);
    }
  } finally {
    await client.close();
  }
});
