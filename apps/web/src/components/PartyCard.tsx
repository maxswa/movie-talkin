import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { api, type WatchPartyDetail } from '../lib/api';
import { formatDate } from '../lib/utils';
import { PartyBody } from './PartyBody';
import { RoundCountdown } from './RoundCountdown';
import { StatusBadge } from './StatusBadge';

const INTERACTIVE_STATUSES = new Set([
  'open_for_category_suggestions',
  'open_for_movie_suggestions',
  'voting',
]);

export function PartyCard({ party }: { party: WatchPartyDetail }) {
  const interactiveBody = INTERACTIVE_STATUSES.has(party.status);
  const isVoting = party.status === 'voting';

  const { data: rounds = [] } = useQuery({
    queryKey: ['brackets', party.id],
    queryFn: () => api.brackets.list(party.id),
    enabled: isVoting,
  });

  const currentRoundNumber = rounds.length > 0 ? Math.max(...rounds.map((r) => r.round)) : null;
  const currentEndsAt =
    currentRoundNumber != null
      ? rounds
          .find((r) => r.round === currentRoundNumber)
          ?.brackets.find((b) => b.roundEndsAt)?.roundEndsAt ?? null
      : null;

  return (
    <div className="relative rounded-2xl bg-surface p-5 flex flex-col gap-4">
      <Link
        to="/party/$partyId"
        params={{ partyId: party.id }}
        aria-label={`Open ${party.selectedCategory ?? 'party'} details`}
        className="flex items-start justify-between gap-3 before:absolute before:inset-0 before:rounded-2xl before:transition-colors hover:before:bg-white/[0.03]"
      >
        <p className="font-semibold">{party.selectedCategory || 'Category TBD'}</p>
        <StatusBadge status={party.status} />
      </Link>

      {party.scheduledFor && (
        <p className="text-white/50 text-sm">📅 {formatDate(party.scheduledFor)}</p>
      )}

      {isVoting && currentEndsAt && <RoundCountdown endsAt={currentEndsAt} />}

      <div className={interactiveBody ? 'relative' : undefined}>
        <PartyBody party={party} />
      </div>
    </div>
  );
}
