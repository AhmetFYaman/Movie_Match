# Repository move and discovery improvements

## Repository

The active folder is `Movie_Match`. Its existing license and initial commit were preserved. The application was imported separately. Dependencies were installed here, and the local preview now runs from this repository at port 3000. The older folder remains a preserved copy with an AGENTS.md pointer here.

The real `.env.local` was copied locally without printing it and remains ignored; only `.env.example` is tracked. No push or deployment was performed. Codex's saved project-folder setting could not be changed through the available tools; commands explicitly use the new folder.

## File-by-file changes

- `src/app/globals.css`: mode/results entry now takes 650ms; dialog entry 500ms. Compact watch/context layouts and a consistent select arrow inset 14px from the right, with reserved text space.
- `src/components/ResultGrid.tsx`: reordering takes 520ms; reduced-motion and resize safeguards remain.
- `src/app/page.tsx`: result scrolling takes 1.05 seconds. Surprise uses the full fetched pool and remembers the last five surprise IDs for this search.
- `src/lib/surprise.ts`: pure weighted-random selection. Exact genres, small explicit neighboring genre groups, and shared studio IDs influence selection. Top-three candidates receive reduced probability. Recent choices are excluded when alternatives exist; exhaustion avoids an immediate repeat when possible.
- `src/components/MovieDetails.tsx`: actual genres, decade/release year, TMDB rating/votes, director/cast, and studios. Long lists expand with native HTML details controls. Shows the reason for a Surprise pick.
- `src/components/WatchProviders.tsx`: on-demand subscription/free/ad-supported/rental/purchase options, nine-country selector (US default), loading/empty/error/retry states, and JustWatch credit.
- `src/app/api/watch/route.ts`: validates ID/country, calls TMDB server-side, and groups provider names. Returns the supplied TMDB watch link, not invented streaming URLs. Upstream data is cached for one hour.
- `tests/surprise.test.ts`: beyond-top-six reach, repeat/exhaustion behavior, empty/singleton pools.
- `tests/watch.test.ts`: validation, country-specific groups, missing data, and safe errors.
- `AGENTS.md`: active repository and credential precautions.
- `BROWSER_LIBRARY_PLAN.md`: proposal for browser-stored watched movies; not implemented yet.
- `README.md` and `FILE_GUIDE.md`: current feature and file documentation.

No dependency was added. Surprise is random within fetched candidates, not the entire TMDB catalog. Shared studios are matched by exact ID; there is no corporate studio-relationship database. Factor context describes the candidate, not an assertion that every listed person/studio matches the seed.

## Design research

The design uses short summaries with longer information disclosed on request, avoiding a crowded header. [Native details/summary](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details) supplies this without a UI framework.

[TMDB's provider documentation](https://developer.themoviedb.org/reference/movie-watch-providers) specifies country-based availability, supplied TMDB links rather than direct deep links, and mandatory JustWatch attribution. Availability may change and does not guarantee access through the user's subscription.

## Checks

Lint, TypeScript, all 23 tests, and the production build passed. Browser testing loaded Cars 2 recommendations, opened a Surprise selection, loaded Disney Plus availability for Inside Out 2, and switched to UK with the matching watch URL. At 390px, the detail panel content fit without horizontal overflow. The browser-stored library is a next-step proposal only.
