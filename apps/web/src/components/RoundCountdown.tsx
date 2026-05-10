import { useEffect, useState } from 'react';

export function RoundCountdown({ endsAt }: { endsAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!endsAt) return null;

  const remainingMs = new Date(endsAt).getTime() - now;

  if (remainingMs <= 0) {
    return (
      <div className="rounded-xl bg-white/5 px-4 py-2 text-sm text-white/70 text-center">
        ⏱ Closing round…
      </div>
    );
  }

  const totalSec = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatted =
    hours > 0 ? `${hours}:${pad(min)}:${pad(sec)}` : `${min}:${pad(sec)}`;
  const urgent = remainingMs < 30_000;

  return (
    <div
      className={`rounded-xl px-4 py-2 text-sm text-center ${
        urgent ? 'bg-red-500/15 text-red-300' : 'bg-white/5 text-white/70'
      }`}
    >
      ⏱ Voting ends in <span className="font-mono font-semibold">{formatted}</span>
    </div>
  );
}
