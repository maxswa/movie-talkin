import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useMe } from "../hooks/useMe";
import { api, type CategorySuggestion } from "../lib/api";

export function CategorySuggestions({ partyId }: { partyId: string }) {
  const { user } = useMe();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");

  const { data: suggestions = [] } = useQuery({
    queryKey: ["category-suggestions", partyId],
    queryFn: () => api.categorySuggestions.list(partyId),
  });

  const mutation = useMutation({
    mutationFn: (name: string) => api.categorySuggestions.create(partyId, name),
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: ["category-suggestions", partyId] });
      const previous = queryClient.getQueryData<CategorySuggestion[]>(["category-suggestions", partyId]);
      queryClient.setQueryData<CategorySuggestion[]>(["category-suggestions", partyId], (old = []) => [
        ...old,
        {
          id: `temp-${Date.now()}`,
          watchPartyId: partyId,
          suggestedBy: { id: user!.id, name: user!.name },
          name,
          createdAt: new Date().toISOString(),
        },
      ]);
      return { previous };
    },
    onError: (_err, _name, context) => {
      queryClient.setQueryData(["category-suggestions", partyId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["category-suggestions", partyId] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    mutation.mutate(trimmed);
    setInput("");
  }

  const hasUserSuggested = suggestions.some((s) => s.suggestedBy.id === user?.id);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {suggestions.length === 0 && (
          <li className="text-white/30 text-sm text-center py-4">
            No suggestions yet — be the first!
          </li>
        )}
        {suggestions.map((s) => (
          <li
            key={s.id}
            className={`flex items-center justify-between rounded-xl px-4 py-3 ${
              s.suggestedBy.id === user?.id
                ? "bg-accent-purple/10 ring-1 ring-accent-purple/30"
                : "bg-white/5"
            }`}
          >
            <span className="text-sm font-medium">{s.name}</span>
            <span className="text-xs text-white/40">{s.suggestedBy.name}</span>
          </li>
        ))}
      </ul>

      {!hasUserSuggested && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Suggest a category…"
            className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:ring-2 focus:ring-accent-purple/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || mutation.isPending}
            className="rounded-xl bg-accent-purple px-4 py-3 text-sm font-medium disabled:opacity-40 transition-opacity"
          >
            Add
          </button>
        </form>
      )}
    </div>
  );
}
