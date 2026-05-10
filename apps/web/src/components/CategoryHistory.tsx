import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function CategoryHistory({
  partyId,
  selectedCategory,
}: {
  partyId: string;
  selectedCategory: string | null;
}) {
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['category-suggestions', partyId],
    queryFn: () => api.categorySuggestions.list(partyId),
  });

  if (isLoading) {
    return <p className="text-white/45 text-sm text-center py-3">Loading…</p>;
  }

  if (suggestions.length === 0) {
    return <p className="text-white/45 text-sm text-center py-3">No suggestions.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {suggestions.map((s) => {
        const isSelected = selectedCategory != null && s.name === selectedCategory;
        return (
          <li
            key={s.id}
            className={`flex items-center justify-between rounded-xl px-4 py-3 ${
              isSelected ? 'bg-accent-purple/15 ring-1 ring-accent-purple/40' : 'bg-white/5'
            }`}
          >
            <span className="text-sm font-medium">{s.name}</span>
            <span className="text-xs text-white/60">{s.suggestedBy.name}</span>
          </li>
        );
      })}
    </ul>
  );
}
