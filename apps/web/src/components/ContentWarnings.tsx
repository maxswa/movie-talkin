import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';

export function ContentWarnings({
  title,
  year,
}: {
  title: string;
  year: number | null;
}) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['content-warnings', title, year],
    queryFn: () => api.contentWarnings.get(title, year),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });

  if (isLoading) return null;
  const warnings = data?.warnings ?? [];
  if (warnings.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="self-start flex items-center gap-1 text-[11px] font-medium text-yellow-300/80 hover:text-yellow-200 transition-colors"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
        ⚠ {warnings.length} content {warnings.length === 1 ? 'warning' : 'warnings'}
      </button>
      {open && (
        <ul className="flex flex-col gap-0.5 pl-3 text-[11px] text-white/60">
          {warnings.map((w) => (
            <li key={w.name} className="flex items-center justify-between gap-2">
              <span className="truncate">{w.name}</span>
              <span className="text-white/30 shrink-0">
                {w.yes}/{w.yes + w.no}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
