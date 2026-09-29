import Image from "next/image";
import type { Movie } from "@/lib/scoring";

export function MovieImage({
  movie,
  small = false,
}: {
  movie: Movie;
  small?: boolean;
}) {
  return (
    <span className={small ? "thumbnail" : "poster-image"}>
      {movie.poster_path ? (
        <Image
          src={"https://image.tmdb.org/t/p/w342" + movie.poster_path}
          alt=""
          fill
          sizes={
            small
              ? "40px"
              : "(max-width: 539px) 45vw, (max-width: 759px) 30vw, (max-width: 999px) 23vw, (max-width: 1239px) 18vw, 210px"
          }
          onError={(event) => {
            event.currentTarget.style.opacity = "0";
          }}
        />
      ) : (
        <span className="missing-poster">No poster</span>
      )}
    </span>
  );
}
