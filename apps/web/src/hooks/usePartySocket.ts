import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function usePartySocket(partyId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/parties/${partyId}`);

    ws.onmessage = (e) => {
      const { type } = JSON.parse(e.data) as { type: string };
      if (type === 'category_suggestion') {
        queryClient.invalidateQueries({ queryKey: ['category-suggestions', partyId] });
      } else if (type === 'movie_suggestion') {
        queryClient.invalidateQueries({ queryKey: ['movie-suggestions', partyId] });
      }
    };

    return () => ws.close();
  }, [partyId, queryClient]);
}
