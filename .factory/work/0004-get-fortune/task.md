# get_fortune

## Goal

Add `get_fortune` to the fortune-cookie MCP server: the one fortune the bakery holds under an id.

## Constraints

- One new tool module, `src/tools/get-fortune.ts`, and its unit test, `tests/get-fortune.test.ts`: `src/server.ts` loads every module in `src/tools/`, so nothing else changes. No new dependency.
- The tool is read-only and says so: `annotations: { readOnlyHint: true }`.
- `get_fortune({ id })`, its `id` a whole number of 1 or more, returns one text content item holding JSON: `{ "id", "text" }`, that fortune exactly as the bakery's `GET /fortunes` serves it.
- An id the bakery holds no fortune under is an error result (`isError: true`) whose one text content item holds JSON `{ "error": "<a message naming the id>" }`: never a thrown exception, and never another fortune.
- The unit test in `tests/` doesn't need the bakery running.
- The acceptance test in `.factory/work/0004-get-fortune/acceptance/` calls the tool through the SDK's in-memory client against `createServer()`, with the bakery running.

## Acceptance criteria

1. `check` and `smoke` pass.
2. `get_fortune({ id })` returns the bakery's fortune with that id.
3. An id the bakery doesn't hold gives an error result that names the id.
