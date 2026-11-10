// The bakery: the stub HTTP service the smoke test and the acceptance tests read.
// hapi-factory's bun-http sidecar runs it as `bun /data/server.ts`, with this directory at /data.
// It listens on Bun's default host, so a run reaches it by its name, hapi-sidecar.
const fortunes = Bun.file(new URL("./fortunes.json", import.meta.url));

Bun.serve({
  port: 8080,
  fetch(request) {
    const { pathname } = new URL(request.url);
    if (request.method === "GET" && pathname === "/health") return Response.json({ ok: true });
    if (request.method === "GET" && pathname === "/fortunes") {
      return new Response(fortunes, { headers: { "content-type": "application/json" } });
    }
    return new Response("not found\n", { status: 404 });
  },
});
