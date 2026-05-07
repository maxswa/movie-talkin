import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AdvancePartyButton } from "../components/AdvancePartyButton";
import { MemberList } from "../components/MemberList";
import { StatusBadge } from "../components/StatusBadge";
import { api, type WatchParty } from "../lib/api";
import { toLocalInputValue } from "../lib/utils";

export const Route = createFileRoute("/parties/$partyId")({
  component: PartyDetailPage,
});

function PartyDetailPage() {
  const { partyId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: party, isLoading } = useQuery({
    queryKey: ["party", partyId],
    queryFn: () => api.parties.get(partyId),
  });

  const updateMutation = useMutation({
    mutationFn: (scheduledFor: string | null) =>
      api.parties.update(partyId, { scheduledFor }),
    onSuccess: (updated) => {
      queryClient.setQueryData<WatchParty>(["party", partyId], (old) =>
        old ? { ...old, ...updated } : updated,
      );
      queryClient.invalidateQueries({ queryKey: ["parties"] });
    },
  });

  function handleDateBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (!value) {
      updateMutation.mutate(null);
    } else {
      updateMutation.mutate(new Date(value).toISOString());
    }
  }

  if (isLoading || !party) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-white/40">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <StatusBadge status={party.status} />
        {updateMutation.isPending && (
          <span className="text-xs text-white/30">Saving…</span>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <label className="text-xs text-white/50">Scheduled date &amp; time</label>
        <input
          type="datetime-local"
          defaultValue={toLocalInputValue(party.scheduledFor)}
          onBlur={handleDateBlur}
          className="rounded-xl bg-white/10 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent-purple/50 [color-scheme:dark]"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Advance stage</h2>
        <AdvancePartyButton party={party} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Members</h2>
        <MemberList members={party.members} />
      </section>
    </div>
  );
}
