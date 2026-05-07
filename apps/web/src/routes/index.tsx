import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PartyCard } from "../components/PartyCard";
import { useMe } from "../hooks/useMe";
import { api } from "../lib/api";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { user, group, isLoading: meLoading } = useMe();

  const { data: parties, isLoading: partiesLoading } = useQuery({
    queryKey: ["parties", group?.id],
    queryFn: () => api.parties.list(group!.id),
    enabled: !!group,
  });

  const activeParty =
    parties
      ?.filter((p) => p.status !== "watched")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

  const { data: partyDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["party", activeParty?.id],
    queryFn: () => api.parties.get(activeParty!.id),
    enabled: !!activeParty,
  });

  const isLoading = meLoading || partiesLoading || (!!activeParty && detailLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-white/40 text-sm">
        Loading…
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between pt-2">
        <p className="text-white/60 text-sm">
          Hey, <span className="text-white font-medium">{user.name}</span>
        </p>
        <button
          onClick={() => api.auth.logout().then(() => window.location.reload())}
          className="text-white/30 text-xs hover:text-white/60 transition-colors"
        >
          Sign out
        </button>
      </div>

      {!activeParty || !partyDetail ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-5xl">🎬</p>
          <p className="font-semibold text-white/80">No upcoming party yet</p>
          <p className="text-white/40 text-sm">Your host will set one up soon.</p>
        </div>
      ) : (
        <PartyCard party={partyDetail} />
      )}
    </div>
  );
}
