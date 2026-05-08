import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { AdvancePartyButton } from '../components/AdvancePartyButton';
import { BracketBreakdowns } from '../components/BracketBreakdowns';
import { BracketTree } from '../components/BracketTree';
import { CategoryHistory } from '../components/CategoryHistory';
import { MemberList } from '../components/MemberList';
import { PartyBody } from '../components/PartyBody';
import { StatusBadge } from '../components/StatusBadge';
import { useMe } from '../hooks/useMe';
import { usePartySocket } from '../hooks/usePartySocket';
import { api, type WatchParty } from '../lib/api';
import { formatDate, toLocalInputValue } from '../lib/utils';

export const Route = createFileRoute('/party/$partyId')({
  component: PartyDetailPage,
});

function PartyDetailPage() {
  const { partyId } = Route.useParams();
  const { isHost } = useMe();
  const router = useRouter();
  const queryClient = useQueryClient();
  usePartySocket(partyId);

  const { data: party, isLoading } = useQuery({
    queryKey: ['party', partyId],
    queryFn: () => api.parties.get(partyId),
  });

  const { data: rounds = [] } = useQuery({
    queryKey: ['brackets', partyId],
    queryFn: () => api.brackets.list(partyId),
  });

  const updateMutation = useMutation({
    mutationFn: (scheduledFor: string | null) => api.parties.update(partyId, { scheduledFor }),
    onSuccess: (updated) => {
      queryClient.setQueryData<WatchParty>(['party', partyId], (old) =>
        old ? { ...old, ...updated } : updated,
      );
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    },
  });

  function handleDateBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value;
    updateMutation.mutate(value ? new Date(value).toISOString() : null);
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
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) {
            router.history.back();
          } else {
            router.navigate({ to: '/' });
          }
        }}
        className="self-start flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        aria-label="Back"
      >
        <span className="text-lg leading-none">←</span>
        Back
      </button>

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <StatusBadge status={party.status} />
          {updateMutation.isPending && <span className="text-xs text-white/30">Saving…</span>}
        </div>
        <h1 className="text-2xl font-semibold leading-tight">
          {party.selectedCategory ?? 'Category TBD'}
        </h1>
        {isHost ? (
          <input
            type="datetime-local"
            defaultValue={toLocalInputValue(party.scheduledFor)}
            onBlur={handleDateBlur}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent-purple/50 [color-scheme:dark]"
          />
        ) : (
          party.scheduledFor && (
            <p className="text-sm text-white/50">📅 {formatDate(party.scheduledFor)}</p>
          )
        )}
      </header>

      {isHost && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">
            Advance stage
          </h2>
          <AdvancePartyButton party={party} />
        </section>
      )}

      <section className="rounded-2xl bg-surface p-5">
        <PartyBody party={party} />
      </section>

      {rounds.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Bracket</h2>
          <BracketTree rounds={rounds} />
        </section>
      )}

      {isHost && rounds.length > 0 && party.status !== 'voting' && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">
            Vote breakdowns
          </h2>
          <BracketBreakdowns partyId={partyId} rounds={rounds} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">
          Category suggestions
        </h2>
        <CategoryHistory partyId={partyId} selectedCategory={party.selectedCategory} />
      </section>

      {isHost && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Members</h2>
          <MemberList members={party.members} />
        </section>
      )}
    </div>
  );
}
