import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PartyCard } from '../components/PartyCard';
import { PartyListItem } from '../components/PartyListItem';
import { useMe } from '../hooks/useMe';
import { api } from '../lib/api';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const { user, group, isHost, isLoading: meLoading } = useMe();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: () => api.parties.create(group!.id),
    onSuccess: (newParty) => {
      queryClient.invalidateQueries({ queryKey: ['parties', group?.id] });
      navigate({ to: '/party/$partyId', params: { partyId: newParty.id } });
    },
  });

  const { data: parties, isLoading: partiesLoading } = useQuery({
    queryKey: ['parties', group?.id],
    queryFn: () => api.parties.list(group!.id),
    enabled: !!group,
  });

  const activeParty =
    parties
      ?.filter((p) => p.status !== 'watched')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .at(-1) ?? null;

  const now = Date.now();

  const upcomingParties = (parties ?? [])
    .filter(
      (p) =>
        p.id !== activeParty?.id &&
        p.status !== 'watched' &&
        p.scheduledFor !== null &&
        new Date(p.scheduledFor).getTime() > now,
    )
    .sort((a, b) => a.scheduledFor!.localeCompare(b.scheduledFor!));

  const upcomingIds = new Set(upcomingParties.map((p) => p.id));
  const pastParties = (parties ?? [])
    .filter((p) => p.id !== activeParty?.id && !upcomingIds.has(p.id))
    .sort((a, b) => {
      if (!a.scheduledFor && !b.scheduledFor) return b.createdAt.localeCompare(a.createdAt);
      if (!a.scheduledFor) return 1;
      if (!b.scheduledFor) return -1;
      return b.scheduledFor.localeCompare(a.scheduledFor);
    });

  const { data: partyDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['party', activeParty?.id],
    queryFn: () => api.parties.get(activeParty!.id),
    enabled: !!activeParty,
  });

  const isLoading = meLoading || partiesLoading || (!!activeParty && detailLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-white/60 text-sm">Loading…</div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between pt-2">
        <p className="text-white/60 text-sm">
          Hey, <span className="text-white font-medium">{user.name}</span>
        </p>
        <div className="flex items-center gap-4">
          {isHost && (
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !group}
              className="rounded-full bg-accent-purple px-3 py-1 text-xs font-medium disabled:opacity-40 transition-opacity"
            >
              {createMutation.isPending ? 'Creating…' : '+ New party'}
            </button>
          )}
          <button
            onClick={() => api.auth.logout().then(() => window.location.reload())}
            className="text-white/45 text-xs hover:text-white/60 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {!activeParty || !partyDetail ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-5xl">🎬</p>
          <p className="font-semibold text-white/80">No upcoming party yet</p>
          <p className="text-white/60 text-sm">Your host will set one up soon.</p>
        </div>
      ) : (
        <PartyCard party={partyDetail} />
      )}

      {upcomingParties.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">
            Upcoming
          </h2>
          <ul className="flex flex-col gap-2">
            {upcomingParties.map((p) => (
              <li key={p.id}>
                <PartyListItem party={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {pastParties.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">
            Past parties
          </h2>
          <ul className="flex flex-col gap-2">
            {pastParties.map((p) => (
              <li key={p.id}>
                <PartyListItem party={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
