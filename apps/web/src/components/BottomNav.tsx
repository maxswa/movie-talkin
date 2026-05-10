import { Link, useRouterState } from '@tanstack/react-router';

const tabs = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/users', label: 'Users', icon: UsersIcon },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto flex justify-around border-t border-white/10 bg-deep/95 backdrop-blur pb-safe">
      {tabs.map(({ to, label, icon: Icon }) => {
        const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-1 px-6 py-3 text-xs transition-colors ${
              active ? 'text-accent-purple' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
