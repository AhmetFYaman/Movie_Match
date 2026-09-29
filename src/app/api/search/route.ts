import { apiError, ApiError, searchMovies } from "../../../lib/recommend.ts";

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  try {
    if (query.length > 100)
      throw new ApiError("Use a movie title under 100 characters.", 400);
    const results = query.length < 2 ? [] : await searchMovies(query);
    return Response.json(
      { results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
