import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { usePartySocket } from '../hooks/usePartySocket';
import { useMe } from '../hooks/useMe';
import { api } from '../lib/api';
import { MovieSuggestionItem } from './MovieSuggestionItem';

export function MovieSuggestions({ partyId }: { partyId: string }) {
  const { user, isHost } = useMe();
  const [showAll, setShowAll] = useState(false);
  usePartySocket(partyId);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['movie-suggestions', partyId],
    queryFn: () => api.movieSuggestions.list(partyId),
  });

  const ownSuggestion = suggestions.find((s) => s.suggestedBy.id === user?.id);
  const otherSuggestions = suggestions.filter((s) => s.suggestedBy.id !== user?.id);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {!ownSuggestion && !showAll && (
          <li className="text-white/30 text-sm text-center py-4">No movies suggested yet.</li>
        )}
        {ownSuggestion && (
          <MovieSuggestionItem suggestion={ownSuggestion} isOwn partyId={partyId} />
        )}
        {showAll &&
          otherSuggestions.map((s) => (
            <MovieSuggestionItem key={s.id} suggestion={s} isOwn={false} />
          ))}
      </ul>

      {otherSuggestions.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40">
            {otherSuggestions.length}{' '}
            {otherSuggestions.length === 1 ? 'other has' : 'others have'} suggested a movie
          </p>
          {isHost && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs text-accent-blue hover:text-white transition-colors"
            >
              {showAll ? 'Hide' : "See others'"}
            </button>
          )}
        </div>
      )}

      {!ownSuggestion && (
        <Link
          to="/search"
          search={{ partyId }}
          className="block rounded-xl bg-accent-purple py-3 text-sm font-medium text-center"
        >
          Suggest a movie
        </Link>
      )}
    </div>
  );
}
