import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { AdvancePartyButton } from '../components/AdvancePartyButton';
import { BracketBreakdowns } from '../components/BracketBreakdowns';
import { BracketTree } from '../components/BracketTree';
import { CategoryHistory } from '../components/CategoryHistory';
import { MemberList } from '../components/MemberList';
import { PartyBody } from '../components/PartyBody';
import { RoundCountdown } from '../components/RoundCountdown';
import { StatusBadge } from '../components/StatusBadge';
import { useMe } from '../hooks/useMe';
import { usePartySocket } from '../hooks/usePartySocket';
import { api, type WatchPartyDetail } from '../lib/api';
import { formatDate, toLocalInputValue } from '../lib/utils';
import { WATCH_PARTY_STATUSES, STATUS_META } from '../lib/constants';

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

  const currentRoundNumber = rounds.length > 0 ? Math.max(...rounds.map((r) => r.round)) : null;
  const currentEndsAt =
    currentRoundNumber != null
      ? (rounds.find((r) => r.round === currentRoundNumber)?.brackets.find((b) => b.roundEndsAt)
          ?.roundEndsAt ?? null)
      : null;

  const deleteMutation = useMutation({
    mutationFn: () => api.parties.delete(partyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.removeQueries({ queryKey: ['party', partyId] });
      queryClient.removeQueries({ queryKey: ['brackets', partyId] });
      router.navigate({ to: '/' });
    },
  });

  const backMutation = useMutation({
    mutationFn: () => api.parties.back(partyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['party', partyId] });
      queryClient.invalidateQueries({ queryKey: ['brackets', partyId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (scheduledFor: string | null) => api.parties.update(partyId, { scheduledFor }),
    onMutate: (scheduledFor) => {
      const previous = queryClient.getQueryData<WatchPartyDetail>(['party', partyId]);
      queryClient.setQueryData<WatchPartyDetail>(['party', partyId], (old) =>
        old ? { ...old, scheduledFor } : old,
      );
      return { previous };
    },
    onError: (_err, _scheduledFor, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['party', partyId], context.previous);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<WatchPartyDetail>(['party', partyId], (old) =>
        old ? { ...old, ...updated } : old,
      );
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    },
  });

  function handleDateBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (!value) {
      updateMutation.mutate(null);
      return;
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) return;
    updateMutation.mutate(date.toISOString());
  }

  if (isLoading || !party) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-white/60">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              router.history.back();
            } else {
              router.navigate({ to: '/' });
            }
          }}
          className="self-start flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          aria-label="Back"
        >
          <span className="text-lg leading-none">←</span>
          Back
        </button>
        <StatusBadge status={party.status} />
      </div>

      <header className="flex flex-col gap-3">
        {updateMutation.isPending && <span className="text-xs text-white/45">Saving…</span>}
        <h1 className="text-2xl font-semibold leading-tight">
          {party.selectedCategory ?? 'Category TBD'}
        </h1>
        {isHost ? (
          <input
            key={party.scheduledFor ?? 'empty'}
            type="datetime-local"
            defaultValue={toLocalInputValue(party.scheduledFor)}
            onBlur={handleDateBlur}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent-purple/50 [color-scheme:dark]"
          />
        ) : (
          party.scheduledFor && (
            <p className="text-sm text-white/70">📅 {formatDate(party.scheduledFor)}</p>
          )
        )}
        {party.status === 'voting' && currentEndsAt && <RoundCountdown endsAt={currentEndsAt} />}
      </header>

      {isHost && <AdvancePartyButton party={party} />}

      <PartyBody party={party} />

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

      {isHost && (
        <section className="flex flex-col gap-2 pt-4 border-t border-white/5">
          <h2 className="text-sm font-semibold text-red-400/80 uppercase tracking-wide">
            Danger zone
          </h2>
          {(() => {
            const idx = WATCH_PARTY_STATUSES.indexOf(party.status);
            const previous = idx > 0 ? WATCH_PARTY_STATUSES[idx - 1] : null;
            const previousLabel = previous ? STATUS_META[previous].label : null;
            if (!previous || !previousLabel) return null;
            return (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Revert to "${previousLabel}"? Some progress may be lost.`)) {
                    backMutation.mutate();
                  }
                }}
                disabled={backMutation.isPending}
                className="self-start rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/15 disabled:opacity-40 transition-colors"
              >
                {backMutation.isPending ? 'Reverting…' : `← Revert to "${previousLabel}"`}
              </button>
            );
          })()}
          {backMutation.isError && (
            <p className="text-xs text-red-400">{(backMutation.error as Error).message}</p>
          )}
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  'Delete this party? All suggestions, brackets, and votes will be permanently removed.',
                )
              ) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="self-start rounded-xl bg-red-500/15 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/25 disabled:opacity-40 transition-colors"
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete party'}
          </button>
          {deleteMutation.isError && (
            <p className="text-xs text-red-400">{(deleteMutation.error as Error).message}</p>
          )}
        </section>
      )}
    </div>
  );
}
