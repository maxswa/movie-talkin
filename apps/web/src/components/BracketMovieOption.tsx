import { tmdbImageUrl, type MovieSuggestion } from "../lib/api";

interface Props {
  suggestion: MovieSuggestion;
  isVoted: boolean;
  isWinner: boolean;
  voteCount: number;
  showCount: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function BracketMovieOption({
  suggestion,
  isVoted,
  isWinner,
  voteCount,
  showCount,
  onClick,
  disabled,
}: Props) {
  const poster = tmdbImageUrl(suggestion.posterPath, "w185");

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 flex flex-col items-center gap-2 rounded-xl p-3 transition-colors disabled:cursor-default ${
        isWinner
          ? "bg-green-500/10 ring-1 ring-green-500/30"
          : isVoted
          ? "bg-accent-purple/20 ring-1 ring-accent-purple/50"
          : "bg-white/5 hover:bg-white/10"
      }`}
    >
      {poster ? (
        <img src={poster} alt={suggestion.title} className="w-full rounded-lg" />
      ) : (
        <div className="w-full aspect-[2/3] rounded-lg bg-white/10" />
      )}
      <p className="text-xs font-medium text-center leading-snug line-clamp-2">
        {suggestion.title}
      </p>
      {showCount && (
        <p className={`text-xs font-semibold ${isWinner ? "text-green-400" : "text-white/40"}`}>
          {voteCount} {voteCount === 1 ? "vote" : "votes"}
        </p>
      )}
    </button>
  );
}
