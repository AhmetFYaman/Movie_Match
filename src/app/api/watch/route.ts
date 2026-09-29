import { apiError, ApiError, tmdb } from "../../../lib/recommend.ts";

type Provider = { provider_id: number; provider_name: string };
type Availability = {
  link?: string;
  flatrate?: Provider[];
  free?: Provider[];
  ads?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
};
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id") ?? "";
  const region = params.get("region") ?? "US";
  try {
    if (!/^[1-9]\d{0,9}$/.test(id) || !/^[A-Z]{2}$/.test(region))
      throw new ApiError(
        "Choose a valid movie and two-letter country code.",
        400,
      );
    const data = await tmdb<{ results: Record<string, Availability> }>(
      `movie/${id}/watch/providers`,
      {},
      3600,
    );
    const entry = data.results[region];
    const groups = (
      [
        ["flatrate", "Subscription"],
        ["free", "Free"],
        ["ads", "With ads"],
        ["rent", "Rent"],
        ["buy", "Buy"],
      ] as const
    )
      .map(([key, label]) => ({
        label,
        names: [
          ...new Set(
            (entry?.[key] ?? []).map((provider) => provider.provider_name),
          ),
        ],
      }))
      .filter((group) => group.names.length);
    // Link to TMDB's actual watch page, never guess a provider's deep link.
    const link = entry?.link?.startsWith("https://www.themoviedb.org/")
      ? entry.link
      : null;
    return Response.json(
      { region, groups, link },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
