import { describe, expect, it, vi } from 'vitest';
import { broadcast, subscribe } from './pubsub.js';

describe('pubsub', () => {
  it('delivers a broadcast event to a subscriber on the same channel', () => {
    const listener = vi.fn();
    subscribe('party-1', listener);
    broadcast('party-1', { type: 'tick' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ type: 'tick' });
  });

  it('delivers to every subscriber on the channel', () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribe('party-multi', a);
    subscribe('party-multi', b);
    broadcast('party-multi', { type: 'hello' });
    expect(a).toHaveBeenCalledWith({ type: 'hello' });
    expect(b).toHaveBeenCalledWith({ type: 'hello' });
  });

  it('isolates channels — a broadcast on one channel does not reach another', () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribe('party-A', a);
    subscribe('party-B', b);
    broadcast('party-A', { type: 'only-A' });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
  });

  it('unsubscribe stops further deliveries for that listener only', () => {
    const stays = vi.fn();
    const leaves = vi.fn();
    subscribe('party-unsub', stays);
    const off = subscribe('party-unsub', leaves);
    off();
    broadcast('party-unsub', { type: 'after-unsub' });
    expect(stays).toHaveBeenCalledTimes(1);
    expect(leaves).not.toHaveBeenCalled();
  });

  it('calling unsubscribe twice is safe', () => {
    const listener = vi.fn();
    const off = subscribe('party-double-unsub', listener);
    off();
    expect(() => off()).not.toThrow();
    broadcast('party-double-unsub', { type: 'noop' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('broadcasting to a channel with no subscribers is a no-op', () => {
    expect(() => broadcast('party-empty', { type: 'into-the-void' })).not.toThrow();
  });

  it('a throwing listener does not prevent delivery to other listeners', () => {
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    subscribe('party-throw', bad);
    subscribe('party-throw', good);
    expect(() => broadcast('party-throw', { type: 'mixed' })).not.toThrow();
    expect(bad).toHaveBeenCalledTimes(1);
    expect(good).toHaveBeenCalledWith({ type: 'mixed' });
  });

  it('the same listener subscribed twice is deduped (Set semantics) — fires once per broadcast', () => {
    const listener = vi.fn();
    subscribe('party-dedup', listener);
    subscribe('party-dedup', listener);
    broadcast('party-dedup', { type: 'once' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
