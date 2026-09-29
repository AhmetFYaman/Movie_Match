import assert from "node:assert/strict";
import test from "node:test";
import {
  scoreMovie,
  rankMovies,
  preferencesFromMovie,
  preferencesFromMood,
  defaultWeights,
  availableFactors,
  normalizeWeights,
  redistribute,
  factors,
  presets,
  recommendationKey,
  type Movie,
  type Weights,
} from "../src/lib/scoring.ts";
const movie: Movie = {
  id: 1,
  title: "Test",
  release_date: "2014-01-01",
  genre_ids: [35, 10751],
  vote_average: 8,
  vote_count: 1000,
  overview: "",
  cast: [
    { id: 10, name: "Actor A" },
    { id: 11, name: "Actor B" },
    { id: 12, name: "Actor C" },
  ],
  director: { id: 20, name: "Director" },
  companies: [
    { id: 30, name: "Studio A" },
    { id: 31, name: "Studio B" },
  ],
};
const preferences = preferencesFromMovie(movie);
test("blank or invalid Mood fields do not invent preferences", () => {
  assert.deepEqual(preferencesFromMood("", "", ""), {
    genreIds: [],
    year: null,
    rating: null,
  });
  assert.deepEqual(preferencesFromMood("999", "1800", "nope"), {
    genreIds: [],
    year: null,
    rating: null,
  });
});
test("Mood accepts a real genre, year and a zero rating", () => {
  assert.deepEqual(preferencesFromMood("35", "2014", "0"), {
    genreIds: [35],
    year: 2014,
    rating: 0,
  });
});
test("Mood sliders redistribute only selected factors and total 100", () => {
  const available = availableFactors(preferencesFromMood("35", "2014", "7"));
  const initial = normalizeWeights(defaultWeights, available);
  const adjusted = redistribute(initial, "genre", 70, [], available);
  assert.equal(adjusted.genre, 70);
  assert.equal(adjusted.cast, 0);
  assert.equal(adjusted.studio, 0);
  assert.equal(
    Object.values(adjusted).reduce((sum, value) => sum + value, 0),
    100,
  );
});
const all = availableFactors(preferences);
const total = (weights: Weights) =>
  factors.reduce((sum, key) => sum + weights[key], 0);
test("identical metadata gives a complete match with five explained factors", () => {
  const result = scoreMovie(movie, preferences, defaultWeights);
  assert.equal(result.match, 1);
  assert.deepEqual(result.breakdown, {
    genre: 1,
    era: 1,
    rating: 1,
    cast: 1,
    studio: 1,
  });
});
test("genre uses Jaccard plus the primary-genre bonus", () => {
  const result = scoreMovie(
    { ...movie, genre_ids: [35, 18] },
    preferences,
    defaultWeights,
  );
  assert.ok(Math.abs(result.breakdown.genre - (1 / 3 + 0.1)) < 1e-10);
});
test("era uses an eight-year Gaussian curve, not a hard cutoff", () => {
  const result = scoreMovie(
    { ...movie, release_date: "2022-01-01" },
    preferences,
    defaultWeights,
  );
  assert.ok(Math.abs(result.breakdown.era - Math.exp(-0.5)) < 1e-10);
  assert.equal(
    scoreMovie({ ...movie, release_date: "" }, preferences, defaultWeights)
      .breakdown.era,
    0,
  );
});
test("rating is symmetric and downweights tiny samples", () => {
  const low = scoreMovie(
    { ...movie, vote_average: 7 },
    preferences,
    defaultWeights,
  );
  const high = scoreMovie(
    { ...movie, vote_average: 9 },
    preferences,
    defaultWeights,
  );
  assert.equal(low.breakdown.rating, high.breakdown.rating);
  assert.equal(
    scoreMovie({ ...movie, vote_count: 50 }, preferences, defaultWeights)
      .breakdown.rating,
    0.1,
  );
});
test("director alone contributes 0.6, one studio 0.5", () => {
  const result = scoreMovie(
    { ...movie, cast: [], companies: [movie.companies![0]] },
    preferences,
    defaultWeights,
  );
  assert.equal(result.breakdown.cast, 0.6);
  assert.equal(result.breakdown.studio, 0.5);
  assert.match(
    scoreMovie({ ...movie, cast: [] }, preferences, presets["Same people"])
      .reason,
    /same director/,
  );
});
test("missing seed metadata is unavailable and remaining weights total 100", () => {
  const absent = preferencesFromMovie({
    ...movie,
    cast: [],
    director: null,
    companies: [],
    release_date: "",
    vote_count: 0,
  });
  const available = availableFactors(absent);
  assert.deepEqual(normalizeWeights(defaultWeights, available), {
    genre: 100,
    era: 0,
    rating: 0,
    cast: 0,
    studio: 0,
  });
  assert.equal(scoreMovie(movie, absent, defaultWeights).match, 1);
});
test("all-unavailable data gives zero weights instead of an invented score", () => {
  const result = scoreMovie(
    movie,
    { genreIds: [], year: null, rating: null },
    defaultWeights,
  );
  assert.equal(result.match, 0);
  assert.equal(total(result.effective), 0);
});
test("all presets add up to 100; slider redistribution preserves locks", () => {
  for (const weights of Object.values(presets))
    assert.equal(total(weights), 100);
  const next = redistribute(defaultWeights, "genre", 65, ["cast"], all);
  assert.equal(next.genre, 65);
  assert.equal(next.cast, 20);
  assert.equal(total(next), 100);
  const capped = redistribute(
    defaultWeights,
    "genre",
    100,
    ["cast", "studio"],
    all,
  );
  assert.equal(capped.genre, 60);
  assert.equal(capped.cast, 20);
  assert.equal(capped.studio, 20);
});
test("every slider position keeps weights in bounds with rounding and zeros", () => {
  let current = defaultWeights;
  for (const key of factors)
    for (let value = 0; value <= 100; value++) {
      current = redistribute(current, key, value, [], all);
      assert.equal(total(current), 100);
      assert.ok(
        factors.every(
          (factor) =>
            Number.isInteger(current[factor]) &&
            current[factor] >= 0 &&
            current[factor] <= 100,
        ),
      );
    }
  assert.deepEqual(redistribute(current, "genre", 50, factors, all), current);
});
test("weight changes rerank without mutating candidates", () => {
  const choices = [
    { ...movie, id: 2, release_date: "1990-01-01" },
    { ...movie, id: 3, genre_ids: [18] },
  ];
  assert.equal(
    rankMovies(choices, preferences, {
      genre: 100,
      era: 0,
      rating: 0,
      cast: 0,
      studio: 0,
    })[0].movie.id,
    2,
  );
  assert.equal(
    rankMovies(choices, preferences, {
      genre: 0,
      era: 100,
      rating: 0,
      cast: 0,
      studio: 0,
    })[0].movie.id,
    3,
  );
  assert.equal(choices[0].id, 2);
});
test("debug identities include seed, normalized weights and algorithm version", () => {
  assert.match(recommendationKey("299534"), /^v2:299534:genre=0.20/);
  assert.notEqual(recommendationKey("299534"), recommendationKey("116149"));
  assert.notEqual(
    recommendationKey("299534"),
    recommendationKey("299534", presets["Same vibe"]),
  );
});
