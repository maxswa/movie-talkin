const PRESETS: { label: string; value: number | null }[] = [
  { label: 'No timer', value: null },
  { label: '1 minute', value: 60_000 },
  { label: '5 minutes', value: 5 * 60_000 },
  { label: '10 minutes', value: 10 * 60_000 },
  { label: '30 minutes', value: 30 * 60_000 },
  { label: '1 hour', value: 60 * 60_000 },
  { label: '2 hours', value: 2 * 60 * 60_000 },
  { label: '1 day', value: 24 * 60 * 60_000 },
];

export function DurationPicker({
  value,
  onChange,
  label,
  helperText,
}: {
  value: number | null;
  onChange: (ms: number | null) => void;
  label: string;
  helperText?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-white/70">{label}</span>
      <select
        value={value === null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="rounded-xl bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent-purple/50"
      >
        {PRESETS.map((p) => (
          <option key={String(p.value)} value={p.value === null ? '' : String(p.value)}>
            {p.label}
          </option>
        ))}
      </select>
      {helperText && (
        <span className="text-[11px] text-white/60">
          {value ? helperText : 'Each round will stay open until manually closed.'}
        </span>
      )}
    </label>
  );
}

export function formatDuration(ms: number | null): string | null {
  if (!ms || ms <= 0) return null;
  const preset = PRESETS.find((p) => p.value === ms);
  if (preset) return preset.label;
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.round(totalSec / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.round(totalMin / 60);
  return `${hours} hr`;
}
