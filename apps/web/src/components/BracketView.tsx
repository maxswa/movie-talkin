import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useMe } from '../hooks/useMe';
import { api, type WatchParty } from '../lib/api';
import { BracketRound } from './BracketRound';
import { DurationPicker } from './DurationPicker';

export function BracketView({ party }: { party: WatchParty }) {
  const partyId = party.id;
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

  const updateDurationMutation = useMutation({
    mutationFn: (votingDurationMs: number | null) =>
      api.parties.update(partyId, { votingDurationMs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party', partyId] });
      queryClient.invalidateQueries({ queryKey: ['brackets', partyId] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    },
  });

  const currentRound = rounds.length > 0 ? Math.max(...rounds.map((r) => r.round)) : null;
  const currentRoundData =
    currentRound != null ? rounds.find((r) => r.round === currentRound) : null;
  const currentEndsAt = currentRoundData?.brackets.find((b) => b.roundEndsAt)?.roundEndsAt ?? null;

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
    <div className="flex flex-col gap-4">
      {isHost && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Close this round? Votes will be tallied and the next round will begin.',
                )
              ) {
                closeRoundMutation.mutate();
              }
            }}
            disabled={closeRoundMutation.isPending}
            className="rounded-xl bg-accent-purple px-4 py-3 text-sm font-medium disabled:opacity-40 transition-opacity"
          >
            {closeRoundMutation.isPending ? 'Closing…' : 'Close round & advance'}
          </button>
          <DurationPicker
            value={party.votingDurationMs}
            onChange={(votingDurationMs) => updateDurationMutation.mutate(votingDurationMs)}
            label="Round duration"
            helperText="Updates the current round's deadline and applies to future rounds."
          />
          {updateDurationMutation.isPending && (
            <p className="text-xs text-white/30">Saving duration…</p>
          )}
          {closeRoundMutation.isError && (
            <p className="text-xs text-red-400">{(closeRoundMutation.error as Error).message}</p>
          )}
        </div>
      )}

      {[...rounds]
        .sort((a, b) => b.round - a.round)
        .map(({ round, brackets, eligibleVoterCount }) => (
          <BracketRound
            key={round}
            round={round}
            brackets={brackets}
            partyId={partyId}
            isCurrentRound={round === currentRound}
            eligibleVoterCount={eligibleVoterCount}
          />
        ))}
    </div>
  );
}
