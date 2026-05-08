import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useMe } from '../hooks/useMe';
import { api } from '../lib/api';
import { BracketRound } from './BracketRound';
import { RoundDeadlinePicker } from './RoundDeadlinePicker';

export function BracketView({ partyId }: { partyId: string }) {
  const { isHost } = useMe();
  const queryClient = useQueryClient();

  const { data: rounds = [] } = useQuery({
    queryKey: ['brackets', partyId],
    queryFn: () => api.brackets.list(partyId),
  });

  const closeRoundMutation = useMutation({
    mutationFn: () => api.brackets.closeRound(partyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brackets', partyId] });
      queryClient.invalidateQueries({ queryKey: ['party', partyId] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    },
  });

  const setDeadlineMutation = useMutation({
    mutationFn: (date: Date | null) =>
      api.brackets.setRoundDeadline(partyId, date ? date.toISOString() : null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brackets', partyId] });
    },
  });

  const currentRound = rounds.length > 0 ? Math.max(...rounds.map((r) => r.round)) : null;
  const currentRoundData = currentRound != null ? rounds.find((r) => r.round === currentRound) : null;
  const currentEndsAt = currentRoundData?.brackets.find((b) => b.roundEndsAt)?.roundEndsAt ?? null;
  const currentDeadline = currentEndsAt ? new Date(currentEndsAt) : null;

  useEffect(() => {
    if (!currentEndsAt) return;
    const ms = new Date(currentEndsAt).getTime() - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['brackets', partyId] });
      queryClient.invalidateQueries({ queryKey: ['party', partyId] });
    }, ms + 1500);
    return () => clearTimeout(t);
  }, [currentEndsAt, partyId, queryClient]);

  if (rounds.length === 0) {
    return <p className="text-white/40 text-sm text-center py-8">Brackets are being set up…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {rounds.map(({ round, brackets }) => (
        <BracketRound
          key={round}
          round={round}
          brackets={brackets}
          partyId={partyId}
          isCurrentRound={round === currentRound}
        />
      ))}

      {isHost && (
        <div className="flex flex-col gap-3">
          <RoundDeadlinePicker
            value={currentDeadline}
            onChange={(date) => setDeadlineMutation.mutate(date)}
            label="Round ends at"
          />
          {setDeadlineMutation.isPending && (
            <p className="text-xs text-white/30">Saving deadline…</p>
          )}
          <button
            onClick={() => closeRoundMutation.mutate()}
            disabled={closeRoundMutation.isPending}
            className="rounded-xl bg-accent-purple px-4 py-3 text-sm font-medium disabled:opacity-40 transition-opacity"
          >
            {closeRoundMutation.isPending ? 'Closing…' : 'Close round & advance'}
          </button>
        </div>
      )}

      {closeRoundMutation.isError && (
        <p className="text-xs text-red-400">{(closeRoundMutation.error as Error).message}</p>
      )}
    </div>
  );
}
