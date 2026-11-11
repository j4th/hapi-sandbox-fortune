# search_fortunes

## Goal

Add `search_fortunes` to the fortune-cookie MCP server: every fortune from the bakery whose text holds a keyword.

## Constraints

- One new tool module, `src/tools/search-fortunes.ts`, and its unit test, `tests/search-fortunes.test.ts`: `src/server.ts` loads every module in `src/tools/`, so nothing else changes. No new dependency.
- The tool is read-only and says so: `annotations: { readOnlyHint: true }`.
- `search_fortunes({ keyword })`, its `keyword` a non-empty string, returns one text content item holding JSON: `{ "fortunes": [{ "id", "text" }, ...] }`, each fortune exactly as the bakery's `GET /fortunes` serves it.
- The unit test in `tests/` doesn't need the bakery running.
- The acceptance test in `.factory/work/0002-search-fortunes/acceptance/` calls the tool through the SDK's in-memory client against `createServer()`, with the bakery running.

## Acceptance criteria

1. `check` and `smoke` pass.
2. `search_fortunes({ keyword })` returns every fortune whose text contains the keyword, case-insensitive, up to 10.
