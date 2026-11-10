// The smoke test: start the server over stdio and call health against the bakery.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [new URL("../src/server.ts", import.meta.url).pathname],
  env,
  stderr: "inherit",
});
const client = new Client({ name: "smoke", version: "0.0.0" });
await client.connect(transport);
try {
  const result = await client.callTool({ name: "health", arguments: {} });
  const content = result.content as { type: string; text?: string }[];
  const body = JSON.parse(content[0]?.text ?? "null");
  if (result.isError || body?.ok !== true) {
    console.error("smoke: health failed:", JSON.stringify(result));
    process.exitCode = 1;
  } else {
    console.error("smoke: health ok");
  }
} finally {
  await client.close();
}
