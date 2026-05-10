import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMe } from '../hooks/useMe';
import { api, tmdbImageUrl, type Bracket } from '../lib/api';
import { BracketMovieOption } from './BracketMovieOption';
import { BracketVoteBreakdown } from './BracketVoteBreakdown';

interface Props {
  bracket: Bracket;
  partyId: string;
  roundClosed: boolean;
  eligibleVoterCount: number;
}

export function BracketMatch({ bracket, partyId, roundClosed, eligibleVoterCount }: Props) {
  const queryClient = useQueryClient();
  const { isHost } = useMe();
  const isBye = bracket.suggestionA.id === bracket.suggestionB.id;
  const showBreakdown = isHost && !isBye;
  const showCounter = !isBye && bracket.winnerId === null;

  const mutation = useMutation({
    mutationFn: (suggestionId: string) => api.brackets.vote(bracket.id, suggestionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brackets', partyId] });
    },
  });

  if (isBye) {
    const poster = tmdbImageUrl(bracket.suggestionA.posterPath, 'w92');
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4">
        {poster ? (
          <img
            src={poster}
            alt={bracket.suggestionA.title}
            className="w-10 h-14 object-cover rounded-lg shrink-0"
          />
        ) : (
          <div className="w-10 h-14 rounded-lg bg-white/10 shrink-0" />
        )}
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-medium truncate">{bracket.suggestionA.title}</p>
          <p className="text-xs text-white/60">Auto-advanced</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <div className="flex items-stretch gap-2">
        <BracketMovieOption
          suggestion={bracket.suggestionA}
          isVoted={bracket.myVote === bracket.suggestionA.id}
          isWinner={bracket.winnerId === bracket.suggestionA.id}
          voteCount={bracket.voteCountA}
          showCount={roundClosed}
          onClick={() => mutation.mutate(bracket.suggestionA.id)}
          disabled={roundClosed || mutation.isPending}
        />
        <div className="flex items-center text-white/20 text-xs font-medium shrink-0 self-center">
          VS
        </div>
        <BracketMovieOption
          suggestion={bracket.suggestionB}
          isVoted={bracket.myVote === bracket.suggestionB.id}
          isWinner={bracket.winnerId === bracket.suggestionB.id}
          voteCount={bracket.voteCountB}
          showCount={roundClosed}
          onClick={() => mutation.mutate(bracket.suggestionB.id)}
          disabled={roundClosed || mutation.isPending}
        />
      </div>
      {showCounter && (
        <p className="mt-2 text-center text-[11px] text-white/60">
          {bracket.voterCount}/{eligibleVoterCount} voted
        </p>
      )}
      {showBreakdown && <BracketVoteBreakdown partyId={partyId} bracket={bracket} />}
    </div>
  );
}
