import assert from "node:assert/strict";
import test from "node:test";
import { pickSurprise } from "../src/lib/surprise.ts";
import { scoreMovie, defaultWeights, type Movie } from "../src/lib/scoring.ts";
const preferences = { genreIds: [28], year: 2010, rating: 7, companyIds: [10] };
const results = Array.from({ length: 12 }, (_, i) =>
  scoreMovie(
    {
      id: i + 1,
      title: `Movie ${i}`,
      release_date: "2010-01-01",
      genre_ids: [i === 11 ? 878 : 28],
      vote_average: 7,
      vote_count: 500,
      overview: "",
      companies: [{ id: 10, name: "Studio" }],
    } as Movie,
    preferences,
    defaultWeights,
  ),
);
test("surprise can reach beyond top six and explain a studio connection", () => {
  const pick = pickSurprise(results, preferences, [], () => 0.9999);
  assert.equal(pick?.result.movie.id, 12);
  assert.match(pick!.reason, /studio/);
});
test("surprise excludes recent choices and avoids immediate repeats on exhaustion", () => {
  assert.notEqual(
    pickSurprise(results, preferences, [1], () => 0)?.result.movie.id,
    1,
  );
  assert.equal(
    pickSurprise(results.slice(0, 2), preferences, [1, 2], () => 0.99)?.result
      .movie.id,
    1,
  );
});
test("surprise supports empty and singleton pools without mutating input", () => {
  assert.equal(pickSurprise([], preferences), null);
  assert.equal(
    pickSurprise(results.slice(0, 1), preferences, [1])?.result.movie.id,
    1,
  );
  assert.equal(results[0].movie.id, 1);
});
