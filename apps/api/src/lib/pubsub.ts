type Listener = (event: object) => void;

const channels = new Map<string, Set<Listener>>();

export function subscribe(channel: string, listener: Listener) {
  if (!channels.has(channel)) channels.set(channel, new Set());
  channels.get(channel)!.add(listener);
  return () => channels.get(channel)?.delete(listener);
}

export function broadcast(channel: string, event: object) {
  const listeners = channels.get(channel);
  if (!listeners) return;
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {}
  }
}
