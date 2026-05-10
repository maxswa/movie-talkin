import { useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { useEffect, useState } from 'react';
import type { CategorySpinPayload } from '../lib/api';

const SEGMENT_COLORS = [
  'oklch(70% 0.15 320)',
  'oklch(70% 0.15 240)',
  'oklch(70% 0.15 160)',
  'oklch(72% 0.16 70)',
  'oklch(70% 0.15 30)',
  'oklch(72% 0.15 0)',
  'oklch(70% 0.15 280)',
  'oklch(70% 0.15 200)',
];

const SPIN_DURATION_MS = 4000;
const POST_SPIN_PAUSE_MS = 3000;

function fireConfetti() {
  const burst = (opts: confetti.Options) =>
    confetti({ disableForReducedMotion: true, ...opts });

  burst({ particleCount: 90, spread: 70, origin: { y: 0.55 } });
  setTimeout(
    () => burst({ particleCount: 60, spread: 90, angle: 60, origin: { x: 0, y: 0.7 } }),
    200,
  );
  setTimeout(
    () => burst({ particleCount: 60, spread: 90, angle: 120, origin: { x: 1, y: 0.7 } }),
    350,
  );
}

export function CategorySpinner({
  partyId,
  spin,
}: {
  partyId: string;
  spin: CategorySpinPayload;
}) {
  const queryClient = useQueryClient();
  const [rotation, setRotation] = useState(0);
  const [landed, setLanded] = useState(false);

  const { winner, suggestions } = spin;
  const segAngle = 360 / suggestions.length;
  const winnerIndex = suggestions.findIndex((s) => s.id === winner.id);

  useEffect(() => {
    if (winnerIndex < 0) return;
    const target = 360 * 5 - (winnerIndex + 0.5) * segAngle;
    const startId = window.setTimeout(() => setRotation(target), 50);
    const landId = window.setTimeout(() => {
      setLanded(true);
      fireConfetti();
    }, SPIN_DURATION_MS + 50);
    const cleanupId = window.setTimeout(() => {
      queryClient.removeQueries({ queryKey: ['category-spin', partyId] });
      queryClient.invalidateQueries({ queryKey: ['party', partyId] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    }, SPIN_DURATION_MS + POST_SPIN_PAUSE_MS);
    return () => {
      window.clearTimeout(startId);
      window.clearTimeout(landId);
      window.clearTimeout(cleanupId);
    };
  }, [partyId, winnerIndex, segAngle, queryClient]);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <p className="text-xs text-white/70 uppercase tracking-widest">
        {landed ? 'Winner!' : 'Spinning…'}
      </p>
      <div className="relative w-64 h-64">
        <svg
          viewBox="-110 -110 220 220"
          className="w-full h-full block"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: rotation
              ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.21, 0.99)`
              : undefined,
          }}
        >
          {suggestions.map((s, i) => (
            <Segment
              key={s.id}
              index={i}
              total={suggestions.length}
              segAngle={segAngle}
              name={s.name}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            top: '-6px',
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: '16px solid white',
          }}
        />
      </div>
      {landed && (
        <p className="text-lg font-semibold text-white animate-pulse">{winner.name}</p>
      )}
    </div>
  );
}

function Segment({
  index,
  total,
  segAngle,
  name,
}: {
  index: number;
  total: number;
  segAngle: number;
  name: string;
}) {
  const start = index * segAngle;
  const end = (index + 1) * segAngle;
  const labelAngle = (index + 0.5) * segAngle;
  const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
  const truncated = name.length > 12 ? `${name.slice(0, 11)}…` : name;
  const fontSize = total > 6 ? 7 : total > 4 ? 9 : 11;

  const polar = (angle: number, r: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
  };
  const r = 100;
  const a = polar(start, r);
  const b = polar(end, r);
  const large = end - start > 180 ? 1 : 0;
  const path = `M 0 0 L ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y} Z`;

  return (
    <g>
      <path d={path} fill={color} stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
      <text
        transform={`rotate(${labelAngle}) translate(0, -65)`}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fontWeight="600"
        fill="white"
      >
        {truncated}
      </text>
    </g>
  );
}
