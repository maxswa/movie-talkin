import { Link } from "@tanstack/react-router";
import type { WatchParty } from "../lib/api";
import { formatDate } from "../lib/utils";
import { StatusBadge } from "./StatusBadge";

export function PartyListItem({ party }: { party: WatchParty }) {
  return (
    <Link
      to="/parties/$partyId"
      params={{ partyId: party.id }}
      className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors"
    >
      <div className="flex flex-col gap-1">
        <StatusBadge status={party.status} />
        {party.scheduledFor && (
          <span className="text-xs text-white/40">{formatDate(party.scheduledFor)}</span>
        )}
      </div>
      <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
