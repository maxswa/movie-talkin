import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { BottomNav } from '../components/BottomNav';
import { useMe } from '../hooks/useMe';

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  const { isAuthenticated, isHost, isLoading } = useMe();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isVerifyRoute = pathname.startsWith('/auth/verify');

  return (
    <div className="min-h-dvh bg-deep text-white">
      <div className="flex flex-col h-dvh max-w-md mx-auto">
        <main className={`flex-1 overflow-y-auto ${isHost ? 'pb-20' : 'pb-4'}`}>
          {!isLoading && !isAuthenticated && !isVerifyRoute ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
              <p className="text-4xl">🎬</p>
              <h1 className="text-xl font-semibold">movie-talkin</h1>
              <p className="text-white/70 text-sm">Open your magic link to sign in.</p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        {isAuthenticated && isHost && <BottomNav />}
      </div>
    </div>
  );
}
