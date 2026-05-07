import type { WatchPartyStatus } from './api';

export const WATCH_PARTY_STATUSES: WatchPartyStatus[] = [
  'draft',
  'open_for_category_suggestions',
  'category_suggestions_closed',
  'open_for_movie_suggestions',
  'movie_suggestions_closed',
  'voting',
  'movie_selected',
  'watched',
];

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
