"use client";
import Image from "next/image";
import { useState } from "react";

export function HeroBackdrop({ path }: { path: string | null | undefined }) {
  const [current, setCurrent] = useState(path);
  const [previous, setPrevious] = useState<string | null | undefined>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  // Keep one previous image underneath the new image for a real crossfade.
  if (path !== current) {
    setPrevious(current);
    setCurrent(path);
  }
  return (
    <div className="hero-backdrop" aria-hidden="true">
      {previous && (
        <Image
          src={"https://image.tmdb.org/t/p/original" + previous}
          alt=""
          fill
          sizes="100vw"
          className="backdrop-previous"
        />
      )}
      {current && (
        <Image
          key={current}
          src={"https://image.tmdb.org/t/p/original" + current}
          alt=""
          fill
          sizes="100vw"
          className={
            "backdrop-current " + (loaded === current ? "is-loaded" : "")
          }
          loading="eager"
          onLoad={() => setLoaded(current)}
        />
      )}
      <div className="backdrop-shade" />
    </div>
  );
}
