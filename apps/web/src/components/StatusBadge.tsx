import type { WatchPartyStatus } from '../lib/api';

export const STATUS_META: Record<WatchPartyStatus, { label: string; classes: string }> = {
  draft: { label: 'Planning', classes: 'bg-white/10 text-white/50' },
  open_for_category_suggestions: {
    label: 'Suggest a Category',
    classes: 'bg-accent-blue/20 text-accent-blue',
  },
  category_suggestions_closed: {
    label: 'Category Chosen',
    classes: 'bg-accent-purple/20 text-accent-purple',
  },
  open_for_movie_suggestions: {
    label: 'Suggest a Movie',
    classes: 'bg-accent-blue/20 text-accent-blue',
  },
  movie_suggestions_closed: { label: 'Voting Soon', classes: 'bg-yellow-500/20 text-yellow-400' },
  voting: { label: 'Vote Now', classes: 'bg-accent-purple/20 text-accent-purple' },
  movie_selected: { label: 'Movie Selected', classes: 'bg-green-500/20 text-green-400' },
  watched: { label: 'Watched', classes: 'bg-white/10 text-white/40' },
};

export function StatusBadge({ status }: { status: WatchPartyStatus }) {
  const { label, classes } = STATUS_META[status];
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}
