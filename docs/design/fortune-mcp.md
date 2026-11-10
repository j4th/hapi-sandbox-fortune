# The fortune-cookie MCP server

A small read-only MCP server over stdio, on Bun: hapi-factory's sandbox for its run engine. Its data comes from the bakery, a stub HTTP service with a fixed list of made-up fortunes.

## The bakery

`smoke/bakery/server.ts` serves `smoke/bakery/fortunes.json` on port 8080. hapi-factory's `bun-http` sidecar runs it as `bun /data/server.ts` on a run's own network, where its name is `hapi-sidecar`.

- `GET /health`: `{"ok":true}`.
- `GET /fortunes`: every fortune, a JSON array of `{ "id": <number>, "text": <string> }`.
- Anything else: 404.

The server reads the bakery at `BAKERY_URL`, `http://hapi-sidecar:8080` by default. On your own machine, run `bun smoke/bakery/server.ts` and set `BAKERY_URL=http://localhost:8080`.

## The tools

Every tool is read-only (`readOnlyHint: true`) and returns one text content item holding JSON.

- `health`: `{"ok":true}` when the bakery answers.
- `crack_cookie({ seed })`: one fortune and three lucky numbers from 1 to 49, `{ "id", "text", "lucky_numbers" }`. The seed is optional; the same seed gives the same answer.
- `search_fortunes({ keyword })`, a later work order's: `{ "fortunes": [...] }`, every fortune whose text holds the keyword, in any case, at most 10.
- `fortune_of_the_day({ date })`, a later work order's: one fortune for a `YYYY-MM-DD` date, `{ "id", "text" }`, the same on every call.

`src/server.ts` exports `createServer()`, which loads every module in `src/tools/`, so a new tool adds only its own files. `bun src/server.ts` serves it over stdio, where stdout carries MCP messages only.
