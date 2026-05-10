import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
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

  const { mutate, isIdle, error } = useMutation({
    mutationFn: (t: string) => api.auth.verify(t),
    onSuccess: () => {
      queryClient.resetQueries({ queryKey: ['me'] });
      queryClient.resetQueries({ queryKey: ['groups'] });
      navigate({ to: '/', replace: true });
    },
  });

  useEffect(() => {
    if (meLoading) return;

    // Already signed in (e.g. they tapped an old magic link in their messages).
    // Skip verification entirely so a used / expired token doesn't trip them up.
    if (isAuthenticated) {
      navigate({ to: '/', replace: true });
      return;
    }

    if (token && isIdle) mutate(token);
  }, [token, isAuthenticated, meLoading, isIdle, mutate, navigate]);

  const errorMessage =
    error?.message ?? (!meLoading && !isAuthenticated && !token ? 'No token provided.' : null);

  if (errorMessage) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <p className="text-red-400 text-lg">{errorMessage}</p>
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
