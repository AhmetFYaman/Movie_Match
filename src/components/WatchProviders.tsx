"use client";
import { basePath } from "@/lib/paths";
import { useEffect, useState } from "react";
type WatchData = {
  groups: { label: string; names: string[] }[];
  link: string | null;
};

export function WatchProviders({ movieId }: { movieId: number }) {
  const [region, setRegion] = useState("US");
  const [data, setData] = useState<WatchData | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${basePath}/api/watch?id=${movieId}&region=${region}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error("Watch options could not load.");
        return body as WatchData;
      })
      .then((body) => {
        if (!controller.signal.aborted) setData(body);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Watch options could not load.");
      });
    return () => controller.abort();
  }, [movieId, region, retry]);
  return (
    <aside className="watch-options" aria-label="Where to watch">
      <div className="watch-heading">
        <span>Where to watch</span>
        <select
          aria-label="Watch country"
          value={region}
          onChange={(event) => {
            setData(null);
            setError("");
            setRegion(event.target.value);
          }}
        >
          {Object.entries({
            US: "US",
            GB: "UK",
            CA: "Canada",
            IN: "India",
            AU: "Australia",
            DE: "Germany",
            FR: "France",
            BR: "Brazil",
            JP: "Japan",
          }).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p role="status">
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              setError("");
              setRetry((value) => value + 1);
            }}
          >
            Retry
          </button>
        </p>
      ) : !data ? (
        <p role="status">Checking availability…</p>
      ) : !data.groups.length ? (
        <p>No availability listed for this country.</p>
      ) : (
        <>
          {data.link ? (
            <a
              className="watch-choice"
              href={data.link}
              target="_blank"
              rel="noreferrer"
              aria-label={`See ${data.groups[0].names[0]} watch options on TMDB`}
            >
              {data.groups[0].names[0]} <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <p className="watch-choice">{data.groups[0].names[0]}</p>
          )}
          <span className="watch-kind">
            {data.groups[0].label} · Suggested option
          </span>
        </>
      )}
      <small>
        Via{" "}
        <a href="https://www.justwatch.com/" target="_blank" rel="noreferrer">
          JustWatch
        </a>{" "}
        / TMDB
      </small>
    </aside>
  );
}
