import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, WatchParty } from '../lib/api';
import { nextStatus, WATCH_PARTY_STATUSES } from '../lib/utils';
import { STATUS_META } from './StatusBadge';

export function AdvancePartyButton({ party }: { party: WatchParty }) {
  const queryClient = useQueryClient();
  const isCategoryPhase = party.status === 'open_for_category_suggestions';
  // During voting, "advance" would be voting → movie_selected, which the API rejects in
  // favor of POST /brackets/close-round. The "Close round & advance" button in BracketView
  // is the right way to drive that transition.
  const hideAdvance = party.status === 'voting';

  const { data: categorySuggestions = [] } = useQuery({
    queryKey: ['category-suggestions', party.id],
    queryFn: () => api.categorySuggestions.list(party.id),
    enabled: isCategoryPhase,
  });

  const advanceMutation = useMutation({
    mutationFn: () => api.parties.advance(party.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['party', party.id] });
      queryClient.invalidateQueries({ queryKey: ['brackets', party.id] });
    },
  });

  const spinMutation = useMutation({
    mutationFn: () => api.parties.categorySpin(party.id),
  });

  const backMutation = useMutation({
    mutationFn: () => api.parties.back(party.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['party', party.id] });
      queryClient.invalidateQueries({ queryKey: ['brackets', party.id] });
    },
  });

  const next = nextStatus(party.status);
  const currentIdx = WATCH_PARTY_STATUSES.indexOf(party.status);
  const previous = currentIdx > 0 ? WATCH_PARTY_STATUSES[currentIdx - 1] : null;
  const previousLabel = previous ? STATUS_META[previous].label : null;
  const nextLabel = next ? STATUS_META[next].label : null;

  const canSpin = categorySuggestions.length > 0;

  function handleBack() {
    if (!previousLabel) return;
    if (window.confirm(`Go back to "${previousLabel}"? Some progress may be lost.`)) {
      backMutation.mutate();
    }
  }

  if (!next && !previous) return null;

  return (
    <div className="flex flex-col gap-3">
      {next && isCategoryPhase && (
        <>
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
        </>
      )}

      {next && !isCategoryPhase && !hideAdvance && nextLabel && (
        <>
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
        </>
      )}

      {previous && previousLabel && (
        <button
          type="button"
          onClick={handleBack}
          disabled={backMutation.isPending}
          className="self-start text-xs text-white/40 hover:text-white/70 disabled:opacity-40 transition-colors"
        >
          {backMutation.isPending ? 'Reverting…' : `← Revert to "${previousLabel}"`}
        </button>
      )}

      {backMutation.isError && (
        <p className="text-xs text-red-400">{(backMutation.error as Error).message}</p>
      )}
    </div>
  );
}
