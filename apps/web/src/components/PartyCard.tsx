import type { WatchPartyDetail } from "../lib/api";
import { formatDate } from "../lib/utils";
import { PartyBody } from "./PartyBody";
import { StatusBadge } from "./StatusBadge";

export function PartyCard({ party }: { party: WatchPartyDetail }) {
  return (
    <div className="rounded-2xl bg-surface p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">
          {party.selectedCategory || "Category TBD"}
        </p>
        <StatusBadge status={party.status} />
      </div>

      {party.scheduledFor && (
        <p className="text-white/50 text-sm">
          📅 {formatDate(party.scheduledFor)}
        </p>
      )}

      <PartyBody party={party} />
    </div>
  );
}
