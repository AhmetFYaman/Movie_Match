// Dedicated endpoint; /api/movies remains compatible with the previous UI.
// Allow time for the bounded TMDB candidate batches on Vercel.
export const maxDuration = 120;
export { GET } from "../movies/route.ts";
