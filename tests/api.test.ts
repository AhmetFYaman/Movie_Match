import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/movies/route.ts";
import { GET as search } from "../src/app/api/search/route.ts";
import { LatestRequest } from "../src/lib/latest-request.ts";

test("validation and missing-token errors are safe", async () => {
  const original = process.env.TMDB_READ_ACCESS_TOKEN;
  try {
    delete process.env.TMDB_READ_ACCESS_TOKEN;
    for (const query of ["year=nope", "genre=999", "id=bad", "year=1800"]) {
      assert.equal(
        (await GET(new Request("http://localhost/api/movies?" + query))).status,
        400,
      );
    }
    assert.equal(
      (await GET(new Request("http://localhost/api/movies"))).status,
      503,
    );
    assert.deepEqual(
      await (
        await search(new Request("http://localhost/api/search?q=a"))
      ).json(),
      { results: [] },
    );
  } finally {
    if (original === undefined) delete process.env.TMDB_READ_ACCESS_TOKEN;
    else process.env.TMDB_READ_ACCESS_TOKEN = original;
  }
});
test("latest request cancels and rejects stale work even if transport completes late", () => {
  const manager = new LatestRequest();
  const old = manager.start();
  const current = manager.start();
  assert.equal(old.signal.aborted, true);
  assert.equal(old.isCurrent(), false);
  assert.equal(current.isCurrent(), true);
  manager.cancel();
  assert.equal(current.isCurrent(), false);
});
test("search URL includes normalized query; upstream errors do not expose secrets", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.TMDB_READ_ACCESS_TOKEN;
  process.env.TMDB_READ_ACCESS_TOKEN = "test-only-token";
  try {
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get("query"), "Paddington 2");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer test-only-token",
      );
      return Response.json({
        results: [
          { id: 1, title: "Low", popularity: 1 },
          { id: 2, title: "High", popularity: 20 },
          { id: 3, title: "Adult", adult: true, popularity: 50 },
        ],
      });
    };
    const response = await search(
      new Request("http://localhost/api/search?q=%20Paddington%20%202%20"),
    );
    const data = await response.json();
    assert.deepEqual(
      data.results.map((m: { id: number }) => m.id),
      [2, 1],
    );
    assert.equal(JSON.stringify(data).includes("test-only-token"), false);
    globalThis.fetch = async () =>
      new Response("private upstream data", { status: 401 });
    assert.match(
      (
        await (
          await search(new Request("http://localhost/api/search?q=Test"))
        ).json()
      ).error,
      /rejected the token/,
    );
    globalThis.fetch = async () => {
      throw new Error("private network details");
    };
    assert.equal(
      (
        await (
          await search(new Request("http://localhost/api/search?q=Test"))
        ).json()
      ).error.includes("private"),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.TMDB_READ_ACCESS_TOKEN;
    else process.env.TMDB_READ_ACCESS_TOKEN = originalToken;
  }
});
