// The bakery client: the stub HTTP service the server reads its data from.
export type Fortune = { id: number; text: string };

export type Bakery = {
  health(): Promise<boolean>;
  fortunes(): Promise<Fortune[]>;
};

export const DEFAULT_BAKERY_URL = "http://hapi-sidecar:8080";

export function createBakery(
  baseUrl: string = process.env.BAKERY_URL ?? DEFAULT_BAKERY_URL,
  fetchFn: typeof fetch = fetch,
): Bakery {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = (path: string) => new URL(path, base).toString();
  return {
    async health() {
      try {
        const res = await fetchFn(url("health"));
        if (!res.ok) return false;
        const body = (await res.json()) as { ok?: unknown };
        return body.ok === true;
      } catch {
        return false;
      }
    },
    async fortunes() {
      const res = await fetchFn(url("fortunes"));
      if (!res.ok) throw new Error(`bakery GET /fortunes answered ${res.status}`);
      const body = (await res.json()) as unknown;
      if (!Array.isArray(body)) throw new Error("bakery GET /fortunes did not return an array");
      return body as Fortune[];
    },
  };
}
