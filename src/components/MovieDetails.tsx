"use client";
import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import { factors, labels, type scoreMovie, type Movie } from "@/lib/scoring";
import { MovieImage } from "./MovieImage";
import { Icon } from "./Icon";

export function MovieDetails({
  result,
  onClose,
  onSelect,
}: {
  result: ReturnType<typeof scoreMovie>;
  onClose: () => void;
  onSelect: (movie: Movie) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
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
          <div>
            <p className="muted">
              {movie.release_date.slice(0, 4) || "Year unknown"} ·{" "}
              <span className="star">★</span> {movie.vote_average.toFixed(1)}
            </p>
            <h2 id="detail-title">{movie.title}</h2>
            <p className="match-label">{Math.round(match * 100)}% match</p>
          </div>
        </div>
        <p>{movie.overview || "No synopsis is available for this movie."}</p>
        <h3>Why this match?</h3>
        <p className="reason">{reason}</p>
        <div className="breakdown">
          {factors.map((key) => (
            <div key={key}>
              <div>
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
        </div>
        <p className="muted">
          Match = the five similarities multiplied by your weights. It is not a
          prediction of how much you will like the movie.
        </p>
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
