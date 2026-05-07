import type { Bracket } from "../lib/api";
import { BracketMatch } from "./BracketMatch";

interface Props {
  round: number;
  brackets: Bracket[];
  partyId: string;
  isCurrentRound: boolean;
}

export function BracketRound({ round, brackets, partyId, isCurrentRound }: Props) {
  const roundClosed = brackets.every((b) => b.winnerId !== null);

  return (
    <div className={isCurrentRound ? "" : "opacity-50"}>
      <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Round {round}</p>
      <div className="flex flex-col gap-3">
        {brackets.map((bracket) => (
          <BracketMatch
            key={bracket.id}
            bracket={bracket}
            partyId={partyId}
            roundClosed={roundClosed}
          />
        ))}
      </div>
    </div>
  );
}
