import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export const Route = createFileRoute("/auth/verify")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: search.token as string | undefined,
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No token provided.");
      return;
    }
    api.auth
      .verify(token)
      .then(() => navigate({ to: "/" }))
      .catch((e: Error) => setError(e.message));
  }, [token, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <p className="text-red-400 text-lg">{error}</p>
        <p className="text-gray-500 text-sm">Your link may have expired. Ask the host for a new one.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 pt-16 text-center">
      <p className="text-gray-400">Verifying your link…</p>
    </div>
  );
}
