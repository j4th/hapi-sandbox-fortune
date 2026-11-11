# fortune_of_the_day

## Goal

Add `fortune_of_the_day` to the fortune-cookie MCP server: one fortune from the bakery for a date, the same every time it is asked.

## Constraints

- One new tool module, `src/tools/fortune-of-the-day.ts`, and its unit test, `tests/fortune-of-the-day.test.ts`: `src/server.ts` loads every module in `src/tools/`, so nothing else changes. No new dependency.
- The tool is read-only and says so: `annotations: { readOnlyHint: true }`.
- `fortune_of_the_day({ date })`, its `date` a `YYYY-MM-DD` string, returns one text content item holding JSON: `{ "id", "text" }`, one fortune exactly as the bakery's `GET /fortunes` serves it. It depends on the date alone, never on the clock.
- The unit test in `tests/` doesn't need the bakery running.
- The acceptance test in `.factory/work/0003-fortune-of-the-day/acceptance/` calls the tool through the SDK's in-memory client against `createServer()`, with the bakery running.

## Acceptance criteria

1. `check` and `smoke` pass.
2. `fortune_of_the_day({ date })` returns one fortune per `YYYY-MM-DD`, the same on every call.
