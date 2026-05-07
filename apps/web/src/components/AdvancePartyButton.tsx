import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, WatchParty } from '../lib/api';
import { nextStatus } from '../lib/utils';
import { STATUS_META } from './StatusBadge';

export function AdvancePartyButton({ party }: { party: WatchParty }) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const next = nextStatus(party.status);
  const needsCategoryPick = party.status === 'open_for_category_suggestions';

  const { data: categorySuggestions = [] } = useQuery({
    queryKey: ['category-suggestions', party.id],
    queryFn: () => api.categorySuggestions.list(party.id),
    enabled: needsCategoryPick,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.parties.advance(
        party.id,
        needsCategoryPick && selectedCategory ? { selectedCategory } : {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['party', party.id] });
    },
  });

  if (!next) return null;

  const nextLabel = STATUS_META[next].label;
  const canAdvance =
    !needsCategoryPick || (categorySuggestions.length > 0 && selectedCategory !== '');

  return (
    <div className="flex flex-col gap-3">
      {needsCategoryPick && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/50">Select winning category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent-purple/50"
          >
            <option value="">— pick one —</option>
            {categorySuggestions.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={!canAdvance || mutation.isPending}
        className="rounded-xl bg-accent-purple px-4 py-3 text-sm font-medium disabled:opacity-40 transition-opacity"
      >
        {mutation.isPending ? 'Advancing…' : `Advance to "${nextLabel}"`}
      </button>

      {mutation.isError && (
        <p className="text-xs text-red-400">{(mutation.error as Error).message}</p>
      )}
    </div>
  );
}
