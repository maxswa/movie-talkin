import { createFileRoute } from "@tanstack/react-router";
import { useMe } from "../hooks/useMe";
import { api } from "../lib/api";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { user, isLoading } = useMe();

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-white/40 text-sm">Loading…</div>;
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <p className="text-white/60 text-sm">
          Hey, <span className="text-white font-medium">{user.name}</span>
        </p>
        <button
          onClick={() => api.auth.logout().then(() => window.location.reload())}
          className="text-white/30 text-xs hover:text-white/60 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
