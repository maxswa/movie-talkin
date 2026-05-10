import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { usePartySocket } from '../hooks/usePartySocket';
import { useMe } from '../hooks/useMe';
import { api, type CategorySuggestion } from '../lib/api';

function SuggestionRow({
  suggestion,
  isOwn,
  onEdit,
}: {
  suggestion: CategorySuggestion;
  isOwn: boolean;
  onEdit: () => void;
}) {
  return (
    <li
      className={`flex items-center justify-between rounded-xl px-4 py-3 ${
        isOwn ? 'bg-accent-purple/10 ring-1 ring-accent-purple/30' : 'bg-white/5'
      }`}
    >
      <span className="text-sm font-medium">{suggestion.name}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-white/40">{suggestion.suggestedBy.name}</span>
        {isOwn && (
          <button
            onClick={onEdit}
            className="text-xs text-accent-blue hover:text-white transition-colors"
          >
            Edit
          </button>
        )}
      </div>
    </li>
  );
}

export function CategorySuggestions({ partyId }: { partyId: string }) {
  const { user } = useMe();
  const queryClient = useQueryClient();
  usePartySocket(partyId);
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['category-suggestions', partyId],
    queryFn: () => api.categorySuggestions.list(partyId),
  });

  const mutation = useMutation({
    mutationFn: (name: string) => api.categorySuggestions.create(partyId, name),
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: ['category-suggestions', partyId] });
      const previous = queryClient.getQueryData<CategorySuggestion[]>([
        'category-suggestions',
        partyId,
      ]);
      queryClient.setQueryData<CategorySuggestion[]>(
        ['category-suggestions', partyId],
        (old = []) => {
          const without = old.filter((s) => s.suggestedBy.id !== user?.id);
          return [
            ...without,
            {
              id: `temp-${Date.now()}`,
              watchPartyId: partyId,
              suggestedBy: { id: user!.id, name: user!.name },
              name,
              createdAt: new Date().toISOString(),
            },
          ];
        },
      );
      return { previous };
    },
    onError: (_err, _name, context) => {
      queryClient.setQueryData(['category-suggestions', partyId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['category-suggestions', partyId] });
      setEditing(false);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    mutation.mutate(trimmed);
    setInput('');
  }

  const ownSuggestion = suggestions.find((s) => s.suggestedBy.id === user?.id);
  const hasUserSuggested = !!ownSuggestion;

  function startEditing() {
    setInput(ownSuggestion?.name ?? '');
    setEditing(true);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-surface p-5">
      <ul className="flex flex-col gap-2">
        {suggestions.length === 0 && (
          <li className="text-white/30 text-sm text-center py-4">
            No suggestions yet — be the first!
          </li>
        )}
        {suggestions.map((s) => (
          <SuggestionRow
            key={s.id}
            suggestion={s}
            isOwn={s.suggestedBy.id === user?.id}
            onEdit={startEditing}
          />
        ))}
      </ul>

      {(!hasUserSuggested || editing) && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={editing ? 'Update your suggestion…' : 'Suggest a category…'}
            autoFocus={editing}
            className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:ring-2 focus:ring-accent-purple/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || mutation.isPending}
            className="rounded-xl bg-accent-purple px-4 py-3 text-sm font-medium disabled:opacity-40 transition-opacity"
          >
            {editing ? 'Save' : 'Add'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setInput('');
              }}
              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-medium"
            >
              Cancel
            </button>
          )}
        </form>
      )}
    </div>
  );
}
