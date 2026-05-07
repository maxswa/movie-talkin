import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { BracketRound } from "./BracketRound";

export function BracketView({ partyId }: { partyId: string }) {
  const { data: rounds = [] } = useQuery({
    queryKey: ["brackets", partyId],
    queryFn: () => api.brackets.list(partyId),
  });

  if (rounds.length === 0) {
    return (
      <p className="text-white/40 text-sm text-center py-8">
        Brackets are being set up…
      </p>
    );
  }

  const currentRound = Math.max(...rounds.map((r) => r.round));

  return (
    <div className="flex flex-col gap-6">
      {rounds.map(({ round, brackets }) => (
        <BracketRound
          key={round}
          round={round}
          brackets={brackets}
          partyId={partyId}
          isCurrentRound={round === currentRound}
        />
      ))}
    </div>
  );
}
