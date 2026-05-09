import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { CategorySpinPayload } from '../lib/api';

const MAX_BACKOFF_MS = 30_000;

export function usePartySocket(partyId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let attempts = 0;
    let cancelled = false;

    function refetchAll() {
      queryClient.invalidateQueries({ queryKey: ['party', partyId] });
      queryClient.invalidateQueries({ queryKey: ['brackets', partyId] });
      queryClient.invalidateQueries({ queryKey: ['category-suggestions', partyId] });
      queryClient.invalidateQueries({ queryKey: ['movie-suggestions', partyId] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    }

    function scheduleReconnect() {
      if (cancelled) return;
      const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** Math.min(attempts, 6));
      attempts += 1;
      reconnectTimer = window.setTimeout(connect, delay);
    }

    function connect() {
      if (cancelled) return;
      reconnectTimer = null;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/parties/${partyId}`);

      ws.onopen = () => {
        // After (re)connecting, refetch to recover any events we may have missed.
        attempts = 0;
        refetchAll();
      };

      ws.onmessage = (e) => {
        let event: { type: string };
        try {
          event = JSON.parse(e.data) as { type: string };
        } catch {
          return;
        }
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
        } else if (event.type === 'status_changed' || event.type === 'party_updated') {
          queryClient.invalidateQueries({ queryKey: ['party', partyId] });
          queryClient.invalidateQueries({ queryKey: ['brackets', partyId] });
          queryClient.invalidateQueries({ queryKey: ['parties'] });
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        scheduleReconnect();
      };

      ws.onerror = () => {
        // close fires after error; let it handle reconnect
        ws?.close();
      };
    }

    function handleVisibility() {
      if (document.visibilityState !== 'visible') return;
      // If the OS suspended the tab, the socket may have died silently.
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        if (reconnectTimer !== null) {
          window.clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        attempts = 0;
        connect();
      } else if (ws.readyState === WebSocket.OPEN) {
        // Connection still open — refetch in case events fired while backgrounded
        // and the OS dropped them.
        refetchAll();
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    window.addEventListener('online', handleVisibility);
    connect();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('online', handleVisibility);
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, [partyId, queryClient]);
}
