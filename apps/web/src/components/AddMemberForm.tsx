import { useState } from "react";
import { api } from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  groupId: string;
}

export function AddMemberForm({ groupId }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"guest" | "host">("guest");
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setPending(true);
    setError(null);
    setMagicLink(null);

    try {
      const newUser = await api.users.create(trimmedName, email.trim() || undefined);
      await api.groups.addMember(groupId, newUser.id, role);
      queryClient.invalidateQueries({ queryKey: ["group-detail", groupId] });
      setMagicLink(newUser.magicLink);
      setName("");
      setEmail("");
      setRole("guest");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  function copyLink() {
    if (!magicLink) return;
    navigator.clipboard.writeText(magicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name *"
          required
          className="rounded-xl bg-white/10 px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:ring-2 focus:ring-accent-purple/50"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          type="email"
          className="rounded-xl bg-white/10 px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:ring-2 focus:ring-accent-purple/50"
        />
        <div className="flex rounded-xl overflow-hidden border border-white/10 text-sm">
          {(["guest", "host"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 py-3 font-medium transition-colors capitalize ${
                role === r
                  ? "bg-accent-purple text-white"
                  : "bg-white/5 text-white/40 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={!name.trim() || pending}
          className="rounded-xl bg-accent-purple px-4 py-3 text-sm font-medium disabled:opacity-40 transition-opacity"
        >
          {pending ? "Adding…" : "Add member"}
        </button>
      </form>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {magicLink && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-white/50">Share this link with the new member:</p>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <span className="flex-1 truncate text-xs text-white/50 font-mono">{magicLink}</span>
            <button
              onClick={copyLink}
              className="shrink-0 text-xs text-accent-blue hover:text-white transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
