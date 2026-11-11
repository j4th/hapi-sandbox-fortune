import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Bakery, Fortune } from "../bakery.ts";

export const MAX_RESULTS = 10;

/** Fortunes whose text contains the keyword, case-insensitive, at most MAX_RESULTS, in bakery order. */
export function searchFortunes(fortunes: Fortune[], keyword: string): Fortune[] {
  const needle = keyword.toLowerCase();
  return fortunes
    .filter((f) => typeof f.text === "string" && f.text.toLowerCase().includes(needle))
    .slice(0, MAX_RESULTS)
    .map((f) => ({ id: f.id, text: f.text }));
}

export function register(server: McpServer, bakery: Bakery): void {
  server.registerTool(
    "search_fortunes",
    {
      description: `Finds the bakery's fortunes whose text contains a keyword, case-insensitive, at most ${MAX_RESULTS}.`,
      inputSchema: { keyword: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ keyword }) => {
      const fortunes = await bakery.fortunes();
      const result = { fortunes: searchFortunes(fortunes, keyword) };
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );
}
