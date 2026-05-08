import { Link } from '@tanstack/react-router';
import type { WatchPartyDetail } from '../lib/api';
import { formatDate } from '../lib/utils';
import { PartyBody } from './PartyBody';
import { StatusBadge } from './StatusBadge';

const INTERACTIVE_STATUSES = new Set([
  'open_for_category_suggestions',
  'open_for_movie_suggestions',
  'voting',
]);

export function PartyCard({ party }: { party: WatchPartyDetail }) {
  const interactiveBody = INTERACTIVE_STATUSES.has(party.status);
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

      <div className={interactiveBody ? 'relative' : undefined}>
        <PartyBody party={party} />
      </div>
    </div>
  );
}
