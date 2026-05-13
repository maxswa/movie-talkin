import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AddMemberForm } from '../components/AddMemberForm';
import { MemberRow } from '../components/MemberRow';
import { SortButton } from '../components/SortButton';
import { useMe } from '../hooks/useMe';
import { api } from '../lib/api';

type SortBy = 'name' | 'joined';

export const Route = createFileRoute('/users')({
  component: UsersPage,
});

function UsersPage() {
  const { group } = useMe();
  const [sortBy, setSortBy] = useState<SortBy>('name');

  const { data: groupDetail, isLoading } = useQuery({
    queryKey: ['group-detail', group?.id],
    queryFn: () => api.groups.get(group!.id),
    enabled: !!group,
  });

  const members = groupDetail?.members ?? [];
  const hostCount = members.filter((m) => m.role === 'host').length;

  const sortedMembers = [...members].sort((a, b) =>
    sortBy === 'name' ? a.name.localeCompare(b.name) : b.joinedAt.localeCompare(a.joinedAt),
  );

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Members</h1>
        <div className="flex items-center gap-0.5 rounded-full bg-white/5 p-0.5 text-xs">
          <SortButton active={sortBy === 'name'} onClick={() => setSortBy('name')}>
            Name
          </SortButton>
          <SortButton active={sortBy === 'joined'} onClick={() => setSortBy('joined')}>
            Joined
          </SortButton>
        </div>
      </div>

      {isLoading && <p className="text-center text-sm text-white/60 py-8">Loading…</p>}

      {!isLoading && (
        <ul className="flex flex-col gap-2">
          {sortedMembers.map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              groupId={group!.id}
              isLastHost={m.role === 'host' && hostCount <= 1}
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
