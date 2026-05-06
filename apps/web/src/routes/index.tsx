import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="flex flex-col items-center gap-6 pt-16 text-center">
      <h1 className="text-4xl font-bold">Movie night, sorted.</h1>
      <p className="text-gray-400 max-w-md">
        Create a room, invite your friends, nominate movies, and vote on what to
        watch.
      </p>
      <button className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500 transition-colors">
        Create a room
      </button>
    </div>
  );
}
