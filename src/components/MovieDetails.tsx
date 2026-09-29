"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import {
  factors,
  labels,
  genres,
  type scoreMovie,
  type Movie,
} from "@/lib/scoring";
import { MovieImage } from "./MovieImage";
import { Icon } from "./Icon";
import { WatchProviders } from "./WatchProviders";

export function MovieDetails({
  result,
  onClose,
  onSelect,
  surpriseReason = "",
}: {
  result: ReturnType<typeof scoreMovie>;
  onClose: () => void;
  onSelect: (movie: Movie) => void;
  surpriseReason?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [showScores, setShowScores] = useState(false);
  const scoreId = useId();
  const lenis = useLenis();
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    lenis?.stop();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      lenis?.start();
      previous?.focus();
    };
  }, [lenis]);
  const { movie, match, breakdown, effective, reason } = result;
  const year = Number(movie.release_date.slice(0, 4));
  const context = {
    genre: genres
      .filter((genre) => movie.genre_ids.includes(genre.id))
      .map((genre) => genre.name),
    era: year
      ? [
          `${Math.floor(year / 10) * 10}–${Math.floor(year / 10) * 10 + 9} · released ${year}`,
        ]
      : [],
    director: movie.director ? [movie.director.name] : [],
    cast: (movie.cast ?? []).map((person) => person.name),
    studio: (movie.companies ?? []).map((company) => company.name),
  };
  return (
    <dialog
      ref={dialog}
      className="detail-sheet"
      aria-labelledby="detail-title"
      data-lenis-prevent
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet-content">
        <button
          type="button"
          className="sheet-close"
          onClick={onClose}
          aria-label="Close movie details"
          autoFocus
        >
          <Icon name="close" />
        </button>
        <div className="sheet-heading">
          <MovieImage movie={movie} />
          <div className="sheet-title">
            <p className="muted">
              {movie.release_date.slice(0, 4) || "Year unknown"} ·{" "}
              <span className="star">★</span> {movie.vote_average.toFixed(1)}
            </p>
            <h2 id="detail-title">{movie.title}</h2>
            <p className="match-label">{Math.round(match * 100)}% match</p>
          </div>
          <WatchProviders movieId={movie.id} />
        </div>
        {surpriseReason && (
          <p className="surprise-note">Surprise pick · {surpriseReason}</p>
        )}
        <p>{movie.overview || "No synopsis is available for this movie."}</p>
        <h3>Why this match?</h3>
        <p className="reason">{reason}</p>
        <dl className="movie-facts">
          {(
            [
              ["Genres", context.genre, context.genre.length],
              ["Era", context.era, 1],
              ["Director", context.director, 1],
              ["Cast", context.cast, 3],
              ["Studio", context.studio, 2],
            ] as [string, string[], number][]
          ).map(([label, items, preview]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <FactorContext items={items} label={label} preview={preview} />
              </dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          className="score-toggle"
          aria-expanded={showScores}
          aria-controls={scoreId}
          onClick={() => setShowScores((value) => !value)}
        >
          Match breakdown{" "}
          <span aria-hidden="true">{showScores ? "−" : "+"}</span>
        </button>
        <div
          id={scoreId}
          className="context-reveal"
          data-expanded={showScores}
          aria-hidden={!showScores}
          inert={!showScores}
        >
          <div>
            <div className="breakdown score-details">
              {factors.map((key) => (
                <div key={key}>
                  <div className="factor-heading">
                    <span>{labels[key]}</span>
                    <span className="muted">
                      {Math.round(breakdown[key] * 100)}% similarity ·{" "}
                      {effective[key]}% weight
                    </span>
                  </div>
                  <meter
                    min={0}
                    max={1}
                    value={breakdown[key]}
                    aria-label={labels[key] + " similarity"}
                  />
                </div>
              ))}
              <p className="muted">
                Similarity × your weights. Not a prediction of enjoyment. Rating
                based on {movie.vote_count.toLocaleString("en-US")} TMDB votes.
              </p>
            </div>
          </div>
        </div>
        <div className="sheet-actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              onClose();
              onSelect(movie);
            }}
          >
            Find movies like this
          </button>
          <a
            className="button"
            href={"https://www.themoviedb.org/movie/" + movie.id}
            target="_blank"
            rel="noreferrer"
          >
            View on TMDB ↗
          </a>
        </div>
      </div>
    </dialog>
  );
}

// Keep the preview in place; reveal only the remaining names, never a second copy.
function FactorContext({
  items,
  label,
  preview = 2,
}: {
  items: string[];
  label: string;
  preview?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const unique = [...new Set(items)];
  const remaining = unique.slice(preview);
  return (
    <div className="factor-context">
      <div className="context-preview">
        <span>{unique.slice(0, preview).join(", ") || "Not listed"}</span>
        {remaining.length > 0 && (
          <button
            type="button"
            className="context-toggle"
            aria-expanded={expanded}
            aria-controls={id}
            aria-label={`${expanded ? "Show fewer" : "Show all"} ${label.toLowerCase()}`}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Less" : `+${remaining.length}`}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        )}
      </div>
      {remaining.length > 0 && (
        <div
          id={id}
          className="context-reveal"
          data-expanded={expanded}
          aria-hidden={!expanded}
          inert={!expanded}
        >
          <div>
            <div className="context-names">{remaining.join(", ")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
