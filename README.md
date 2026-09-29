# MovieMatch

A title-first movie recommender built with Next.js, TypeScript, React, plain CSS, and TMDB. No machine learning, account system, or database is required to run it.

## Run locally

Use Node.js 24.x (also pinned for Vercel).

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` if the local file does not already exist.
3. Set `TMDB_READ_ACCESS_TOKEN` to your TMDB Read Access Token. Keep it private.
4. Run `npm run dev` and open http://127.0.0.1:3000/.

Your existing local token stays in the ignored `.env.local` file. All authenticated requests run on the server.

## Publishing without exposing credentials

- Commit only `.env.example` with its placeholder, never real `.env*` files. The ignore rules also exclude private-key files, local hosting metadata, the dashboard backup, and audit reports.
- In your hosting provider's **server environment variables / secrets** settings, add `TMDB_READ_ACCESS_TOKEN`. Set it for the environments that need it, then redeploy.
- Never name a secret `NEXT_PUBLIC_*`, put it in `next.config.ts`'s `env` field, return it in an API response, or put it under `public/`.
- Deploy as a Next.js server application. Do not upload the entire project as a public static directory. Use a production build, not the development server.
- `src/lib/recommend.ts` is marked `server-only`: Next.js fails the build if a client component imports it. Production browser source maps are explicitly disabled.
- `.gitignore` does not remove files already committed or erase history. This application is now in the `Movie_Match` Git repository. Check staged changes before pushing; only the placeholder `.env.example` should be tracked.
- Rotate any credential previously posted publicly or committed. The token previously pasted into chat should also be rotated before publishing; place the replacement only in local/hosting secrets.

Frontend HTML, CSS, JavaScript, and your app's API URLs remain visible to visitors. A public GitHub repository also exposes committed source. Keep the repository private if you do not want to share source code. Environment variables protect credentials, not source-code secrecy or API quota: a public launch may also need hosting-level rate limiting.

Tests run with Node's `react-server` condition so the server-only module can be tested outside Next.js without removing its browser-import protection.

## Using the app

- **Discover:** type at least two characters, then select the exact movie and year. Suggestions debounce for 200ms and support arrows, Enter, Escape, and Tab.
- **Browse:** choose a popular movie as your starting point.
- **Mood:** skip the title and enter an optional genre, year, and target rating. Open Advanced preferences before searching to set their importance; those choices stay selected after the search.
- **Match weights:** optional, collapsed Advanced controls with five presets and percentage sliders. Lock values you want to preserve. Available weights total 100%.
- **Movie details:** click a result to see five similarity bars, the effective weights, and a plain-language explanation.
- **Surprise me:** weighted randomness across the fetched pool, favoring genre/studio connections while reducing top-three dominance and avoiding recent repeats.
- **Where to watch:** country-specific options in movie details, provided by JustWatch through TMDB; US is the selectable default.
- **Find movies like this:** starts another recommendation search from a result.

The dark streaming-style UI uses a rotating TMDB backdrop, a 600ms crossfade, poster hover states, and Lenis scrolling. Rotation can be paused. Reduced-motion preferences disable rotation, smooth scrolling, crossfades, and hover scaling.

## How recommendations work

1. Resolve the selected TMDB id, not an ambiguous title.
2. Fetch the movie's genres, year, audience rating, top ten cast, first credited director, and studios. Keywords are fetched with the seed but not scored.
3. Gather candidates from two pages of recommendations, similar movies, genre/year discovery (±10 years), top-three cast discovery, and top-two studios.
4. Remove duplicates, the seed, adult titles, and titles with fewer than 50 votes. Take turns across sources, up to 80 candidates.
5. Load candidate details in groups of eight. Individual failures do not discard the entire pool.
6. Score all candidates and show the best 24. Weight changes rerank the whole fetched pool on the client, without another request.

| Factor          | Similarity from 0 to 1                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| Genre           | Shared genre count divided by the union of genres, plus 0.1 if the primary genre matches; capped at 1. |
| Era             | Gaussian year proximity: `exp(-(yearDifference²)/(2×8²))`.                                             |
| Rating          | `max(0,1-abs(ratingDifference)/3) × min(1,voteCount/500)`.                                             |
| Cast & director | Shared people divided by 3, capped at 1; same director guarantees at least 0.6.                        |
| Studio          | Shared production companies divided by 2, capped at 1.                                                 |

`match = sum(weight × similarity) / 100`

Balanced uses 20% per factor. Missing seed metadata disables that factor and redistributes its weight. Integer rounding keeps the total at 100 when at least one factor is available. If absolutely no factors are available, the result is zero, not a fabricated match.

A match is metadata similarity, not a probability of enjoyment. Ratings are from TMDB, not IMDb or Rotten Tomatoes. The Crowd-pleasers preset emphasizes rating _similarity_, as specified, not strictly the highest-rated films.

## Caching and request safety

- Search cache: at most 50 in-memory client entries, keyed by lowercase, trimmed, whitespace-collapsed query.
- Search and recommendation requests use cancellation plus a latest-request counter. Older responses cannot overwrite a newer choice or mode.
- Server routes read the request URL and are dynamic; response headers use `Cache-Control: no-store`.
- Upstream TMDB fetch caching uses the complete URL: 24 hours for movie details/credits, one hour for searches and candidate sources.
- There is no global recommendation cache, Redis, or persisted last selection. Weights are calculated locally.
- The development-only `x-cache-key` identifies the default ranking using seed/mood inputs, algorithm `v2`, and fixed-order normalized weights. It is a diagnostic identity, not evidence of a result-cache hit.

## Checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

23 tests cover scoring, Mood inputs, locked weights, missing data, API errors, stale requests, candidate filtering, concurrency, recommendation isolation, Surprise selection, and watch providers. See [ITERATION_NOTES.md](ITERATION_NOTES.md) for the latest file-by-file changes and [BROWSER_LIBRARY_PLAN.md](BROWSER_LIBRARY_PLAN.md) for the proposed watched library.

## Deploy to Vercel

Follow [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md). No custom deployment adapter or `vercel.json` is needed.

## Project guide

[FILE_GUIDE.md](FILE_GUIDE.md) explains every application file and includes an interview walkthrough. [PROJECT_PLAN.md](PROJECT_PLAN.md) keeps the next SQL milestone separate: this project does **not yet demonstrate database management**.

## Data and libraries

- [TMDB movie details](https://developer.themoviedb.org/reference/movie-details)
- [TMDB movie discovery](https://developer.themoviedb.org/reference/discover-movie)
- [TMDB authentication](https://developer.themoviedb.org/docs/authentication-application)
- [Lenis documentation](https://github.com/darkroomengineering/lenis)

This product uses the TMDB API but is not endorsed or certified by TMDB.

The original dashboard remains in `previous-dashboard-backup.zip`; it predates the supplied token. This iteration does not modify that archive.
