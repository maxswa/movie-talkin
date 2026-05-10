import { DURATION_PRESETS } from '../lib/constants';

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
        {DURATION_PRESETS.map((p) => (
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
