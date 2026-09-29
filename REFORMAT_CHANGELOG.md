# Reformat implementation — detailed change log

Applied the proposed product changes from the supplied reformat.md to the existing project. The attachment was used as a specification, not installed as a replacement AGENTS.md.

## 1. Backend audit, before visual work

The only original server entry point was GET /api/movies in src/app/api/movies/route.ts. There were no server actions or pages/api routes.

Read-only audit findings:

- No unstable_cache, React Query, SWR, Redis/KV, module-level last-result variable, or local/session storage.
- The existing candidate Map was created inside each request, not shared across users.
- The upstream fetch URL already included the seed id or search query.
- Direct Endgame (299534) → Paddington (116149) → Endgame calls returned different seed-specific pools, then the original Endgame pool again.
- Therefore, the reported server cache collision was not reproduced. Paddington's old small pool did contain some unrelated popular titles; this was a candidate-selection/weighting quality issue, not proof of a shared cache.
- The old client had no abort controller or latest-request guard. That race risk was fixed first through a reusable request guard, then connected to both loading flows.

Current server entry points: GET /api/movies, GET /api/search, GET /api/recommend.

## 2. Interface

- Replaced green auroras, stars, decorative arcs, glow effects, uppercase system labels, section numbers, and jargon.
- Added the supplied black/surface/blue color tokens and separate pill/card/panel radii.
- Geist Sans is loaded with next/font and served by the app. Only 400/500/600 weights are requested.
- Added a full-width movie backdrop with bottom fade, approximately 70vh hero, 600ms image crossfade, and 1400px content container.
- The default backdrop cycles through trending films every ten seconds. Pause/Resume is provided; reduced-motion users get no automatic rotation.
- Added fixed navigation that becomes blurred on scroll: Discover, Browse, Mood. Mobile labels become accessible icons.
- Title-first search remains the default. Manual genre/year/rating inputs appear only in Mood.
- Cards use a 2:3 poster, top-right rating pill, year, and match percentage. The grid has 2/3/4/5/6 columns by viewport width.
- Next Image reserves image space and serves responsive images. Cards use TMDB w342 sources; backdrop originals are resized by Next Image's responsive srcset.
- Pointer hover scales cards 1.03. No card shadows or section entrance animations.
- Added skeleton posters, retryable error notices, and empty-result copy.

## 3. Search

- Dedicated /api/search?q= endpoint.
- Two-character minimum; 200ms debounce.
- Up to eight non-adult movie suggestions, sorted by popularity.
- Client Map is keyed by lowercase, trimmed, whitespace-collapsed query, capped at 50 entries.
- AbortController plus latest-request version guard prevents old searches from overwriting newer ones.
- Thumbnail, highlighted matched text, title, and year in each row.
- ARIA combobox/listbox/options, arrow navigation, Enter selection, Escape close, Tab exit, loading/empty/error states, and retry.
- Selection sends the exact TMDB id to the recommender.
- Explicitly tested rapid query changes and trailing whitespace.

## 4. Recommendation pipeline

Previously: up to 12 candidates, top-five cast, simple overlap/linear year scoring.

Now:

1. Fetch seed details with credits and keywords. Extract genres, release year, TMDB rating/vote count, top-ten cast, first credited director, and studios.
2. Fetch two recommendation pages, one similar-movie page, genre/year discovery within ±10 years, cast discovery, and studio discovery.
3. Round-robin across sources so one source cannot monopolize the pool.
4. Deduplicate; exclude seed, adult movies, and vote counts below 50.
5. Hydrate at most 80 candidates in groups of eight, with Promise.allSettled.
6. Keep successful candidates if some requests fail, and show a partial-data warning.
7. Return the full metadata pool for client reranking and a top-24 default results array with match, breakdown, and reason.
8. The client displays the top 24 from its current weights; sort controls rearrange that best-match shortlist.

Keywords are fetched as requested but are not a scoring factor. This is deterministic metadata similarity, not a trained tree or machine-learning model.

## 5. Formula and weight changes

