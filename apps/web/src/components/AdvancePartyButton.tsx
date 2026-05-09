import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, WatchParty } from '../lib/api';
import { nextStatus } from '../lib/utils';
import { RoundDeadlinePicker } from './RoundDeadlinePicker';
import { STATUS_META } from './StatusBadge';

export function AdvancePartyButton({ party }: { party: WatchParty }) {
  const queryClient = useQueryClient();
  const isCategoryPhase = party.status === 'open_for_category_suggestions';
  const isStartingVote = party.status === 'movie_suggestions_closed';
  const [deadline, setDeadline] = useState<Date | null>(null);

  const { data: categorySuggestions = [] } = useQuery({
    queryKey: ['category-suggestions', party.id],
    queryFn: () => api.categorySuggestions.list(party.id),
    enabled: isCategoryPhase,
  });

  const advanceMutation = useMutation({
    mutationFn: () => {
      if (isStartingVote && deadline) {
        const durationMs = deadline.getTime() - Date.now();
        if (durationMs > 0) return api.parties.advance(party.id, { durationMs });
      }
      return api.parties.advance(party.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['party', party.id] });
      queryClient.invalidateQueries({ queryKey: ['brackets', party.id] });
    },
  });

  const spinMutation = useMutation({
    mutationFn: () => api.parties.categorySpin(party.id),
  });

  const next = nextStatus(party.status);
  if (!next) return null;

  if (isCategoryPhase) {
    const canSpin = categorySuggestions.length > 0;
    return (
      <div className="flex flex-col gap-3">
        <button
          onClick={() => {
            if (
              window.confirm(
                'Spin the wheel to pick a category? This will close the suggestion phase.',
              )
            ) {
              spinMutation.mutate();
            }
          }}
          disabled={!canSpin || spinMutation.isPending}
          className="rounded-xl bg-accent-purple px-4 py-3 text-sm font-medium disabled:opacity-40 transition-opacity"
        >
          {spinMutation.isPending ? 'Spinning…' : '🎰 Spin to pick category'}
        </button>
        {!canSpin && (
          <p className="text-xs text-white/40 text-center">
            Need at least one suggestion to spin.
          </p>
        )}
        {spinMutation.isError && (
          <p className="text-xs text-red-400">{(spinMutation.error as Error).message}</p>
        )}
      </div>
    );
  }

  const nextLabel = STATUS_META[next].label;

  return (
    <div className="flex flex-col gap-3">
      {isStartingVote && (
        <RoundDeadlinePicker value={deadline} onChange={setDeadline} />
      )}

      <button
        onClick={() => {
          if (window.confirm(`Advance to "${nextLabel}"?`)) {
            advanceMutation.mutate();
          }
        }}
        disabled={advanceMutation.isPending}
        className="rounded-xl bg-accent-purple px-4 py-3 text-sm font-medium disabled:opacity-40 transition-opacity"
      >
        {advanceMutation.isPending ? 'Advancing…' : `Advance to "${nextLabel}"`}
      </button>

      {advanceMutation.isError && (
        <p className="text-xs text-red-400">{(advanceMutation.error as Error).message}</p>
      )}
    </div>
  );
}
