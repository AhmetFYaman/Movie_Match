# File guide and interview walkthrough

## Latest UI polish

[UI_POLISH_CHANGELOG.md](UI_POLISH_CHANGELOG.md) lists every file changed for dropdown layering, larger text, centered SVG icons, mode transitions, animated ranking, and pre-search Mood sliders. The only new application components are `Icon.tsx` (shared SVGs) and `ResultGrid.tsx` (card-position animations). [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) covers hosting setup. The scoring suite now has fourteen tests, eighteen across the project.

## Publishing safeguards added afterward

- `.gitignore`: keeps real environment files, private keys, hosting metadata, the backup archive, and local audit reports out of future commits.
- `src/lib/recommend.ts`: added the `server-only` import so Next.js rejects use from client components.
- `next.config.ts`: explicitly disables production browser source maps (not a substitute for keeping secrets on the server).
- `package.json` / `package-lock.json`: added the small server-only marker package and enabled the server condition for Node tests.
- `README.md`: added deployment-secret setup, credential rotation, public-source limitations, and a pre-publish checklist.
- `.env.local` was preserved, not printed or copied into source code. `.env.example` remains a safe placeholder.

The reformat separates a few interactive pieces into named components. There are more files than the previous five-file prototype, but each has one clear job. No Tailwind, UI kit, state-management library, or machine-learning framework was added.

## Changed existing application files

| File                          | What it does now                                                                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`            | Coordinates Discover/Browse/Mood, selected seed, loading, sorting, recommendations, and the detail sheet. Owns the recommendation request guard.                                                    |
| `src/app/api/movies/route.ts` | Validates inputs and returns search, browsing, or recommendation data; retains old endpoint compatibility. Adds safe HTTP caching and the development debug identity.                               |
| `src/lib/scoring.ts`          | Shared types, genres, five formulas, presets, missing-data rules, percentage normalization, locked-slider redistribution, ranking, and explanation sentences. All computation is pure and testable. |
| `src/app/globals.css`         | Black/blue theme, pill navigation, backdrop layers, 2–6-column poster grid, dropdown, modal, focus states, 360px layout, and reduced-motion rules.                                                  |
| `src/app/layout.tsx`          | HTML shell, metadata, self-hosted Geist via next/font, global CSS, and scrolling provider.                                                                                                          |

## New application files

| File                                | Responsibility                                                                                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/search/route.ts`       | Autocomplete endpoint: validates and normalizes q, returns up to eight movies sorted by popularity.                                                                     |
| `src/app/api/recommend/route.ts`    | Dedicated recommendation URL; reuses the existing validated handler.                                                                                                    |
| `src/lib/recommend.ts`              | Server-side TMDB access, credential handling, safe errors, metadata extraction, source requests, deduplication, eight-at-a-time hydration, and top-24 default response. |
| `src/lib/latest-request.ts`         | Small reusable cancellation/counter class. A response must still be current before changing React state.                                                                |
| `src/components/SearchCombobox.tsx` | Autocomplete, 200ms debounce, normalized-query Map, thumbnails, keyboard navigation, retry, and stale-search protection.                                                |
| `src/components/MatchWeights.tsx`   | Collapsed Advanced panel, presets, five range inputs, locks, and a stacked percentage bar. Delegates arithmetic to scoring.ts.                                          |
| `src/components/MovieDetails.tsx`   | Native dialog with focus containment, Escape/close, scroll locking, match bars, explanation, and another-seed action.                                                   |
| `src/components/MovieImage.tsx`     | Shared Next Image poster/thumbnail rendering with reserved space and missing-poster treatment.                                                                          |
| `src/components/HeroBackdrop.tsx`   | Keeps the previous backdrop beneath the next one and crossfades when the new image loads.                                                                               |
| `src/app/providers.tsx`             | Lenis wrapper and a hydration-safe reduced-motion subscription. It is not a global data store.                                                                          |

## Configuration, tests, and documentation

| File                                | Change / purpose                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next.config.ts`                    | New: permits Next Image to optimize only TMDB image-service URLs.                                                                                                             |
| `package.json`, `package-lock.json` | Added Lenis as the one runtime dependency for the requested scrolling behavior.                                                                                               |
| `tests/scoring.test.ts`             | Replaced old expectations with eleven tests for the new formulas, presets, rounding, locks, and ranking.                                                                      |
| `tests/api.test.ts`                 | Three tests for validation, credential/error isolation, normalized search, and request cancellation.                                                                          |
| `tests/recommend.test.ts`           | New mocked Endgame/Paddington regression, exclusion/filter checks, partial failure, and concurrency check. Uses the existing tests folder, not a second **tests** convention. |
| `README.md`                         | Updated setup, feature flow, formulas, caching, limitations, and verification commands.                                                                                       |
| `PROJECT_PLAN.md`                   | Updated current scope; SQL remains an explicitly unimplemented next milestone.                                                                                                |
| `REFORMAT_CHANGELOG.md`             | Detailed requested-vs-implemented changes, audit findings, verification, and deliberate adaptations.                                                                          |
| `FILE_GUIDE.md`                     | This file: file responsibilities and interview explanations.                                                                                                                  |
| `lighthouse-accessibility.json`     | Generated accessibility audit of the homepage; not application code.                                                                                                          |

## Preserved files

`.env.local` and `.env.example` were not changed. The existing token remains server-only and ignored by Git. `AGENTS.md`, `CLAUDE.md`, TypeScript/ESLint configuration, and `previous-dashboard-backup.zip` were preserved. Next.js and TypeScript may regenerate their normal build/type artifacts.

## A short interview explanation

“I built a metadata-based movie recommender. The browser sends a selected TMDB movie id to a Next.js API route. The server retrieves the movie and a bounded pool of related films. A pure TypeScript function compares five metadata factors. The frontend combines those similarities with adjustable percentages and shows the best matches, including an explanation of each score.”

### Why these choices?

- **Movie ids instead of titles:** different movies can share a name; an id selects the exact film.
- **Server route:** keeps the TMDB credential private and centralizes input validation and errors.
- **Pure scoring function:** easy to unit-test and calculate by hand. No model training or hidden AI behavior.
- **Two request protections:** abort cancels unnecessary work; the counter rejects a stale response even if it already finished.
- **Up to 80 candidates:** useful variety while bounding API work. Eight concurrent detail requests avoids one giant burst.
- **Client-side reranking:** changing weights is just arithmetic on existing metadata, not another network request.
- **Missing metadata:** absent factors do not unfairly dilute a match; their weights are redistributed.
- **Locks and rounding:** preserve locked percentages and proportionally divide the remaining budget; largest-remainder rounding makes the total exactly 100.
- **Native dialog and controls:** the browser supplies keyboard behavior and focus management.
- **Plain CSS:** the design does not require learning a second styling framework.
- **Lenis:** isolated to one provider, included because the reformat explicitly requested it.

### Read the code in this order

1. Movie/Preferences/Weights types and scoreMovie in scoring.ts.
2. recommend in recommend.ts.
3. The short API handlers.
4. chooseMovie/load and ranked results in page.tsx.
5. Individual components, then CSS.

### What not to claim

This is not collaborative filtering, a trained decision tree, or an ML model. It does not rank the entire TMDB catalog. It has no SQL database or saved-list persistence yet. Similarity percentages are not predicted user ratings.
