import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { TmdbMovieItem } from '../components/TmdbMovieItem';
import { api, type TmdbMovie } from '../lib/api';

export const Route = createFileRoute('/search')({
  validateSearch: (search: Record<string, unknown>) => ({
    partyId: (search.partyId as string) ?? '',
  }),
  component: Search,
});

function Search() {
  const { partyId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [] } = useQuery({
    queryKey: ['tmdb-search', debouncedQuery],
    queryFn: () => api.tmdb.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const mutation = useMutation({
    mutationFn: (tmdbId: number) => api.movieSuggestions.create(partyId, tmdbId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie-suggestions', partyId] });
      if (partyId) {
        navigate({ to: '/party/$partyId', params: { partyId }, replace: true });
      } else {
        navigate({ to: '/', replace: true });
      }
    },
  });

  function handleSelect(movie: TmdbMovie) {
    mutation.mutate(movie.id);
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => {
            if (partyId) {
              navigate({ to: '/party/$partyId', params: { partyId }, replace: true });
            } else {
              navigate({ to: '/', replace: true });
            }
          }}
          className="text-white/70 hover:text-white transition-colors text-xl leading-none"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="font-semibold">Search Movies</h1>
      </div>

      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a movie…"
        className="rounded-xl bg-white/10 px-4 py-3 text-sm placeholder:text-white/45 outline-none focus:ring-2 focus:ring-accent-purple/50"
      />

      {results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((movie) => (
            <TmdbMovieItem
              key={movie.id}
              movie={movie}
              onSelect={handleSelect}
              disabled={mutation.isPending}
            />
          ))}
        </ul>
      )}

      {debouncedQuery.length >= 2 && results.length === 0 && (
        <p className="text-white/45 text-sm text-center py-4">No results found.</p>
      )}
    </div>
  );
}
