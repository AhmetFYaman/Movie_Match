"use client";
import { useId, useState, type CSSProperties } from "react";
import { Disclosure } from "./Disclosure";
import {
  factors,
  labels,
  presets,
  normalizeWeights,
  redistribute,
  type Factor,
  type Weights,
} from "@/lib/scoring";

export function MatchWeights({
  weights,
  available,
  onChange,
  mood = false,
}: {
  weights: Weights;
  available: Record<Factor, boolean>;
  onChange: (weights: Weights) => void;
  mood?: boolean;
}) {
  const [locks, setLocks] = useState<Factor[]>([]);
  const id = useId();
  const visibleFactors = mood
    ? factors.filter((key) => key !== "cast" && key !== "studio")
    : factors;
  return (
    <Disclosure
      className={"weights-panel" + (mood ? " mood-weights" : "")}
      title={mood ? "Advanced preferences" : "Match weights"}
      hint={
        mood
          ? "Choose what matters most"
          : "Advanced · fine-tune your recommendations"
      }
    >
      <div className="preset-row" data-lenis-prevent>
        {Object.entries(presets)
          .filter(([name]) => !mood || name !== "Same people")
          .map(([name, preset]) => (
            <button
              key={name}
              type="button"
              aria-pressed={factors.every(
                (key) =>
                  weights[key] === normalizeWeights(preset, available)[key],
              )}
              onClick={() => {
                setLocks([]);
                onChange(normalizeWeights(preset, available));
              }}
            >
              {name}
            </button>
          ))}
      </div>
      <p className="muted weights-help">
        Lock a value to keep it fixed. The other available weights share the
        remaining percentage. Presets reset locks.
      </p>
      <div className="sliders">
        {visibleFactors.map((key) => {
          const locked = locks.includes(key);
          const canMove =
            available[key] &&
            !locked &&
            factors.some(
              (other) =>
                other !== key && available[other] && !locks.includes(other),
            );
          return (
            <div
              className={
                "weight-control " + (!available[key] ? "unavailable" : "")
              }
              key={key}
            >
              <div className="weight-label">
                <label htmlFor={id + "-weight-" + key}>{labels[key]}</label>
                <output htmlFor={id + "-weight-" + key}>{weights[key]}%</output>
              </div>
              <div className="slider-row">
                <input
                  id={id + "-weight-" + key}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={weights[key]}
                  style={
                    { "--weight-fill": weights[key] + "%" } as CSSProperties
                  }
                  aria-valuetext={weights[key] + "% importance"}
                  disabled={!canMove}
                  aria-describedby={
                    !available[key]
                      ? id + "-missing-" + key
                      : id + "-weight-help"
                  }
                  onChange={(event) =>
                    onChange(
                      redistribute(
                        weights,
                        key,
                        Number(event.target.value),
                        locks,
                        available,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="lock-button"
                  disabled={!available[key]}
                  aria-pressed={locked}
                  aria-label={(locked ? "Unlock " : "Lock ") + labels[key]}
                  onClick={() =>
                    setLocks(
                      locked
                        ? locks.filter((item) => item !== key)
                        : [...locks, key],
                    )
                  }
                >
                  {locked ? "●" : "○"}
                </button>
              </div>
              {available[key] && (
                <div className="weight-scale" aria-hidden="true">
                  <span>Less</span>
                  <span>More</span>
                </div>
              )}
              {!available[key] && (
                <small id={id + "-missing-" + key}>
                  {mood
                    ? "Choose a " +
                      (key === "era"
                        ? "release year"
                        : key === "rating"
                          ? "target rating"
                          : "genre") +
                      " above to use this weight."
                    : "Not available for this movie"}
                </small>
              )}
            </div>
          );
        })}
      </div>
      <div className="weight-split" aria-hidden="true">
        {factors.map((key) => (
          <span
            key={key}
            className={"factor-" + key}
            style={{ width: weights[key] + "%" }}
          />
        ))}
      </div>
      <p className="weight-total" id={id + "-weight-help"}>
        Total: {factors.reduce((sum, key) => sum + weights[key], 0)}% · Changes
        update matches instantly.
      </p>
    </Disclosure>
  );
}
