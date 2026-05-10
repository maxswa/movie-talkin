import { tmdbImageUrl, type Bracket, type BracketRound } from '../lib/api';

export function BracketTree({ rounds }: { rounds: BracketRound[] }) {
  if (rounds.length === 0) return null;

  const finalRound = Math.max(...rounds.map((r) => r.round));

  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-2">
      <div className="flex gap-3 min-w-fit items-stretch">
        {rounds.map(({ round, brackets }) => (
          <div
            key={round}
            className="flex flex-col shrink-0 w-[170px]"
          >
            <p className="text-[10px] text-white/60 uppercase tracking-widest text-center mb-2">
              {round === finalRound ? 'Final' : `Round ${round}`}
            </p>
            <div className="flex flex-col flex-1 justify-around gap-3">
              {brackets.map((b) => (
                <TreeMatch key={b.id} bracket={b} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TreeMatch({ bracket }: { bracket: Bracket }) {
  const isBye = bracket.suggestionA.id === bracket.suggestionB.id;
  const resolved = bracket.winnerId !== null;
  const showCount = resolved && !isBye;

  if (isBye) {
    return (
      <div className="rounded-xl bg-surface p-2">
        <TreeOption
          suggestion={bracket.suggestionA}
          isWinner={true}
          voteCount={null}
          showCount={false}
          showSuggester={true}
        />
        <p className="text-[10px] text-white/45 text-center pt-1">bye</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface p-2 flex flex-col gap-1.5">
      <TreeOption
        suggestion={bracket.suggestionA}
        isWinner={bracket.winnerId === bracket.suggestionA.id}
        isLoser={bracket.winnerId === bracket.suggestionB.id}
        voteCount={bracket.voteCountA}
        showCount={showCount}
        showSuggester={resolved}
      />
      <TreeOption
        suggestion={bracket.suggestionB}
        isWinner={bracket.winnerId === bracket.suggestionB.id}
        isLoser={bracket.winnerId === bracket.suggestionA.id}
        voteCount={bracket.voteCountB}
        showCount={showCount}
        showSuggester={resolved}
      />
    </div>
  );
}

function TreeOption({
  suggestion,
  isWinner,
  isLoser,
  voteCount,
  showCount,
  showSuggester,
}: {
  suggestion: Bracket['suggestionA'];
  isWinner: boolean;
  isLoser?: boolean;
  voteCount: number | null;
  showCount: boolean;
  showSuggester: boolean;
}) {
  const poster = tmdbImageUrl(suggestion.posterPath, 'w92');
  return (
    <div
      className={`flex items-center gap-2 rounded-lg p-1.5 ${
        isWinner
          ? 'bg-accent-purple/20 ring-1 ring-accent-purple/50'
          : isLoser
            ? 'opacity-40'
            : ''
      }`}
    >
      {poster ? (
        <img
          src={poster}
          alt={suggestion.title}
          className="w-7 h-10 object-cover rounded shrink-0"
        />
      ) : (
        <div className="w-7 h-10 rounded bg-white/10 shrink-0" />
      )}
      <div className="flex flex-col min-w-0 flex-1">
        <p className="text-xs font-medium truncate leading-tight">{suggestion.title}</p>
        {showSuggester && (
          <p className="text-[10px] text-white/60 truncate leading-tight">
            by {suggestion.suggestedBy.name}
          </p>
        )}
      </div>
      {showCount && voteCount !== null && (
        <span className="text-xs font-semibold text-white/60 shrink-0">{voteCount}</span>
      )}
    </div>
  );
}
