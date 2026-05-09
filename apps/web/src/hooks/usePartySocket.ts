import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { CategorySpinPayload } from '../lib/api';

export function usePartySocket(partyId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/parties/${partyId}`);

    ws.onmessage = (e) => {
      const event = JSON.parse(e.data) as { type: string };
      if (event.type === 'category_suggestion') {
        queryClient.invalidateQueries({ queryKey: ['category-suggestions', partyId] });
      } else if (event.type === 'movie_suggestion') {
        queryClient.invalidateQueries({ queryKey: ['movie-suggestions', partyId] });
      } else if (event.type === 'category_spin') {
        queryClient.setQueryData<CategorySpinPayload>(
          ['category-spin', partyId],
          event as CategorySpinPayload,
        );
      } else if (event.type === 'round_closed') {
        queryClient.invalidateQueries({ queryKey: ['brackets', partyId] });
        queryClient.invalidateQueries({ queryKey: ['party', partyId] });
        queryClient.invalidateQueries({ queryKey: ['parties'] });
      } else if (event.type === 'round_deadline_changed') {
        queryClient.invalidateQueries({ queryKey: ['brackets', partyId] });
      } else if (event.type === 'vote_cast') {
        queryClient.invalidateQueries({ queryKey: ['brackets', partyId] });
      } else if (event.type === 'party_deleted') {
        queryClient.invalidateQueries({ queryKey: ['parties'] });
        queryClient.removeQueries({ queryKey: ['party', partyId] });
        queryClient.removeQueries({ queryKey: ['brackets', partyId] });
      }
    };

    return () => ws.close();
  }, [partyId, queryClient]);
}
