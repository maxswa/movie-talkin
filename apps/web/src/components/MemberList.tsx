import type { GroupMember } from '../lib/api';

function RoleBadge({ role }: { role: 'host' | 'guest' }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        role === 'host' ? 'bg-accent-purple/20 text-accent-purple' : 'bg-white/10 text-white/40'
      }`}
    >
      {role}
    </span>
  );
}

export function MemberList({ members = [] }: { members?: GroupMember[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {members.map((m) => (
        <li
          key={m.userId}
          className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
        >
          <span className="text-sm font-medium">{m.name}</span>
          <RoleBadge role={m.role} />
        </li>
      ))}
    </ul>
  );
}
