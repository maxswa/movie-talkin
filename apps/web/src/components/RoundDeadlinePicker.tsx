import { toLocalInputValue } from '../lib/utils';

export function RoundDeadlinePicker({
  value,
  onChange,
  label = 'Round ends at',
}: {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-white/50">{label}</span>
      <input
        type="datetime-local"
        value={value ? toLocalInputValue(value.toISOString()) : ''}
        onChange={(e) => {
          if (!e.target.value) {
            onChange(null);
          } else {
            onChange(new Date(e.target.value));
          }
        }}
        className="rounded-xl bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent-purple/50 [color-scheme:dark]"
      />
    </label>
  );
}
