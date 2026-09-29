"use client";
import { basePath } from "@/lib/paths";
import { useEffect, useRef, useState } from "react";
import { LatestRequest } from "@/lib/latest-request";
import type { Movie } from "@/lib/scoring";
import { MovieImage } from "./MovieImage";
import { Icon } from "./Icon";

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");
export function SearchCombobox({
  onSelect,
  initialTitle = "",
}: {
  onSelect: (movie: Movie) => void;
  initialTitle?: string;
}) {
  const [query, setQuery] = useState(initialTitle);
  const [results, setResults] = useState<Movie[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const requests = useRef(new LatestRequest());
  const cache = useRef(new Map<string, Movie[]>());
  const [selectedQuery, setSelectedQuery] = useState(normalize(initialTitle));
  const key = normalize(query);
  useEffect(() => {
    const manager = requests.current;
    const request = manager.start();
    if (key.length < 2 || key === selectedQuery) return;
    const timer = setTimeout(async () => {
      if (cache.current.has(key)) {
        setResults(cache.current.get(key)!);
        setStatus("done");
        return;
      }
      setStatus("searching");
      setError("");
      try {
        const response = await fetch(
          basePath + "/api/search?q=" + encodeURIComponent(key),
          {
            signal: AbortSignal.any([
              request.signal,
              AbortSignal.timeout(12000),
            ]),
          },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Search failed. Please try again.");
        if (!request.isCurrent()) return;
        if (cache.current.size >= 50)
          cache.current.delete(cache.current.keys().next().value!);
        cache.current.set(key, data.results);
        setResults(data.results);
        setStatus("done");
      } catch (error) {
        if (!request.isCurrent()) return;
        setError(
          error instanceof Error && error.name !== "TimeoutError"
            ? error.message
            : "Search took too long. Try again.",
        );
        setStatus("error");
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      manager.cancel();
    };
  }, [query, key, retry, selectedQuery]);
  useEffect(() => {
    if (active >= 0)
      document
        .getElementById("movie-option-" + active)
        ?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [active]);
  function choose(movie: Movie) {
    requests.current.cancel();
    setSelectedQuery(normalize(movie.title));
    setQuery(movie.title);
    setOpen(false);
    setActive(-1);
    setStatus("idle");
    setResults([]);
    onSelect(movie);
  }
  const expanded = open && key.length >= 2 && key !== selectedQuery;
  return (
    <div
      className="search-combobox"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <form
        className="search-pill"
        onSubmit={(event) => {
          event.preventDefault();
          if (results.length) choose(results[active >= 0 ? active : 0]);
          else setOpen(true);
        }}
      >
        <span aria-hidden="true" className="search-symbol">
          <Icon name="search" />
        </span>
        <label htmlFor="movie-search" className="sr-only">
          Search a movie you love
        </label>
        <input
          id="movie-search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls="movie-options"
          aria-activedescendant={
            expanded && active >= 0 ? "movie-option-" + active : undefined
          }
          autoComplete="off"
          maxLength={100}
          placeholder="Search a movie you love…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            requests.current.cancel();
            setSelectedQuery("");
            const nextKey = normalize(event.target.value);
            const cached = cache.current.get(nextKey);
            setQuery(event.target.value);
            setResults(cached ?? []);
            setActive(-1);
            setStatus(
              cached ? "done" : nextKey.length >= 2 ? "searching" : "idle",
            );
            setError("");
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              if (results.length)
                setActive((index) =>
                  event.key === "ArrowDown"
                    ? (index + 1) % results.length
                    : (index - 1 + results.length) % results.length,
                );
            }
            if (event.key === "Tab") setOpen(false);
          }}
        />
        <button type="submit" className="primary" disabled={!results.length}>
          Find matches
        </button>
      </form>
      <div
        className="search-dropdown"
        data-lenis-prevent
        data-expanded={expanded}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <ul id="movie-options" role="listbox" aria-label="Movie suggestions">
          {results.map((movie, index) => (
            <li
              key={movie.id}
              id={"movie-option-" + index}
              role="option"
              aria-selected={active === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(movie)}
              onMouseEnter={() => setActive(index)}
            >
              <MovieImage movie={movie} small />
              <span>
                <span className="suggestion-title">
                  <Highlight text={movie.title} query={query.trim()} />
                </span>
                <span className="muted">
                  {movie.release_date.slice(0, 4) || "Year unknown"}
                </span>
              </span>
              <span className="suggestion-arrow" aria-hidden="true">
                ↗
              </span>
            </li>
          ))}
        </ul>
        <div role="status" className="search-status">
          {status === "searching" && "Searching…"}
          {status === "done" &&
            !results.length &&
            'No movies found for "' + query.trim() + '". Try another title.'}
          {status === "error" && (
            <>
              {error}{" "}
              <button
                type="button"
                onClick={() => {
                  setStatus("searching");
                  setRetry((value) => value + 1);
                }}
              >
                Retry search
              </button>
            </>
          )}
          {status === "done" &&
            results.length > 0 &&
            "Use ↑ ↓ and Enter to choose a movie."}
        </div>
      </div>
    </div>
  );
}
function Highlight({ text, query }: { text: string; query: string }) {
  const start = text.toLowerCase().indexOf(query.toLowerCase());
  if (start < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, start)}
      <strong>{text.slice(start, start + query.length)}</strong>
      {text.slice(start + query.length)}
    </>
  );
}
