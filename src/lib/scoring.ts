// Pure functions: no network or React. Scores are similarity, not probabilities.
export const genres = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science fiction" },
  { id: 10770, name: "TV movie" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
];
export type Person = { id: number; name: string };
export interface Movie {
  id: number;
  title: string;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  overview: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  cast?: Person[];
  director?: Person | null;
  companies?: Person[];
  popularity?: number;
}
export const factors = ["genre", "era", "rating", "cast", "studio"] as const;
export type Factor = (typeof factors)[number];
export type Weights = Record<Factor, number>;
export const labels: Record<Factor, string> = {
  genre: "Genre",
  era: "Era",
  rating: "Rating",
  cast: "Cast & director",
  studio: "Studio",
};
export const presets: Record<string, Weights> = {
  Balanced: { genre: 20, era: 20, rating: 20, cast: 20, studio: 20 },
  "Same vibe": { genre: 50, era: 15, rating: 15, cast: 10, studio: 10 },
  "Same era": { genre: 25, era: 45, rating: 15, cast: 10, studio: 5 },
  "Same people": { genre: 20, era: 10, rating: 10, cast: 45, studio: 15 },
  "Crowd-pleasers": { genre: 30, era: 10, rating: 40, cast: 10, studio: 10 },
};
export const defaultWeights = presets.Balanced;
export type Preferences = {
  genreIds: number[];
  year: number | null;
  rating: number | null;
  castIds?: number[];
  directorId?: number | null;
  companyIds?: number[];
};
export function preferencesFromMovie(movie: Movie): Preferences {
  return {
    genreIds: movie.genre_ids,
    year: Number(movie.release_date.slice(0, 4)) || null,
    rating: movie.vote_count > 0 ? movie.vote_average : null,
    castIds: (movie.cast ?? []).map((person) => person.id),
    directorId: movie.director?.id ?? null,
    companyIds: (movie.companies ?? []).map((company) => company.id),
  };
}

// Empty fields stay unavailable; a rating of zero is a valid preference.
export function preferencesFromMood(
  genre: string,
  year: string,
  rating: string,
): Preferences {
  return {
    genreIds: genres.some((item) => String(item.id) === genre)
      ? [Number(genre)]
      : [],
    year:
      /^\d{4}$/.test(year) && Number(year) >= 1888 && Number(year) <= 2100
        ? Number(year)
        : null,
    rating:
      rating.trim() !== "" &&
      Number.isFinite(Number(rating)) &&
      Number(rating) >= 0 &&
      Number(rating) <= 10
        ? Number(rating)
        : null,
  };
}
export function availableFactors(p: Preferences): Record<Factor, boolean> {
  return {
    genre: p.genreIds.length > 0,
    era: p.year !== null,
    rating: p.rating !== null,
    cast: Boolean(p.castIds?.length || p.directorId),
    studio: Boolean(p.companyIds?.length),
  };
}
// Largest-remainder rounding keeps integer percentages adding up to exactly 100.
export function normalizeWeights(
  weights: Weights,
  available: Record<Factor, boolean>,
): Weights {
  const active = factors.filter((key) => available[key]);
  const result: Weights = { genre: 0, era: 0, rating: 0, cast: 0, studio: 0 };
  if (!active.length) return result;
  const total = active.reduce((sum, key) => sum + weights[key], 0);
  const raw = active.map((key) => ({
    key,
    value: total ? (weights[key] * 100) / total : 100 / active.length,
  }));
  for (const { key, value } of raw) result[key] = Math.floor(value);
  let remainder = 100 - factors.reduce((sum, key) => sum + result[key], 0);
  raw.sort((a, b) => (b.value % 1) - (a.value % 1));
  for (const { key } of raw) if (remainder-- > 0) result[key]++;
  return result;
}
export function redistribute(
  weights: Weights,
  key: Factor,
  value: number,
  locks: readonly Factor[],
  available: Record<Factor, boolean>,
): Weights {
  if (locks.includes(key) || !available[key]) return weights;
  const others = factors.filter(
    (item) => item !== key && available[item] && !locks.includes(item),
  );
  if (!others.length) return weights;
  const fixed = factors
    .filter((item) => item !== key && !others.includes(item))
    .reduce((sum, item) => sum + weights[item], 0);
  const next = {
    ...weights,
    [key]: Math.max(0, Math.min(100 - fixed, Math.round(value))),
  };
  const budget = 100 - fixed - next[key];
  const otherTotal = others.reduce((sum, item) => sum + weights[item], 0);
  const shares = others.map((item) => ({
    key: item,
    value: otherTotal
      ? (weights[item] / otherTotal) * budget
      : budget / others.length,
  }));
  for (const share of shares) next[share.key] = Math.floor(share.value);
  let remainder = budget - others.reduce((sum, item) => sum + next[item], 0);
  shares.sort((a, b) => (b.value % 1) - (a.value % 1));
  for (const share of shares) if (remainder-- > 0) next[share.key]++;
  return next;
}
const shared = (a: number[], b: number[]) =>
  [...new Set(a)].filter((id) => b.includes(id)).length;
