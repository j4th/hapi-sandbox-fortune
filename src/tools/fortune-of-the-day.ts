import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Bakery } from "../bakery.ts";
import { isFortune } from "./crack-cookie.ts";

/** True when `date` is a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(date: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/** FNV-1a 32-bit hash of the date string: depends on the date alone. */
export function dayIndex(date: string, count: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % count;
}

function error(message: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }], isError: true };
}

export function register(server: McpServer, bakery: Bakery): void {
  server.registerTool(
    "fortune_of_the_day",
    {
      description: "One fortune for a YYYY-MM-DD date, the same on every call for that date.",
      inputSchema: { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD") },
      annotations: { readOnlyHint: true },
    },
    async ({ date }) => {
      if (!isIsoDate(date)) return error("date must be a real YYYY-MM-DD date");
      const fortunes = await bakery.fortunes();
      if (fortunes.length === 0) return error("the bakery has no fortunes");
      if (!fortunes.every(isFortune)) return error("the bakery served a malformed fortune");
      const ordered = [...fortunes].sort((a, b) => a.id - b.id);
      const fortune = ordered[dayIndex(date, ordered.length)] as { id: number; text: string };
      return { content: [{ type: "text", text: JSON.stringify({ id: fortune.id, text: fortune.text }) }] };
    },
  );
}
