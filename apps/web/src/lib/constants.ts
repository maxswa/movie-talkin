import { WatchPartyStatus } from './api';

export const DURATION_PRESETS: { label: string; value: number | null }[] = [
  { label: 'No timer', value: null },
  { label: '1 minute', value: 60_000 },
  { label: '5 minutes', value: 5 * 60_000 },
  { label: '10 minutes', value: 10 * 60_000 },
  { label: '30 minutes', value: 30 * 60_000 },
  { label: '1 hour', value: 60 * 60_000 },
  { label: '2 hours', value: 2 * 60 * 60_000 },
  { label: '1 day', value: 24 * 60 * 60_000 },
];

export const STATUS_META: Record<WatchPartyStatus, { label: string; classes: string }> = {
  draft: { label: 'Planning', classes: 'bg-white/10 text-white/70 ring-1 ring-white/15' },
  open_for_category_suggestions: {
    label: 'Suggest a Category',
    classes: 'bg-accent-blue/25 text-white ring-1 ring-accent-blue/50',
  },
  category_suggestions_closed: {
    label: 'Category Chosen',
    classes: 'bg-accent-purple/25 text-white ring-1 ring-accent-purple/50',
  },
  open_for_movie_suggestions: {
    label: 'Suggest a Movie',
    classes: 'bg-accent-blue/25 text-white ring-1 ring-accent-blue/50',
  },
  movie_suggestions_closed: {
    label: 'Voting Soon',
    classes: 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/40',
  },
  voting: {
    label: 'Vote Now',
    classes: 'bg-accent-purple/30 text-white ring-1 ring-accent-purple/60',
  },
  movie_selected: {
    label: 'Movie Selected',
    classes: 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/40',
  },
  watched: { label: 'Watched', classes: 'bg-white/10 text-white/70 ring-1 ring-white/15' },
};

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
