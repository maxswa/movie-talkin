import type { WatchPartyStatus } from '../lib/api';
import { STATUS_META } from '../lib/constants';

export function StatusBadge({ status }: { status: WatchPartyStatus }) {
  const { label, classes } = STATUS_META[status];
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}
