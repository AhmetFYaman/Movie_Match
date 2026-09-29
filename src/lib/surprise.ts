import type { Preferences, scoreMovie } from "./scoring.ts";

// Small, explicit editorial groupings, not an AI model or studio-ownership database.
const genreFamilies = [
  [28, 12, 878],
  [16, 10751, 14],
  [80, 53, 9648],
  [35, 10749, 18],
  [27, 53, 9648],
  [36, 10752, 18],
];
type Match = ReturnType<typeof scoreMovie>;
export function pickSurprise(
  results: Match[],
  preferences: Preferences,
  recent: number[] = [],
  random = Math.random,
) {
  if (!results.length) return null;
  const connected = results.map((result, index) => {
    const sameGenre = result.movie.genre_ids.some((id) =>
      preferences.genreIds.includes(id),
    );
    const nearbyGenre = genreFamilies.some(
      (group) =>
        group.some((id) => preferences.genreIds.includes(id)) &&
        group.some((id) => result.movie.genre_ids.includes(id)),
    );
    const sameStudio = (result.movie.companies ?? []).some((company) =>
      preferences.companyIds?.includes(company.id),
    );
    return {
      result,
      connected: sameGenre || nearbyGenre || sameStudio,
      // Everyone remains possible, but leave room for a discovery beyond the top three.
      weight:
        (1 +
          result.match +
          Number(sameGenre) +
          Number(nearbyGenre) * 0.5 +
          Number(sameStudio) * 1.5) *
        (index < 3 ? 0.35 : 1),
      reason: sameStudio
        ? "A familiar studio, a different story."
        : sameGenre
          ? "A shared genre, beyond the obvious picks."
          : nearbyGenre
            ? "A neighboring genre to explore."
            : "A wildcard from your recommendation pool.",
    };
  });
  const related = connected.filter((item) => item.connected);
  const pool = related.length ? related : connected;
  const unseen = pool.filter((item) => !recent.includes(item.result.movie.id));
  // On exhaustion, allow older picks again, but avoid an immediate repeat if possible.
  const alternatives = pool.filter(
    (item) => item.result.movie.id !== recent.at(-1),
  );
  const choices = unseen.length
    ? unseen
    : alternatives.length
      ? alternatives
      : pool;
  let ticket =
    Math.max(0, Math.min(0.999999, random())) *
    choices.reduce((sum, item) => sum + item.weight, 0);
  return (
    choices.find((item) => (ticket -= item.weight) < 0) ??
    choices[choices.length - 1]
  );
}
