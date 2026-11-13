import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Bakery, Fortune } from "../bakery.ts";

/** The fortune held under `id`, as served, or undefined when none is. */
export function findFortune(fortunes: Fortune[], id: number): Fortune | undefined {
  const found = fortunes.find((f) => f.id === id);
  return found ? { id: found.id, text: found.text } : undefined;
}

export function register(server: McpServer, bakery: Bakery): void {
  server.registerTool(
    "get_fortune",
    {
      description: "The one fortune the bakery holds under an id.",
      inputSchema: { id: z.number().int().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      const fortune = findFortune(await bakery.fortunes(), id);
      if (!fortune) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `the bakery holds no fortune with id ${id}` }) }],
          isError: true,
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(fortune) }] };
    },
  );
}
