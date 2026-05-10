import { Link } from '@tanstack/react-router';
import { tmdbImageUrl, type MovieSuggestion } from '../lib/api';

interface Props {
  suggestion: MovieSuggestion;
  isOwn: boolean;
  partyId?: string;
}

export function MovieSuggestionItem({ suggestion, isOwn, partyId }: Props) {
  const poster = tmdbImageUrl(suggestion.posterPath, 'w92');
  return (
    <li
      className={`flex items-center gap-3 rounded-xl p-3 ${
        isOwn ? 'bg-accent-purple/10 ring-1 ring-accent-purple/30' : 'bg-white/5'
      }`}
    >
      {poster ? (
        <img
          src={poster}
          alt={suggestion.title}
          className="w-10 h-14 object-cover rounded-lg shrink-0"
        />
      ) : (
        <div className="w-10 h-14 rounded-lg bg-white/10 shrink-0" />
      )}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{suggestion.title}</p>
        {suggestion.releaseYear && (
          <p className="text-xs text-white/60">{suggestion.releaseYear}</p>
        )}
        <p className="text-xs text-white/60">{suggestion.suggestedBy.name}</p>
      </div>
      {isOwn && partyId && (
        <Link
          to="/search"
          search={{ partyId }}
          replace
          className="shrink-0 text-xs text-accent-blue hover:text-white transition-colors"
        >
          Change
        </Link>
      )}
    </li>
  );
}
