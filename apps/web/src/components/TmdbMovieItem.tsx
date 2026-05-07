import { tmdbImageUrl, type TmdbMovie } from "../lib/api";

interface Props {
  movie: TmdbMovie;
  onSelect: (movie: TmdbMovie) => void;
  disabled?: boolean;
}

export function TmdbMovieItem({ movie, onSelect, disabled }: Props) {
  const poster = tmdbImageUrl(movie.posterPath, "w92");
  return (
    <li>
      <button
        onClick={() => onSelect(movie)}
        disabled={disabled}
        className="w-full flex items-center gap-3 rounded-xl bg-white/5 p-3 text-left hover:bg-white/10 transition-colors disabled:opacity-40"
      >
        {poster ? (
          <img src={poster} alt={movie.title} className="w-10 h-14 object-cover rounded-lg shrink-0" />
        ) : (
          <div className="w-10 h-14 rounded-lg bg-white/10 shrink-0" />
        )}
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-medium truncate">{movie.title}</p>
          {movie.releaseYear && (
            <p className="text-xs text-white/40">{movie.releaseYear}</p>
          )}
        </div>
      </button>
    </li>
  );
}
