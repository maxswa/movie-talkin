import type { WatchPartyStatus } from './api';
import { DURATION_PRESETS, WATCH_PARTY_STATUSES } from './constants';

export function nextStatus(current: WatchPartyStatus): WatchPartyStatus | null {
  const idx = WATCH_PARTY_STATUSES.indexOf(current);
  if (idx === -1 || idx >= WATCH_PARTY_STATUSES.length - 1) return null;
  return WATCH_PARTY_STATUSES[idx + 1];
}

export function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatDuration(ms: number | null): string | null {
  if (!ms || ms <= 0) return null;
  const preset = DURATION_PRESETS.find((p) => p.value === ms);
  if (preset) return preset.label;
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.round(totalSec / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.round(totalMin / 60);
  return `${hours} hr`;
}
