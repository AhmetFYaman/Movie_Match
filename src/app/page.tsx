"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLenis } from "lenis/react";
import { useReducedMotion } from "./providers";
import { SearchCombobox } from "@/components/SearchCombobox";
import { MatchWeights } from "@/components/MatchWeights";
import { MovieDetails } from "@/components/MovieDetails";
import { MovieImage } from "@/components/MovieImage";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { Icon } from "@/components/Icon";
import { ResultGrid } from "@/components/ResultGrid";
import { LatestRequest } from "@/lib/latest-request";
import { pickSurprise } from "@/lib/surprise";
import {
  genres,
  defaultWeights,
  preferencesFromMovie,
  preferencesFromMood,
  availableFactors,
  normalizeWeights,
  rankMovies,
  type Movie,
  type Preferences,
  type Weights,
} from "@/lib/scoring";

const genreNames = (movie: Movie) =>
  movie.genre_ids
    .map((id) => genres.find((genre) => genre.id === id)?.name)
    .filter(Boolean)
    .join(", ");

export default function MovieFinder() {
  const [mode, setMode] = useState<"discover" | "browse" | "mood">("discover");
  const [seed, setSeed] = useState<Movie | null>(null);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [trendError, setTrendError] = useState("");
  const [trendLoaded, setTrendLoaded] = useState(false);
  const [trendRetry, setTrendRetry] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [sort, setSort] = useState("match");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [rating, setRating] = useState("7");
  const [preferences, setPreferences] = useState<Preferences>({
    genreIds: [],
    year: null,
    rating: 7,
  });
  const [weights, setWeights] = useState<Weights>(defaultWeights);
  const [moodWeights, setMoodWeights] = useState<Weights>(defaultWeights);
  const [selected, setSelected] = useState<number | null>(null);
  const [picked, setPicked] = useState("");
  const [surpriseReason, setSurpriseReason] = useState("");
  const recentSurprises = useRef<number[]>([]);
  const [lastRequest, setLastRequest] = useState({ params: "", preferences });
  const requests = useRef(new LatestRequest());
  const lenis = useLenis();
  const reduced = useReducedMotion();
  const available = availableFactors(preferences);
  const moodPreferences = preferencesFromMood(genre, year, rating);
  const moodAvailable = availableFactors(moodPreferences);
  const effective = normalizeWeights(
    mode === "mood" ? moodWeights : weights,
    available,
  );
  const ranked = rankMovies(movies, preferences, effective);
  const topMatches = ranked.slice(0, 24);
  if (sort === "rating")
    topMatches.sort((a, b) => b.movie.vote_average - a.movie.vote_average);
  if (sort === "year")
    topMatches.sort((a, b) =>
      b.movie.release_date.localeCompare(a.movie.release_date),
    );
  const detail = ranked.find((result) => result.movie.id === selected);
  const hero = seed ?? trending[heroIndex % Math.max(1, trending.length)];

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/movies?browse=true", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        setTrending(data.movies);
        setTrendLoaded(true);
        setTrendError("");
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setTrendError(error.message || "Trending movies could not load.");
          setTrendLoaded(true);
        }
      });
    return () => controller.abort();
  }, [trendRetry]);
  useEffect(() => {
    if (seed || reduced || paused || !trending.length) return;
    const timer = setInterval(
      () => setHeroIndex((index) => (index + 1) % trending.length),
      10000,
    );
    return () => clearInterval(timer);
  }, [seed, reduced, paused, trending.length]);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", update, { passive: true });
    update();
    const current = requests.current;
    return () => {
      window.removeEventListener("scroll", update);
      current.cancel();
    };
  }, []);

  function scrollTo(target: string) {
    if (lenis) {
      // New results can change the page height before Lenis's next resize tick.
      lenis.resize();
      lenis.scrollTo(target, {
        offset: -88,
        immediate: reduced,
        duration: 1.05,
      });
    } else
      document
        .querySelector(target)
        ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
  }
  function clearMoodResults() {
    requests.current.cancel();
    setBusy(false);
    setLoaded(false);
    setMovies([]);
    setError("");
    setWarning("");
  }
  function changeMode(next: typeof mode) {
    requests.current.cancel();
    setMode(next);
    setBusy(false);
    setError("");
    setWarning("");
    setSeed(null);
    setMovies([]);
    setLoaded(false);
    setSelected(null);
    setPicked("");
    setWeights(defaultWeights);
    requestAnimationFrame(() => {
      scrollTo(next === "browse" ? "#browse" : "#discover");
      if (next === "discover")
        document.getElementById("movie-search")?.focus({ preventScroll: true });
    });
  }
  async function load(params: string, fallback: Preferences) {
    recentSurprises.current = [];
    setSurpriseReason("");
    const request = requests.current.start();
    setBusy(true);
    setLoaded(false);
    setError("");
    setWarning("");
    setMovies([]);
    setPicked("");
    setLastRequest({ params, preferences: fallback });
    setSelected(null);
    try {
      const response = await fetch("/api/recommend?" + params, {
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(110000)]),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load movies.");
      if (!request.isCurrent()) return;
      setSeed(data.seed);
      setMovies(data.movies);
      setPreferences(data.seed ? preferencesFromMovie(data.seed) : fallback);
      setWarning(data.warning ?? "");
      setLoaded(true);
      setSort("match");
      requestAnimationFrame(() => {
        document
          .getElementById("results-heading")
          ?.focus({ preventScroll: true });
        scrollTo("#results");
      });
    } catch (error) {
      if (!request.isCurrent()) return;
      setError(
        error instanceof Error && error.name !== "TimeoutError"
          ? error.message
          : "TMDB took too long. Please try again.",
      );
    } finally {
      if (request.isCurrent()) setBusy(false);
    }
  }
  function chooseMovie(movie: Movie) {
    setMode("discover");
    setSeed(movie);
    setWeights(defaultWeights);
    void load(
      new URLSearchParams({ id: String(movie.id) }).toString(),
      preferencesFromMovie(movie),
    );
  }
  function submitMood(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSeed(null);
    const params = new URLSearchParams();
    if (genre) params.set("genre", genre);
    if (year) params.set("year", year);
    void load(params.toString(), moodPreferences);
  }
  return (
    <>
      <a href="#discover" className="skip-link">
        Skip to movie search
      </a>
      <header className={"site-header " + (scrolled ? "is-scrolled" : "")}>
        <div className="header-inner">
          <a
            href="#discover"
            className="brand"
            onClick={(event) => {
              event.preventDefault();
              changeMode("discover");
            }}
          >
            <span aria-hidden="true" className="brand-play">
              ▶
            </span>{" "}
            MovieMatch
          </a>
          <nav aria-label="Main navigation">
            {(["discover", "browse", "mood"] as const).map((item) => (
              <button
                type="button"
                key={item}
                aria-label={item[0].toUpperCase() + item.slice(1)}
                aria-pressed={mode === item}
                onClick={() => changeMode(item)}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon name={item === "discover" ? "search" : item} />
                </span>
                <span className="nav-text">
                  {item[0].toUpperCase() + item.slice(1)}
                </span>
              </button>
            ))}
          </nav>
          <button
            type="button"
            className="header-search"
            aria-label="Focus movie search"
            onClick={() => changeMode("discover")}
          >
            <Icon name="search" />
          </button>
        </div>
      </header>
      <main>
        <section
          className="hero"
          id="discover"
          aria-label="Find your next movie"
        >
          <HeroBackdrop path={hero?.backdrop_path} />
          <div className="content hero-content mode-enter" key={mode}>
            <p className="hero-intro">
              {seed
                ? "Your starting point"
                : "A little less searching. A little more cinema."}
            </p>
            <h1>
              {seed
                ? seed.title
                : mode === "mood"
                  ? "Your mood. Your next movie."
                  : "Find movies like the ones you love."}
            </h1>
            {seed ? (
              <p className="hero-meta">
                {seed.release_date.slice(0, 4) || "Year unknown"} ·{" "}
                {genreNames(seed)} · <span className="star">★</span>{" "}
                {seed.vote_average.toFixed(1)}
              </p>
            ) : (
              <p className="hero-description">
                Start with a favorite. Find your next.
              </p>
            )}
            {mode !== "mood" ? (
              <>
                <SearchCombobox
                  key={seed?.id ?? mode}
                  initialTitle={seed?.title ?? ""}
                  onSelect={chooseMovie}
                />
                <button
                  type="button"
                  className="text-button"
                  onClick={() => changeMode("mood")}
                >
                  No title in mind? Explore by mood{" "}
                  <span aria-hidden="true">→</span>
                </button>
              </>
            ) : (
              <form className="mood-form" onSubmit={submitMood}>
                <p>Skip the title. Tell us what you feel like watching.</p>
                <div className="mood-fields">
                  <label>
                    Genre
                    <select
                      value={genre}
                      onChange={(event) => {
                        setGenre(event.target.value);
                        clearMoodResults();
                      }}
                    >
                      <option value="">Any genre</option>
                      {genres.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Release year
                    <input
                      type="number"
                      min="1888"
                      max="2100"
                      placeholder="Any year"
                      value={year}
                      onChange={(event) => {
                        setYear(event.target.value);
                        clearMoodResults();
                      }}
                    />
                  </label>
                  <label>
                    Target rating
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={rating}
                      onChange={(event) => {
                        setRating(event.target.value);
                        clearMoodResults();
                      }}
                    />
                  </label>
                  <button
                    type="submit"
                    className="primary"
                    disabled={
                      busy || !Object.values(moodAvailable).some(Boolean)
                    }
                  >
                    Find matches
                  </button>
                </div>
                <MatchWeights
                  mood
                  weights={normalizeWeights(moodWeights, moodAvailable)}
                  available={moodAvailable}
                  onChange={setMoodWeights}
                />
              </form>
            )}
            {seed && !busy && (
              <details className="seed-details">
                <summary>Cast & studios</summary>
                <p>
                  <strong>Cast:</strong>{" "}
                  {seed.cast?.map((person) => person.name).join(", ") ||
                    "Not available"}
                </p>
                <p>
                  <strong>Director:</strong>{" "}
                  {seed.director?.name || "Not available"}
                </p>
                <p>
                  <strong>Studios:</strong>{" "}
                  {seed.companies?.map((company) => company.name).join(", ") ||
                    "Not available"}
                </p>
              </details>
            )}
          </div>
          {!seed && hero && (
            <div className="backdrop-caption">
              <span>Now in the backdrop · {hero.title}</span>
              {!reduced && (
                <button
                  type="button"
                  aria-pressed={paused}
                  onClick={() => setPaused(!paused)}
                >
                  {paused ? "Resume" : "Pause"}
                </button>
              )}
            </div>
          )}
        </section>
        <div className="content catalog-content">
          {(busy || loaded || error) && (
            <section
              id="results"
              className="results-section"
              aria-labelledby="results-heading"
              aria-busy={busy}
            >
              {seed && loaded && movies.length > 0 && (
                <MatchWeights
                  key={seed?.id ?? "mood"}
                  weights={effective}
                  available={available}
                  onChange={setWeights}
                />
              )}
              <div className="section-heading">
                <div>
                  <h2 id="results-heading" tabIndex={-1}>
                    {seed
                      ? "Because you picked " + seed.title
                      : "Movies for your mood"}
                  </h2>
                  <p className="muted">
                    {busy
                      ? "Finding movies and comparing their details…"
                      : loaded
                        ? topMatches.length + " matches · tuned to your taste"
                        : "Let’s try that again."}
                  </p>
                </div>
                {loaded && movies.length > 0 && (
                  <div className="result-actions">
                    <label className="sr-only" htmlFor="sort-movies">
                      Sort matches
                    </label>
                    <select
                      id="sort-movies"
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                    >
                      <option value="match">Best match</option>
                      <option value="rating">Highest rated</option>
                      <option value="year">Newest first</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const pick = pickSurprise(
                          ranked,
                          preferences,
                          recentSurprises.current,
                        );
                        if (!pick) return;
                        recentSurprises.current = [
                          ...recentSurprises.current,
                          pick.result.movie.id,
                        ].slice(-5);
                        setSelected(pick.result.movie.id);
                        setSurpriseReason(pick.reason);
                        setPicked("Tonight’s pick: " + pick.result.movie.title);
                      }}
                    >
                      Surprise me
                    </button>
                  </div>
                )}
              </div>
              <p className="sr-only" role="status">
                {picked ||
                  (loaded
                    ? topMatches.length + " matches loaded."
                    : busy
                      ? "Loading matches."
                      : "")}
              </p>
              {error && (
                <div className="notice" role="alert">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() =>
                      void load(lastRequest.params, lastRequest.preferences)
                    }
                  >
                    Try again
                  </button>
                </div>
              )}
              {warning && (
                <p className="notice" role="status">
                  {warning}
                </p>
              )}
              {busy ? (
                <Skeletons />
              ) : (
                <ResultGrid>
                  {topMatches.map((result) => (
                    <article
                      key={result.movie.id}
                      className="movie-card"
                      data-movie-id={result.movie.id}
                    >
                      <button
                        type="button"
                        className="card-button"
                        onClick={() => setSelected(result.movie.id)}
                      >
                        <span className="sr-only">Show match details. </span>
                        <div className="poster-wrap">
                          <MovieImage movie={result.movie} />
                          <span className="rating-badge">
                            <span className="star">★</span>{" "}
                            {result.movie.vote_average.toFixed(1)}
                          </span>
                          <span className="poster-action" aria-hidden="true">
                            Why this match? ↗
                          </span>
                        </div>
                        <h3>{result.movie.title}</h3>
                        <p>
                          {result.movie.release_date.slice(0, 4) ||
                            "Year unknown"}{" "}
                          <span>·</span>{" "}
                          <span className="match-label">
                            {Math.round(result.match * 100)}% match
                          </span>
                        </p>
                      </button>
                    </article>
                  ))}
                </ResultGrid>
              )}
              {loaded && !movies.length && (
                <p className="notice">
                  No movies found for these preferences. Try another genre or a
                  wider release period.
                </p>
              )}
            </section>
          )}
          {((!seed && !loaded && !busy && !error) || mode === "browse") && (
            <section
              id="browse"
              className="browse-section"
              aria-labelledby="browse-heading"
            >
              <div className="section-heading">
                <div>
                  <h2 id="browse-heading">Popular this week</h2>
                  <p className="muted">
                    Pick a movie to find something similar.
                  </p>
                </div>
                <span className="browse-count">
                  {trending.length
                    ? trending.length + " films to start with"
                    : ""}
                </span>
              </div>
              {trendError && (
                <div className="notice" role="alert">
                  <p>{trendError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setTrendLoaded(false);
                      setTrendRetry((value) => value + 1);
                    }}
                  >
                    Retry trending movies
                  </button>
                </div>
              )}
              {!trendLoaded ? (
                <Skeletons />
              ) : (
                <div className="movie-grid">
                  {trending.map((movie) => (
                    <article className="movie-card" key={movie.id}>
                      <button
                        type="button"
                        className="card-button"
                        onClick={() => chooseMovie(movie)}
                      >
                        <span className="sr-only">Find movies like this. </span>
                        <div className="poster-wrap">
                          <MovieImage movie={movie} />
                          <span className="rating-badge">
                            <span className="star">★</span>{" "}
                            {movie.vote_average.toFixed(1)}
                          </span>
                          <span className="poster-action" aria-hidden="true">
                            Find similar ↗
                          </span>
                        </div>
                        <h3>{movie.title}</h3>
                        <p>
                          {movie.release_date.slice(0, 4) || "Year unknown"}
                        </p>
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
          <footer>
            <div className="footer-brand">
              MovieMatch <span>Find your next favorite.</span>
            </div>
            <div className="attribution">
              <Image
                unoptimized
                src="https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
                alt="TMDB"
                width={70}
                height={12}
              />
              <p>
                This product uses the TMDB API but is not endorsed or certified
                by TMDB.
              </p>
            </div>
          </footer>
        </div>
      </main>
      {detail && (
        <MovieDetails
          key={detail.movie.id}
          result={detail}
          surpriseReason={surpriseReason}
          onClose={() => {
            setSelected(null);
            setSurpriseReason("");
          }}
          onSelect={chooseMovie}
        />
      )}
    </>
  );
}
function Skeletons() {
  return (
    <div className="movie-grid skeleton-grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index}>
          <div className="skeleton-poster" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
