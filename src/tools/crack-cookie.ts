import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Bakery } from "../bakery.ts";

/** mulberry32: a small deterministic PRNG returning floats in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function luckyNumbers(random: () => number): number[] {
  const pool = Array.from({ length: 49 }, (_, i) => i + 1);
  const picked: number[] = [];
  for (let k = 0; k < 3; k++) {
    const i = Math.floor(random() * pool.length);
    picked.push(pool.splice(i, 1)[0] as number);
  }
  return picked;
}

export function isFortune(value: unknown): value is { id: number; text: string } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { id?: unknown; text?: unknown };
  return Number.isInteger(v.id) && typeof v.text === "string" && v.text.length > 0;
}

export function register(server: McpServer, bakery: Bakery): void {
  server.registerTool(
    "crack_cookie",
    {
      description:
        "Cracks a fortune cookie: one fortune and three lucky numbers from 1 to 49. The same seed gives the same answer.",
      inputSchema: { seed: z.number().int().optional() },
      annotations: { readOnlyHint: true },
    },
    async ({ seed }) => {
      const fortunes = await bakery.fortunes();
      const random = seed === undefined ? Math.random : seededRandom(seed);
      const fortune = fortunes[Math.floor(random() * fortunes.length)];
      if (fortune !== undefined && !isFortune(fortune)) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "the bakery served a malformed fortune" }) }],
          isError: true,
        };
      }
      if (!fortune) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "the bakery has no fortunes" }) }],
          isError: true,
        };
      }
      const result = { id: fortune.id, text: fortune.text, lucky_numbers: luckyNumbers(random) };
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );
}
