import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PartyListItem } from "../components/PartyListItem";
import { useMe } from "../hooks/useMe";
import { api } from "../lib/api";

export const Route = createFileRoute("/parties/")({
  component: PartiesPage,
});

function PartiesPage() {
  const { group } = useMe();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ["parties", group?.id],
    queryFn: () => api.parties.list(group!.id),
    enabled: !!group,
  });

  const createMutation = useMutation({
    mutationFn: () => api.parties.create(group!.id),
    onSuccess: (newParty) => {
      queryClient.invalidateQueries({ queryKey: ["parties", group?.id] });
      navigate({ to: "/parties/$partyId", params: { partyId: newParty.id } });
    },
  });

  const sorted = [...parties].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Parties</h1>
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="rounded-xl bg-accent-purple px-4 py-2 text-sm font-medium disabled:opacity-40 transition-opacity"
        >
          {createMutation.isPending ? "Creating…" : "New party"}
        </button>
      </div>

      {isLoading && (
        <p className="text-center text-sm text-white/40 py-8">Loading…</p>
      )}

      {!isLoading && sorted.length === 0 && (
        <p className="text-center text-sm text-white/40 py-8">No parties yet.</p>
      )}

      <ul className="flex flex-col gap-2">
        {sorted.map((p) => (
          <li key={p.id}>
            <PartyListItem party={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}
