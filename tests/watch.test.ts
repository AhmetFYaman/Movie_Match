import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/watch/route.ts";

test("watch endpoint validates inputs without calling TMDB", async () => {
  for (const query of ["id=bad", "id=1&region=../../", "id=0"])
    assert.equal(
      (await GET(new Request("http://localhost/api/watch?" + query))).status,
      400,
    );
});
test("watch endpoint groups country-specific availability and handles missing countries", async () => {
  const original = globalThis.fetch;
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  process.env.TMDB_READ_ACCESS_TOKEN = "test-only";
  try {
    globalThis.fetch = async (input) => {
      assert.equal(
        new URL(String(input)).pathname,
        "/3/movie/1/watch/providers",
      );
      return Response.json({
        results: {
          US: {
            link: "https://www.themoviedb.org/movie/1/watch",
            flatrate: [{ provider_id: 1, provider_name: "Example Stream" }],
            rent: [{ provider_id: 2, provider_name: "Example Rental" }],
          },
        },
      });
    };
    const data = await (
      await GET(new Request("http://localhost/api/watch?id=1&region=US"))
    ).json();
    assert.deepEqual(
      data.groups.map((group: { label: string }) => group.label),
      ["Subscription", "Rent"],
    );
    assert.match(data.link, /^https:\/\/www.themoviedb.org\//);
    assert.deepEqual(
      (
        await (
          await GET(new Request("http://localhost/api/watch?id=1&region=GB"))
        ).json()
      ).groups,
      [],
    );
    globalThis.fetch = async () =>
      new Response("private upstream error", { status: 500 });
    const failure = await GET(new Request("http://localhost/api/watch?id=1"));
    assert.equal(failure.status, 502);
    assert.doesNotMatch(await failure.text(), /private upstream|test-only/);
  } finally {
    globalThis.fetch = original;
    if (token === undefined) delete process.env.TMDB_READ_ACCESS_TOKEN;
    else process.env.TMDB_READ_ACCESS_TOKEN = token;
  }
});
