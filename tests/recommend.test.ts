import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/recommend/route.ts";

test("Endgame → Paddington → Endgame stays seed-specific with mocked TMDB", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.TMDB_READ_ACCESS_TOKEN;
  process.env.TMDB_READ_ACCESS_TOKEN = "test-only-token";
  let group = 299534;
  const detail = (id: number) => ({
    id,
    title:
      id === 299534
        ? "Avengers: Endgame"
        : id === 116149
          ? "Paddington"
          : "Candidate " + id,
    release_date: "2014-01-01",
    genres: [{ id: group === 299534 ? 28 : 35, name: "Genre" }],
    vote_average: 7,
    vote_count: 1000,
    credits: {
      cast: [{ id: 1, name: "Actor" }],
      crew: [{ id: 2, name: "Director", job: "Director" }],
    },
    production_companies: [{ id: 3, name: "Studio" }],
  });
  const calls: string[] = [];
  let active = 0;
  let maxActive = 0;
  try {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      calls.push(url.href);
      if (/\/movie\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split("/").pop());
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        active--;
        if (id === group + 10) throw new Error("One failed detail request");
        return Response.json(detail(id));
      }
      return Response.json({
        results: [
          ...Array.from({ length: 20 }, (_, index) => ({
            ...detail(group + index + 10),
            genre_ids: [28],
          })),
          { ...detail(group), genre_ids: [28] },
          { ...detail(99), adult: true },
          { ...detail(98), vote_count: 10 },
        ],
      });
    };
    async function request(id: number) {
      group = id;
      const response = await GET(
        new Request("http://localhost/api/recommend?id=" + id),
      );
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const data = await response.json();
      assert.equal(data.seed.id, id);
      assert.ok(
        data.movies.every(
          (movie: { id: number }) =>
            movie.id > id && movie.id !== 98 && movie.id !== 99,
        ),
      );
      assert.ok(data.results.length <= 24);
      assert.match(data.warning, /unavailable/);
      assert.equal(data.seed.director.name, "Director");
      return data;
    }
    const first = await request(299534);
    const second = await request(116149);
    const third = await request(299534);
    assert.notDeepEqual(first.movies, second.movies);
    assert.deepEqual(first.movies, third.movies);
    assert.ok(maxActive <= 8);
    assert.ok(
      calls.some(
        (url) => url.includes("recommendations") && url.includes("page=2"),
      ),
    );
    assert.ok(calls.some((url) => url.includes("/similar")));
    assert.ok(calls.some((url) => url.includes("with_cast=1")));
    assert.ok(calls.some((url) => url.includes("with_companies=3")));
    assert.ok(
      calls.some((url) => url.includes("primary_release_date.gte=2004")),
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.TMDB_READ_ACCESS_TOKEN;
    else process.env.TMDB_READ_ACCESS_TOKEN = originalToken;
  }
});
