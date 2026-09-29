import { genres, recommendationKey } from "../../../lib/scoring.ts";
import {
  apiError,
  ApiError,
  recommend,
  searchMovies,
  trendingMovies,
} from "../../../lib/recommend.ts";

export const maxDuration = 120;

// Reading request.url keeps this handler dynamic; upstream full-URL fetches have their own cache.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("query") ?? "").trim();
  const seed = params.get("seed") ?? params.get("id");
  const year = params.get("year");
  const genre = params.get("genre");
  try {
    if (
      query.length > 100 ||
      (seed !== null && !/^[1-9]\d{0,9}$/.test(seed)) ||
      (year !== null &&
        (!/^\d{4}$/.test(year) ||
          Number(year) < 1888 ||
          Number(year) > 2100)) ||
      (genre !== null && !genres.some((item) => String(item.id) === genre))
    ) {
      throw new ApiError(
        "Please use a valid movie, genre, and year (1888–2100).",
        400,
      );
    }
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (query)
      return Response.json({ movies: await searchMovies(query) }, { headers });
    if (params.get("browse") === "true")
      return Response.json({ movies: await trendingMovies() }, { headers });
    // Debug identity, not a shared result cache. Weight changes re-score on the client.
    if (process.env.NODE_ENV !== "production")
      headers["x-cache-key"] = recommendationKey(
        seed ?? "mood-" + (genre ?? "any") + "-" + (year ?? "any"),
      );
    return Response.json(await recommend(seed, genre, year), { headers });
  } catch (error) {
    return apiError(error);
  }
}
