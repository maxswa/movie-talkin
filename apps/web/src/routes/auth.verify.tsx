import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useMe } from '../hooks/useMe';
import { api } from '../lib/api';

export const Route = createFileRoute('/auth/verify')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: search.token as string | undefined,
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = Route.useSearch();
  const { isAuthenticated, isLoading: meLoading } = useMe();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for the initial auth check before deciding what to do.
    if (meLoading) return;

    // Already signed in (e.g. they tapped an old magic link in their messages).
    // Skip verification entirely so a used / expired token doesn't trip them up.
    if (isAuthenticated) {
      navigate({ to: '/', replace: true });
      return;
    }

    if (!token) {
      setError('No token provided.');
      return;
    }

    api.auth
      .verify(token)
      .then(() => {
        queryClient.resetQueries({ queryKey: ['me'] });
        queryClient.resetQueries({ queryKey: ['groups'] });
        navigate({ to: '/', replace: true });
      })
      .catch((e: Error) => setError(e.message));
  }, [token, isAuthenticated, meLoading, navigate, queryClient]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <p className="text-red-400 text-lg">{error}</p>
        <p className="text-gray-500 text-sm">
          Your link may have expired. Ask the host for a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 pt-16 text-center">
      <p className="text-gray-400">Verifying your link…</p>
    </div>
  );
}
