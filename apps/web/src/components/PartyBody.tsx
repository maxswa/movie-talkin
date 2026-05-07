import { tmdbImageUrl, type WatchPartyDetail } from "../lib/api";

export function PartyBody({ party }: { party: WatchPartyDetail }) {
  switch (party.status) {
    case "draft":
      return (
        <p className="text-white/40 text-sm text-center py-8">
          Your host is planning the next party…
        </p>
      );

    case "open_for_category_suggestions":
      return (
        <p className="text-white/40 text-sm text-center py-8">
          Category suggestions are open.
        </p>
      );

    case "category_suggestions_closed":
      return (
        <div className="flex flex-col items-center gap-3 py-6">
          <p className="text-white/40 text-xs uppercase tracking-widest">Category</p>
          <span className="rounded-full bg-accent-purple/20 text-accent-purple px-5 py-2 text-sm font-medium">
            {party.selectedCategory}
          </span>
          <p className="text-white/40 text-sm mt-1">Movie suggestions opening soon…</p>
        </div>
      );

    case "open_for_movie_suggestions":
      return (
        <p className="text-white/40 text-sm text-center py-8">
          Movie suggestions are open.
        </p>
      );

    case "movie_suggestions_closed":
      return (
        <p className="text-white/40 text-sm text-center py-8">
          Suggestions are in — voting coming soon.
        </p>
      );

    case "voting":
      return (
        <p className="text-white/40 text-sm text-center py-8">
          Voting is open!
        </p>
      );

    case "movie_selected": {
      const movie = party.winningSuggestion;
      if (!movie) return null;
      const poster = tmdbImageUrl(movie.posterPath);
      return (
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="text-white/40 text-xs uppercase tracking-widest">Tonight's pick</p>
          {poster && (
            <img src={poster} alt={movie.title} className="w-36 rounded-xl shadow-2xl" />
          )}
          <div className="text-center">
            <p className="font-semibold text-lg leading-snug">{movie.title}</p>
            {movie.releaseYear && (
              <p className="text-white/40 text-sm">{movie.releaseYear}</p>
            )}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
