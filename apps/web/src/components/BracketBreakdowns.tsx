import type { Bracket, BracketRound } from '../lib/api';
import { BracketVoteBreakdown } from './BracketVoteBreakdown';

export function BracketBreakdowns({
  partyId,
  rounds,
}: {
  partyId: string;
  rounds: BracketRound[];
}) {
  const resolvedRounds = rounds
    .map(({ round, brackets }) => ({
      round,
      brackets: brackets.filter(
        (b) => b.winnerId !== null && b.suggestionA.id !== b.suggestionB.id,
      ),
    }))
    .filter((r) => r.brackets.length > 0)
    .sort((a, b) => b.round - a.round);

  if (resolvedRounds.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {resolvedRounds.map(({ round, brackets }) => (
        <div key={round} className="flex flex-col gap-2">
          <p className="text-xs text-white/60 uppercase tracking-widest">Round {round}</p>
          {brackets.map((bracket) => (
            <BreakdownRow key={bracket.id} partyId={partyId} bracket={bracket} />
          ))}
        </div>
      ))}
    </div>
  );
}

function BreakdownRow({ partyId, bracket }: { partyId: string; bracket: Bracket }) {
  const aWon = bracket.winnerId === bracket.suggestionA.id;
  return (
    <div className="rounded-xl bg-surface p-3">
      <div className="flex items-center gap-2 text-sm">
        <span className={`flex-1 truncate ${aWon ? 'font-semibold' : 'text-white/70'}`}>
          {bracket.suggestionA.title}
          <span className="text-white/60 ml-1">({bracket.voteCountA})</span>
        </span>
        <span className="text-white/45 text-xs shrink-0">vs</span>
        <span className={`flex-1 truncate text-right ${aWon ? 'text-white/70' : 'font-semibold'}`}>
          {bracket.suggestionB.title}
          <span className="text-white/60 ml-1">({bracket.voteCountB})</span>
        </span>
      </div>
      <BracketVoteBreakdown partyId={partyId} bracket={bracket} />
    </div>
  );
}
