import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMe } from '../hooks/useMe';
import { api } from '../lib/api';
import { BracketRound } from './BracketRound';

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
      queryClient.invalidateQueries({ queryKey: ['activeParty'] });
    },
  });

  if (rounds.length === 0) {
    return <p className="text-white/40 text-sm text-center py-8">Brackets are being set up…</p>;
  }

  const currentRound = Math.max(...rounds.map((r) => r.round));

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
        <button
          onClick={() => closeRoundMutation.mutate()}
          disabled={closeRoundMutation.isPending}
          className="rounded-xl bg-accent-purple px-4 py-3 text-sm font-medium disabled:opacity-40 transition-opacity"
        >
          {closeRoundMutation.isPending ? 'Closing…' : 'Close round & advance'}
        </button>
      )}

      {closeRoundMutation.isError && (
        <p className="text-xs text-red-400">{(closeRoundMutation.error as Error).message}</p>
      )}
    </div>
  );
}
