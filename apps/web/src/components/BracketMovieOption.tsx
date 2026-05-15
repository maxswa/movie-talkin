import { useLayoutEffect, useRef, useState } from 'react';
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
  onSpinnerDone?: () => void;
}

type Phase = 'idle' | 'loading' | 'finishing';

const SPINNER_DASH = 30;
const SPINNER_DURATION_MS = 1000;
// The head accelerates while closing on the tail so the loop completes snappily.
const FINISH_SPEED_MULTIPLIER = 2;
const FINISH_DURATION_MS =
  (SPINNER_DURATION_MS * ((100 - SPINNER_DASH) / 100)) / FINISH_SPEED_MULTIPLIER;

export function BracketMovieOption({
  suggestion,
  isVoted,
  isWinner,
  voteCount,
  showCount,
  onClick,
  disabled,
  isPending,
  onSpinnerDone,
}: Props) {
  const poster = tmdbImageUrl(suggestion.posterPath, 'w185');
  const rectRef = useRef<SVGRectElement | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [frozenOffset, setFrozenOffset] = useState<string | null>(null);

  // Reading the live animation value out of the DOM requires a layout effect;
  // there's no way to derive the current stroke-dashoffset from React state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (isPending && phase === 'idle') {
      setPhase('loading');
    } else if (!isPending && phase === 'loading') {
      // Snapshot the tail position before swapping animations so the tail
      // stays anchored while the head closes the loop.
      const rect = rectRef.current;
      if (rect) {
        setFrozenOffset(window.getComputedStyle(rect).strokeDashoffset);
      }
      setPhase('finishing');
    }
  }, [isPending, phase]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleAnimationEnd() {
    if (phase !== 'finishing') return;
    setPhase('idle');
    setFrozenOffset(null);
    onSpinnerDone?.();
  }

  const showSpinner = phase !== 'idle';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex-1 flex flex-col items-center gap-2 rounded-xl p-3 transition-all disabled:cursor-default ${
        isWinner
          ? isVoted
            ? 'bg-green-500/15 ring-2 ring-green-500/60'
            : 'bg-green-500/10 ring-1 ring-green-500/30'
          : isVoted
            ? 'bg-accent-purple/30 ring-2 ring-accent-purple shadow-lg shadow-accent-purple/40'
            : 'bg-white/5 hover:bg-white/10'
      }`}
    >
      {showSpinner && (
        <svg
          aria-hidden="true"
          fill="none"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <rect
            ref={rectRef}
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
            strokeDasharray={`${SPINNER_DASH} ${100 - SPINNER_DASH}`}
            style={{
              animation:
                phase === 'loading'
                  ? `bracket-spinner ${SPINNER_DURATION_MS}ms linear infinite`
                  : `bracket-spinner-finish ${FINISH_DURATION_MS}ms linear forwards`,
              ...(frozenOffset !== null ? { strokeDashoffset: frozenOffset } : {}),
            }}
            onAnimationEnd={handleAnimationEnd}
          />
        </svg>
      )}
      {isVoted && (
        <span
          className={`absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white shadow ${
            isWinner ? 'bg-green-500' : 'bg-accent-purple'
          }`}
        >
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
