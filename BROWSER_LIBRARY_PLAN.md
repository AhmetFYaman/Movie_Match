# Next step: a browser-only watched library

Proposal only; no database or library implementation was added in this iteration.

Use **localStorage**, not an account/session database. It survives closing and reopening the browser. If you truly want the list erased when the tab closes, use **sessionStorage** instead.

## Small first version

1. A “Mark watched” button in movie details saves `{ id, title, poster_path, release_date, watchedAt }` in a versioned object under `movie-match:library:v1`.
2. A “Hide watched” toggle filters recommendations and Surprise me by movie ID before the top-24 slice. Do not delete candidates: toggling it off restores them immediately.
3. A simple Library panel lists saved movies with “Undo watched” and a confirmed “Clear library” action. Add optional JSON export/import later for backup or moving devices.

Keep storage in one `useWatchedMovies` hook. Load after mounting, validate parsed JSON, and do not save until the initial read finishes (otherwise an empty first render can overwrite saved data). Catch blocked-storage, malformed-data, and quota errors; keep the app usable in memory and explain that saving failed. Listen for the `storage` event to synchronize other tabs.

Tests: reload persistence, duplicate IDs, undo, hide/unhide, Surprise exclusions, invalid JSON, blocked storage, and an empty library.

Limits: local to one browser/profile and site origin; no device sync or account backup. Clearing site data removes the list. Incognito data is temporary. The localhost list will not automatically transfer to your Vercel domain. Never store the TMDB token here.

References: [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), [MDN sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).
