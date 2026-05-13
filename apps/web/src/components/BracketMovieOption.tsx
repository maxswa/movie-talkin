import { tmdbImageUrl, type MovieSuggestion } from '../lib/api';

interface Props {
  suggestion: MovieSuggestion;
  isVoted: boolean;
  isWinner: boolean;
  voteCount: number;
  showCount: boolean;
  onClick?: () => void;
  disabled?: boolean;
  isPending?: boolean;
}

export function BracketMovieOption({
  suggestion,
  isVoted,
  isWinner,
  voteCount,
  showCount,
  onClick,
  disabled,
  isPending,
}: Props) {
  const poster = tmdbImageUrl(suggestion.posterPath, 'w185');

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex-1 flex flex-col items-center gap-2 rounded-xl p-3 transition-all disabled:cursor-default ${
        isWinner
          ? 'bg-green-500/10 ring-1 ring-green-500/30'
          : isVoted
            ? 'bg-accent-purple/30 ring-2 ring-accent-purple shadow-lg shadow-accent-purple/40'
            : 'bg-white/5 hover:bg-white/10'
      }`}
    >
      {isPending && (
        <svg
          aria-hidden="true"
          fill="none"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            rx="12"
            ry="12"
            stroke="var(--color-accent-purple)"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray="30 70"
            style={{ animation: 'bracket-spinner 1s linear infinite' }}
          />
        </svg>
      )}
      {isVoted && !isWinner && (
        <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-purple text-xs font-bold text-white shadow">
          ✓
        </span>
      )}
      {poster ? (
        <img src={poster} alt={suggestion.title} className="w-full rounded-lg" />
      ) : (
        <div className="w-full aspect-[2/3] rounded-lg bg-white/10" />
      )}
      <p className="text-xs font-medium text-center leading-snug line-clamp-2">
        {suggestion.title}
      </p>
      {showCount && (
        <p className={`text-xs font-semibold ${isWinner ? 'text-green-400' : 'text-white/60'}`}>
          {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
        </p>
      )}
    </button>
  );
}
