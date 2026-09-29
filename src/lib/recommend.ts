import "server-only";
// Next.js rejects accidental imports of this credential-handling module into client code.
import {
  defaultWeights,
  preferencesFromMovie,
  rankMovies,
  type Movie,
  type Person,
} from "./scoring.ts";
type RawMovie = Movie & {
  adult?: boolean;
  genres?: Person[];
  production_companies?: Person[];
  credits?: { cast?: Person[]; crew?: (Person & { job: string })[] };
};
type Page = { results: RawMovie[] };
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}
export function apiError(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof ApiError
          ? error.message
          : "Could not reach TMDB. Please try again.",
    },
    {
      status: error instanceof ApiError ? error.status : 502,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export async function tmdb<T>(
  path: string,
  filters: Record<string, string> = {},
  seconds = 3600,
): Promise<T> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token)
    throw new ApiError(
      "Add TMDB_READ_ACCESS_TOKEN to .env.local and restart the server.",
      503,
    );
  const url = new URL("https://api.themoviedb.org/3/" + path);
  url.search = new URLSearchParams({
    language: "en-US",
    include_adult: "false",
    ...filters,
  }).toString();
  const response = await fetch(url, {
    headers: { Authorization: "Bearer " + token, accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: seconds },
  });
  if (!response.ok)
    throw new ApiError(
      response.status === 401 || response.status === 403
        ? "TMDB rejected the token. Check your server configuration."
        : response.status === 429
          ? "TMDB is busy. Try again in a moment."
          : "TMDB could not load movies. Please try again.",
    );
  return response.json();
}
export function simplify(movie: RawMovie): Movie {
  const director = movie.credits?.crew?.find(
    (person) => person.job === "Director",
  );
  return {
    id: movie.id,
    title: movie.title,
    release_date: movie.release_date ?? "",
    genre_ids: movie.genres?.map((genre) => genre.id) ?? movie.genre_ids ?? [],
    vote_average: movie.vote_average ?? 0,
    vote_count: movie.vote_count ?? 0,
    overview: movie.overview ?? "",
    poster_path: movie.poster_path ?? null,
    backdrop_path: movie.backdrop_path ?? null,
    popularity: movie.popularity ?? 0,
    cast: (movie.credits?.cast ?? [])
      .slice(0, 10)
      .map(({ id, name }) => ({ id, name })),
    director: director ? { id: director.id, name: director.name } : null,
    companies: (movie.production_companies ?? []).map(({ id, name }) => ({
      id,
      name,
    })),
  };
}
export async function searchMovies(query: string) {
  const data = await tmdb<Page>("search/movie", { query, page: "1" });
  return data.results
    .filter((movie) => !movie.adult)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 8)
    .map(simplify);
}
export async function trendingMovies() {
  const data = await tmdb<Page>("trending/movie/week");
  return data.results
    .filter((movie) => !movie.adult)
    .slice(0, 18)
    .map(simplify);
}
export async function recommend(
  seedId: string | null,
  genre: string | null = null,
  year: string | null = null,
) {
  const rawSeed = seedId
    ? await tmdb<RawMovie>(
        "movie/" + seedId,
        { append_to_response: "credits,keywords" },
        86400,
      )
    : null;
  if (rawSeed?.adult) throw new ApiError("Please choose another movie.", 400);
  const seed = rawSeed ? simplify(rawSeed) : null;
  const base = {
    sort_by: "popularity.desc",
    "vote_count.gte": "50",
    include_video: "false",
  };
  const filters: Record<string, string> = { ...base };
  const genreIds = seed?.genre_ids ?? (genre ? [Number(genre)] : []);
  if (genreIds.length) filters.with_genres = genreIds.join("|");
  const targetYear = seed?.release_date.slice(0, 4) || year;
  if (targetYear) {
    filters["primary_release_date.gte"] = Number(targetYear) - 10 + "-01-01";
    filters["primary_release_date.lte"] = Number(targetYear) + 10 + "-12-31";
  }
  const requests: Promise<Page>[] = [];
  if (seed) {
    requests.push(
      tmdb("movie/" + seed.id + "/recommendations", { page: "1" }),
      tmdb("movie/" + seed.id + "/recommendations", { page: "2" }),
      tmdb("movie/" + seed.id + "/similar"),
    );
  }
  requests.push(tmdb("discover/movie", filters));
  if (seed?.cast?.length)
    requests.push(
      tmdb("discover/movie", {
        ...base,
        with_cast: seed.cast
          .slice(0, 3)
          .map((person) => person.id)
          .join("|"),
      }),
    );
  if (seed?.companies?.length)
    requests.push(
      tmdb("discover/movie", {
        ...base,
        with_companies: seed.companies
          .slice(0, 2)
          .map((company) => company.id)
          .join("|"),
      }),
    );
  const settled = await Promise.allSettled(requests);
  const batches = settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value.results] : [],
  );
  if (!batches.length) {
    const failure = settled.find((result) => result.status === "rejected");
    throw (
      failure?.reason ??
      new ApiError("TMDB could not load matches. Please try again.")
    );
  }
  // Take turns across sources, so genre, cast and studio candidates all get space.
  const pool = new Map<number, RawMovie>();
  for (let index = 0; index < 20 && pool.size < 80; index++) {
    for (const batch of batches) {
      const movie = batch[index];
      if (
        movie &&
        !movie.adult &&
        movie.id !== seed?.id &&
        movie.vote_count >= 50 &&
        pool.size < 80
      )
        pool.set(movie.id, movie);
    }
  }
  const entries = [...pool.values()];
  const movies: Movie[] = [];
  let failedDetails = 0;
  for (let index = 0; index < entries.length; index += 8) {
    const details = await Promise.allSettled(
      entries
        .slice(index, index + 8)
        .map((movie) =>
          tmdb<RawMovie>(
            "movie/" + movie.id,
            { append_to_response: "credits" },
            86400,
          ),
        ),
    );
    for (const detail of details) {
      if (
        detail.status === "fulfilled" &&
        !detail.value.adult &&
        detail.value.vote_count >= 50
      )
        movies.push(simplify(detail.value));
      else if (detail.status === "rejected") failedDetails++;
    }
  }
  if (entries.length && !movies.length)
    throw new ApiError("Movie details could not be loaded. Please try again.");
  const preferences = seed
    ? preferencesFromMovie(seed)
    : { genreIds, year: targetYear ? Number(targetYear) : null, rating: 7 };
  const results = rankMovies(movies, preferences, defaultWeights)
    .slice(0, 24)
    .map(({ movie, match, breakdown, reason }) => ({
      id: movie.id,
      title: movie.title,
      year: Number(movie.release_date.slice(0, 4)) || null,
      poster: movie.poster_path,
      rating: movie.vote_average,
      match,
      breakdown,
      reason,
    }));
  return {
    seed,
    movies,
    results,
    warning:
      failedDetails || batches.length !== requests.length
        ? "Some TMDB data was unavailable. These matches use the movies that loaded successfully."
        : null,
  };
}
