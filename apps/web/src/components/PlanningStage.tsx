import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useMe } from '../hooks/useMe';
import { api, type WatchPartyDetail } from '../lib/api';
import { toLocalInputValue } from '../lib/utils';
import { DurationPicker, formatDuration } from './DurationPicker';
import { MovieSuggestionItem } from './MovieSuggestionItem';

export function PlanningStage({ party }: { party: WatchPartyDetail }) {
  const { isHost } = useMe();
  const queryClient = useQueryClient();

  const { data: suggestions = [] } = useQuery({
    queryKey: ['movie-suggestions', party.id],
    queryFn: () => api.movieSuggestions.list(party.id),
  });

  const updateMutation = useMutation({
    mutationFn: (patch: { votingStartsAt?: string | null; votingDurationMs?: number | null }) =>
      api.parties.update(party.id, patch),
    onMutate: (patch) => {
      const previous = queryClient.getQueryData<WatchPartyDetail>(['party', party.id]);
      queryClient.setQueryData<WatchPartyDetail>(['party', party.id], (old) =>
        old ? { ...old, ...patch } : old,
      );
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['party', party.id], context.previous);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<WatchPartyDetail>(['party', party.id], (old) =>
        old ? { ...old, ...updated } : old,
      );
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    },
  });

  function handleStartsAtChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (!value) {
      updateMutation.mutate({ votingStartsAt: null });
      return;
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) return;
    updateMutation.mutate({ votingStartsAt: date.toISOString() });
  }
  console.log({ duration: party.votingDurationMs });
  return (
    <div className="flex flex-col gap-4">
      {isHost ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-white/50">Voting starts at</span>
            <input
              key={party.votingStartsAt ?? 'empty'}
              type="datetime-local"
              defaultValue={toLocalInputValue(party.votingStartsAt)}
              onChange={handleStartsAtChange}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent-purple/50 [color-scheme:dark]"
            />
            <span className="text-[11px] text-white/40">
              When this time hits, voting opens automatically.
            </span>
          </label>
          <DurationPicker
            value={party.votingDurationMs}
            onChange={(votingDurationMs) => updateMutation.mutate({ votingDurationMs })}
            label="Round duration"
            helperText="Each round of voting will run for this long, then auto-close."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <VotingCountdown startsAt={party.votingStartsAt} />
          {party.votingDurationMs && (
            <p className="text-xs text-white/40 text-center">
              Each round will last {formatDuration(party.votingDurationMs)}.
            </p>
          )}
        </div>
      )}

      <section className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wide">
          Movie suggestions
        </h3>
        {suggestions.length === 0 ? (
          <p className="text-sm text-white/40 py-2">No suggestions.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {suggestions.map((s) => (
              <MovieSuggestionItem key={s.id} suggestion={s} isOwn={false} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function VotingCountdown({ startsAt }: { startsAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startsAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startsAt]);

  if (!startsAt) {
    return (
      <div className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/50 text-center">
        Voting will open soon.
      </div>
    );
  }

  const remaining = new Date(startsAt).getTime() - now;
  if (remaining <= 0) {
    return (
      <div className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/50 text-center">
        ⏱ Opening voting…
      </div>
    );
  }

  const totalSec = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatted =
    hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;

  return (
    <div className="rounded-xl bg-accent-purple/15 px-4 py-3 text-sm text-white text-center">
      🎬 Voting opens in <span className="font-mono font-semibold">{formatted}</span>
    </div>
  );
}
