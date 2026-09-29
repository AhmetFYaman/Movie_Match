# MovieMatch — focused portfolio scope

## Implemented

A title-first movie recommender with live TMDB autocomplete, an exact-id seed, automatic genre/year/rating/cast/director/studio extraction, a bounded candidate pool, and explainable weighted ranking.

The frontend has Discover/Browse/Mood navigation, a streaming-style backdrop and poster grid, optional Advanced percentage weights, presets, locks, a match-detail sheet, and Surprise me. Manual parameters appear only after skipping the title.

Next.js + React + TypeScript + plain CSS. Lenis is isolated to scrolling. No account system, global data store, or ML framework.

## Learn and explain first

1. Trace a selected movie id from the combobox to the server and back.
2. Calculate one five-factor score by hand.
3. Change a preset and explain why the ordering changes without a request.
4. Explain full-URL caching versus a latest-request race.
5. Run the regression tests and identify the Endgame/Paddington case.

## Next database milestone — not implemented

Add SQLite and two tables: movies and saved_movies. Use explicit SQL for inserts, selects, joins, updates, and deletes. Add primary/foreign keys, constraints, and an index. Add one Save action and a compact saved list.

Keep this a separate short learning session. Do not describe the current project as database-management experience until that milestone is implemented and tested.

## Optional later

TV support, a user feedback field, or evaluating recommendation quality using a small hand-labeled sample. Do not add IMDb/Rotten Tomatoes ratings without an authorized source.

## Verification

Run tests, lint, typecheck, and build. Browser checks cover autocomplete, exact selection, weights/locks, explanations, and mobile layout. See REFORMAT_CHANGELOG.md for audit outcomes.
