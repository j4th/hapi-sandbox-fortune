import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Bakery } from "../bakery.ts";

export function register(server: McpServer, bakery: Bakery): void {
  server.registerTool(
    "health",
    {
      description: 'Checks the bakery answers: {"ok":true} when it does.',
      annotations: { readOnlyHint: true },
    },
    async () => {
      const ok = await bakery.health();
      return { content: [{ type: "text", text: JSON.stringify({ ok }) }], isError: !ok };
    },
  );
}
