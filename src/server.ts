import { readdirSync } from "node:fs";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { type Bakery, createBakery } from "./bakery.ts";

export type ToolModule = {
  register(server: McpServer, bakery: Bakery): void;
};

export type ServerOptions = { bakery?: Bakery };

const toolsDir = join(import.meta.dir, "tools");

/** Builds the MCP server with every tool in src/tools/ registered, not yet connected. */
export async function createServer(options: ServerOptions = {}): Promise<McpServer> {
  const bakery = options.bakery ?? createBakery();
  const server = new McpServer({ name: "hapi-sandbox-fortune", version: "0.0.0" });
  const files = readdirSync(toolsDir)
    .filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith(".d.ts"))
    .sort();
  for (const file of files) {
    const mod = (await import(join(toolsDir, file))) as Partial<ToolModule>;
    if (typeof mod.register !== "function") throw new Error(`src/tools/${file} exports no register()`);
    mod.register(server, bakery);
  }
  return server;
}

if (import.meta.main) {
  const server = await createServer();
  await server.connect(new StdioServerTransport());
  console.error("hapi-sandbox-fortune: serving MCP over stdio");
}
