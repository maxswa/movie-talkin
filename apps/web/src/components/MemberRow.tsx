import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { GroupMember } from "../lib/api";
import { api } from "../lib/api";

interface Props {
  member: GroupMember;
  groupId: string;
  isLastHost: boolean;
}

export function MemberRow({ member, groupId, isLastHost }: Props) {
  const queryClient = useQueryClient();
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const magicLinkMutation = useMutation({
    mutationFn: () => api.users.magicLink(member.userId),
    onSuccess: (data) => setMagicLink(data.magicLink),
  });

  const removeMutation = useMutation({
    mutationFn: () => api.groups.removeMember(groupId, member.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-detail", groupId] });
      setConfirming(false);
    },
  });

  function copyLink() {
    if (!magicLink) return;
    navigator.clipboard.writeText(magicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl bg-white/5 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{member.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              member.role === "host"
                ? "bg-accent-purple/20 text-accent-purple"
                : "bg-white/10 text-white/40"
            }`}
          >
            {member.role}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => magicLinkMutation.mutate()}
            disabled={magicLinkMutation.isPending}
            className="text-xs text-accent-blue hover:text-white disabled:opacity-40 transition-colors"
          >
            {magicLinkMutation.isPending ? "…" : "Get link"}
          </button>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              disabled={isLastHost}
              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Remove
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => removeMutation.mutate()}
                disabled={removeMutation.isPending}
                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
              >
                {removeMutation.isPending ? "…" : "Confirm"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-xs text-white/40 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {magicLink && (
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
          <span className="flex-1 truncate text-xs text-white/50 font-mono">{magicLink}</span>
          <button
            onClick={copyLink}
            className="shrink-0 text-xs text-accent-blue hover:text-white transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      {removeMutation.isError && (
        <p className="text-xs text-red-400">{(removeMutation.error as Error).message}</p>
      )}
    </li>
  );
}
