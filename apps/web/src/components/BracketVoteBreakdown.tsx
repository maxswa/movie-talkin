import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type Bracket } from '../lib/api';

export function BracketVoteBreakdown({
  partyId,
  bracket,
}: {
  partyId: string;
  bracket: Bracket;
}) {
  const [open, setOpen] = useState(false);

  const { data: votes = [], isLoading } = useQuery({
    queryKey: ['bracket-votes', bracket.id],
    queryFn: () => api.brackets.votes(partyId, bracket.id),
    enabled: open,
  });

  const votersFor = (suggestionId: string) =>
    votes.filter((v) => v.votedFor === suggestionId).map((v) => v.name);

  const aVoters = votersFor(bracket.suggestionA.id);
  const bVoters = votersFor(bracket.suggestionB.id);

  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-medium text-white/40 hover:text-white/70 transition-colors"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
        {open ? 'Hide vote breakdown' : 'Show vote breakdown'}
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2 text-xs">
          {isLoading ? (
            <p className="text-white/30">Loading…</p>
          ) : (
            <>
              <VoterRow title={bracket.suggestionA.title} voters={aVoters} />
              <VoterRow title={bracket.suggestionB.title} voters={bVoters} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function VoterRow({ title, voters }: { title: string; voters: string[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-white/50 truncate">{title}</p>
      {voters.length === 0 ? (
        <p className="text-white/30 italic">No votes</p>
      ) : (
        <p className="text-white/70">{voters.join(', ')}</p>
      )}
    </div>
  );
}
