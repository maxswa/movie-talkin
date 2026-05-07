import { createRootRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMe } from "../hooks/useMe";

export const Route = createRootRoute({
  component: Root,
});

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/", label: "Home", icon: HomeIcon },
    { to: "/parties", label: "Parties", icon: CalendarIcon },
    { to: "/users", label: "Users", icon: UsersIcon },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-white/10 bg-deep/95 backdrop-blur pb-safe">
      {tabs.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-1 px-6 py-3 text-xs transition-colors ${
              active ? "text-accent-purple" : "text-white/40 hover:text-white/70"
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

function Root() {
  const { isAuthenticated, isHost, isLoading } = useMe();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isVerifyRoute = pathname.startsWith("/auth/verify");

  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto bg-deep text-white">
      <main className={`flex-1 overflow-y-auto ${isHost ? "pb-20" : "pb-4"}`}>
        {!isLoading && !isAuthenticated && !isVerifyRoute ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <p className="text-4xl">🎬</p>
            <h1 className="text-xl font-semibold">movie-talkin</h1>
            <p className="text-white/50 text-sm">Open your magic link to sign in.</p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      {isAuthenticated && isHost && <BottomNav />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline icons (no icon library dependency)
// ---------------------------------------------------------------------------

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 11-8 0 4 4 0 018 0zm6 4a2 2 0 11-4 0 2 2 0 014 0zM7 16a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