export function scoreMovie(movie: Movie, p: Preferences, weights: Weights) {
  const year = Number(movie.release_date.slice(0, 4));
  const intersection = shared(p.genreIds, movie.genre_ids);
  const union = new Set([...p.genreIds, ...movie.genre_ids]).size;
  const directorMatch = Boolean(
    p.directorId && p.directorId === movie.director?.id,
  );
  const sharedPeople = shared(
    [...(p.castIds ?? []), ...(p.directorId ? [p.directorId] : [])],
    [
      ...(movie.cast ?? []).map((person) => person.id),
      ...(movie.director ? [movie.director.id] : []),
    ],
  );
  const breakdown: Weights = {
    genre: union
      ? Math.min(
          1,
          intersection / union +
            (p.genreIds[0] !== undefined && p.genreIds[0] === movie.genre_ids[0]
              ? 0.1
              : 0),
        )
      : 0,
    era:
      year && p.year ? Math.exp(-Math.pow(year - p.year, 2) / (2 * 8 * 8)) : 0,
    rating:
      p.rating !== null && movie.vote_count > 0
        ? Math.max(0, 1 - Math.abs(movie.vote_average - p.rating) / 3) *
          Math.min(1, movie.vote_count / 500)
        : 0,
    cast: Math.max(Math.min(1, sharedPeople / 3), directorMatch ? 0.6 : 0),
    studio: Math.min(
      1,
      shared(
        p.companyIds ?? [],
        (movie.companies ?? []).map((company) => company.id),
      ) / 2,
    ),
  };
  const effective = normalizeWeights(weights, availableFactors(p));
  const match = factors.reduce(
    (sum, key) => sum + (effective[key] * breakdown[key]) / 100,
    0,
  );
  const phrases: Record<Factor, string> = {
    genre:
      "shares " +
      genres
        .filter(
          (genre) =>
            p.genreIds.includes(genre.id) && movie.genre_ids.includes(genre.id),
        )
        .map((genre) => genre.name)
        .join(" and "),
    era:
      "was released " +
      (year === p.year
        ? "in the same year"
        : Math.abs(year - (p.year ?? year)) +
          (Math.abs(year - (p.year ?? year)) === 1
            ? " year apart"
            : " years apart")),
    rating: "has a similar audience rating",
    cast: directorMatch
      ? "has the same director, " + movie.director?.name
      : "also stars " +
        (movie.cast ?? [])
          .filter((person) => p.castIds?.includes(person.id))
          .map((person) => person.name)
          .slice(0, 2)
          .join(" and "),
    studio:
      "shares " +
      (movie.companies ?? [])
        .filter((company) => p.companyIds?.includes(company.id))
        .map((company) => company.name)
        .slice(0, 2)
        .join(" and "),
  };
  const top = factors
    .filter((key) => effective[key] > 0 && breakdown[key] >= 0.25)
    .sort((a, b) => effective[b] * breakdown[b] - effective[a] * breakdown[a])
    .slice(0, 2);
  const explanation = top.map((key) => phrases[key]).join(", and ");
  return {
    movie,
    match,
    breakdown,
    effective,
    reason: explanation
      ? explanation[0].toUpperCase() + explanation.slice(1) + "."
      : "A looser match from the available movie pool.",
  };
}
export function rankMovies(
  movies: Movie[],
  preferences: Preferences,
  weights: Weights,
) {
  return movies
    .map((movie) => scoreMovie(movie, preferences, weights))
    .sort(
      (a, b) => b.match - a.match || a.movie.title.localeCompare(b.movie.title),
    );
}
export function recommendationKey(
  seed: string,
  weights: Weights = defaultWeights,
) {
  return (
    "v2:" +
    seed +
    ":" +
    factors.map((key) => key + "=" + (weights[key] / 100).toFixed(2)).join(",")
  );
}
