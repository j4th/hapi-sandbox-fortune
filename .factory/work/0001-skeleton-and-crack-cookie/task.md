# The skeleton and crack_cookie

## Goal

A read-only MCP server over stdio, on Bun, with its data from the bakery at `BAKERY_URL` (default `http://hapi-sidecar:8080`): a `health` tool, then `crack_cookie`, which gives a fortune and three lucky numbers and takes a seed, so a test can repeat it.

## Constraints

- Add `@modelcontextprotocol/sdk` and `zod`, the SDK's peer dependency for a tool's input schema, with one `bun add`: `bunfig.toml` pins each to the exact newest version older than its release age. They are the only dependencies this task names.
- `src/server.ts` exports `createServer()`, which returns (or resolves to) the SDK's `McpServer`, not yet connected, and loads every module in `src/tools/` at start, so a later tool adds only its own files. Run as the main module (`bun src/server.ts`), it connects that server to stdio; imported, it connects nothing.
- stdout carries MCP messages only. Anything else goes to stderr.
- Every tool is read-only and says so: `annotations: { readOnlyHint: true }`.
- Each tool returns one text content item holding JSON. `health` gives `{"ok":true}` when the bakery answers `GET /health`. `crack_cookie({ seed })`, its `seed` an optional integer, gives `{ "id", "text", "lucky_numbers" }`: one fortune exactly as the bakery's `GET /fortunes` serves it, and three integers from 1 to 49.
- The unit tests in `tests/` don't need the bakery running.
- `smoke/run.ts` starts the server over stdio and calls `health` against the bakery.
- The acceptance tests in `.factory/work/0001-skeleton-and-crack-cookie/acceptance/` call the tools through the SDK's in-memory client against `createServer()`, with the bakery running.

## Acceptance criteria

1. `check` and `smoke` pass.
2. Every listed tool is read-only, and `health` and `crack_cookie` are among them.
3. `crack_cookie({ seed: 7 })` returns the same fortune and the same three lucky numbers from 1 to 49 on every call.
4. One commit per piece.
