import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AddMemberForm } from "../components/AddMemberForm";
import { MemberRow } from "../components/MemberRow";
import { useMe } from "../hooks/useMe";
import { api } from "../lib/api";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

function UsersPage() {
  const { group } = useMe();

  const { data: groupDetail, isLoading } = useQuery({
    queryKey: ["group-detail", group?.id],
    queryFn: () => api.groups.get(group!.id),
    enabled: !!group,
  });

  const members = groupDetail?.members ?? [];
  const hostCount = members.filter((m) => m.role === "host").length;

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <h1 className="text-xl font-semibold">Members</h1>

      {isLoading && (
        <p className="text-center text-sm text-white/40 py-8">Loading…</p>
      )}

      {!isLoading && (
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              groupId={group!.id}
              isLastHost={m.role === "host" && hostCount <= 1}
            />
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Add member</h2>
        {group && <AddMemberForm groupId={group.id} />}
      </section>
    </div>
  );
}