- Genre: Jaccard similarity plus a capped primary-genre bonus.
- Era: Gaussian proximity using an eight-year scale.
- Rating: distance from the seed's rating with a vote-count confidence factor.
- Cast: shared top-ten cast plus director, divided by three; same director yields at least 0.6.
- Studio: shared studios divided by two.
- Balanced default: 20% per factor.
- Presets: Balanced, Same vibe, Same era, Same people, Crowd-pleasers.
- Five sliders with locks; moving one proportionally redistributes the remainder across other unlocked available factors.
- Largest-remainder rounding keeps integer percentages summing to 100.
- Missing metadata greys out that factor and renormalizes the available ones.
- Presets reset locks. If no other available slider is unlocked, a slider cannot move.
- Changes rerank the already-fetched pool immediately. No recommendation fetch is triggered by a slider.

Advanced controls remain collapsed on desktop as well as mobile to honor the earlier request for a minimal default experience.

## 6. Explainability and interaction

- Clicking a result opens a native modal detail sheet.
- It shows synopsis, five factor bars, effective weight percentages, and a sentence from the two largest useful weighted contributions.
- Native dialog behavior provides modal focus containment; Escape/close restores focus. Background scrolling is stopped while open.
- Surprise me opens one of the current top six matches.
- Find movies like this starts again from that result's id.
- Lenis handles scrolling to results with a header offset; dropdowns, preset rows, and sheets scroll natively.
- Reduced-motion preferences remove smooth scrolling, crossfades, rotation, and hover transforms.
- Visible focus rings, input labels, a skip link, and loading/status announcements are included.

## 7. Cache and credential behavior

- Existing .env.local token was preserved; it was not moved into client code.
- Dynamic handlers read request.url and respond with Cache-Control: no-store.
- Kept Next's upstream full-URL data cache: details/credits 24 hours; source lists and search one hour.
- No shared recommendation-result cache was added. This avoids introducing another cache layer just for the specification.
- Development x-cache-key identifies the default request using algorithm v2, seed/mood inputs, and normalized fixed-order weights. Client-only weight changes do not issue an HTTP request, so they have no new response header.
- No force-dynamic override was needed: all three endpoints were verified dynamic in the production build, while explicit upstream caching remains available.
- Errors expose safe descriptions, not upstream response bodies or credentials.

## 8. Verification

Completed:

- npm test: 15 passing tests.
- npm run lint: passes.
- npm run typecheck: passes.
- npm run build: passes; all three API routes are dynamic.
- Mocked Endgame → Paddington → Endgame regression passes. The two seeds differ; returning to the same seed is stable.
- Live integration: each seed returned 80 candidates and 24 results. Endgame led with Infinity War/Civil War/The Avengers; Paddington led with Paddington 2/Paddington in Peru/Wonka/Christopher Robin.
- Browser: title autocomplete, keyboard selection, rapid query changes, Escape, exact Paddington selection, presets, locked percentage changes, Surprise me, modal focus/close, and no-title Comedy/2014 flow.
- Mobile: tested 360px viewport; no horizontal page overflow. Manual mode correctly showed unavailable cast/studio weights at zero.
- Lighthouse homepage accessibility report: 100/100 with no failed audits. Report: lighthouse-accessibility.json.

Lighthouse caveat: the JSON report completed with no runtimeError, but its Windows Chrome temporary-directory cleanup returned EPERM afterward. This is recorded rather than describing the CLI exit as clean. The score is for the homepage, not a certification of every interactive state. Autocomplete uses a 200ms delay; actual response latency depends on TMDB/network conditions and is not guaranteed to be under 300ms.

## 9. Deliberate adaptations and scope

- Kept the project's plain CSS instead of installing Tailwind just to map tokens.
- Used existing TMDB_READ_ACCESS_TOKEN instead of renaming a working secret to TMDB_TOKEN.
- Reused the existing tests directory rather than introducing **tests**.
- Kept /api/movies for compatibility and mood/browse, adding the clearer /api/search and /api/recommend URLs.
- Used Next Image's responsive resizing for backdrop originals rather than a separate hand-written w780/original picture implementation.
- No result cache was added; therefore no Redis or weight-keyed persisted recommendation data is required.
- No git commits were created: this workspace has no Git repository.
- The downloaded reformat.md and the project's AGENTS.md were not changed.
- SQL, saved lists, accounts, TV support, and IMDb/Rotten Tomatoes integration remain out of scope.
- README, FILE_GUIDE, and PROJECT_PLAN were updated to describe the real implementation and the next SQL milestone.

See FILE_GUIDE.md for every changed/new file and an interview walkthrough.
