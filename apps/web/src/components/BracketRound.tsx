import type { Bracket } from '../lib/api';
import { BracketMatch } from './BracketMatch';

interface Props {
  round: number;
  brackets: Bracket[];
  partyId: string;
  isCurrentRound: boolean;
  eligibleVoterCount: number;
}

export function BracketRound({
  round,
  brackets,
  partyId,
  isCurrentRound,
  eligibleVoterCount,
}: Props) {
  const roundClosed = brackets.every((b) => b.winnerId !== null);

  return (
    <div
      className={`rounded-2xl bg-surface p-4 flex flex-col gap-3 ${
        isCurrentRound ? '' : 'opacity-50'
      }`}
    >
      <p className="text-xs text-white/60 uppercase tracking-widest">
        Round {round}
        {isCurrentRound ? ' · current' : ''}
      </p>
      <div className="flex flex-col gap-3">
        {brackets.map((bracket) => (
          <BracketMatch
            key={bracket.id}
            bracket={bracket}
            partyId={partyId}
            roundClosed={roundClosed}
            eligibleVoterCount={eligibleVoterCount}
          />
        ))}
      </div>
    </div>
  );
}
