import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../lib/api";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: api.auth.me,
    retry: false,
  });

  return (
    <div className="flex flex-col items-center gap-6 pt-16 text-center">
      <h1 className="text-4xl font-bold">Movie night, sorted.</h1>
      <p className="text-gray-400 max-w-md">
        Create a room, invite your friends, nominate movies, and vote on what to watch.
      </p>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : me ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-green-400 text-sm">Signed in as <span className="font-semibold">{me.name}</span></p>
          <button
            onClick={() => api.auth.logout().then(() => window.location.reload())}
            className="text-gray-500 text-xs underline hover:text-gray-300"
          >
            Sign out
          </button>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">Not signed in — open your magic link to log in.</p>
      )}
    </div>
  );
}
