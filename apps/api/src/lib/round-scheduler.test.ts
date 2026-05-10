import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));

vi.mock('../db/client.js', () => ({
  db: {
    query: { watchParties: { findFirst } },
    // restoreSchedules uses select().from().innerJoin().where() — not exercised here.
    select: vi.fn(),
  },
}));

import {
  cancelParty,
  registerCloseRound,
  registerHandler,
  scheduleParty,
} from './round-scheduler.js';

// Use a fresh partyId per test so leftover handler/timer state can't bleed across tests
// (the module keeps a module-level `timers` map; cancelParty in afterEach drains them).
let nextId = 0;
function newPartyId() {
  return `party-${++nextId}`;
}

const scheduled: string[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  findFirst.mockReset();
});

afterEach(() => {
  for (const id of scheduled.splice(0)) cancelParty(id);
  vi.useRealTimers();
});

function schedule(partyId: string, deadline: Date, action: 'close' | 'advance') {
  scheduled.push(partyId);
  scheduleParty(partyId, deadline, action);
}

describe('scheduleParty (timer bookkeeping)', () => {
  it('fires the registered handler once the deadline elapses', async () => {
    const partyId = newPartyId();
    const handler = vi.fn().mockResolvedValue(undefined);
    registerHandler('close', handler);
    findFirst.mockResolvedValue({ id: partyId, status: 'voting' });

    schedule(partyId, new Date(Date.now() + 1000), 'close');
    expect(handler).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(partyId);
  });

  it('does not fire before the deadline', async () => {
    const partyId = newPartyId();
    const handler = vi.fn().mockResolvedValue(undefined);
    registerHandler('close', handler);
    findFirst.mockResolvedValue({ id: partyId, status: 'voting' });

    schedule(partyId, new Date(Date.now() + 1000), 'close');
    await vi.advanceTimersByTimeAsync(999);
    expect(handler).not.toHaveBeenCalled();
  });

  it('past deadline clamps to immediate fire', async () => {
    const partyId = newPartyId();
    const handler = vi.fn().mockResolvedValue(undefined);
    registerHandler('close', handler);
    findFirst.mockResolvedValue({ id: partyId, status: 'voting' });

    schedule(partyId, new Date(Date.now() - 5000), 'close');
    await vi.advanceTimersByTimeAsync(0);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('re-scheduling the same partyId cancels the prior timer (only the latest fires)', async () => {
    const partyId = newPartyId();
    const handler = vi.fn().mockResolvedValue(undefined);
    registerHandler('close', handler);
    findFirst.mockResolvedValue({ id: partyId, status: 'voting' });

    schedule(partyId, new Date(Date.now() + 1000), 'close');
    schedule(partyId, new Date(Date.now() + 2000), 'close');

    await vi.advanceTimersByTimeAsync(1000);
    expect(handler).not.toHaveBeenCalled(); // first timer was cancelled

    await vi.advanceTimersByTimeAsync(1000);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('cancelParty', () => {
  it('prevents a pending timer from firing', async () => {
    const partyId = newPartyId();
    const handler = vi.fn().mockResolvedValue(undefined);
    registerHandler('close', handler);
    findFirst.mockResolvedValue({ id: partyId, status: 'voting' });

    schedule(partyId, new Date(Date.now() + 1000), 'close');
    cancelParty(partyId);
    await vi.advanceTimersByTimeAsync(5000);
    expect(handler).not.toHaveBeenCalled();
  });

  it('is a safe no-op for an unknown partyId', () => {
    expect(() => cancelParty('never-scheduled')).not.toThrow();
  });
});

describe('runAction (status guards)', () => {
  it('"close" action invokes handler only when party.status === "voting"', async () => {
    const partyId = newPartyId();
    const handler = vi.fn().mockResolvedValue(undefined);
    registerHandler('close', handler);
    findFirst.mockResolvedValue({ id: partyId, status: 'movie_suggestions_closed' });

    schedule(partyId, new Date(Date.now() + 1), 'close');
    await vi.advanceTimersByTimeAsync(1);
    expect(handler).not.toHaveBeenCalled();
  });

  it('"advance" action invokes handler only when party.status === "movie_suggestions_closed"', async () => {
    const partyId = newPartyId();
    const advance = vi.fn().mockResolvedValue(undefined);
    registerHandler('advance', advance);

    findFirst.mockResolvedValueOnce({ id: partyId, status: 'voting' });
    schedule(partyId, new Date(Date.now() + 1), 'advance');
    await vi.advanceTimersByTimeAsync(1);
    expect(advance).not.toHaveBeenCalled();

    const other = newPartyId();
    findFirst.mockResolvedValueOnce({ id: other, status: 'movie_suggestions_closed' });
    schedule(other, new Date(Date.now() + 1), 'advance');
    await vi.advanceTimersByTimeAsync(1);
    expect(advance).toHaveBeenCalledWith(other);
  });

  it('does nothing when the party row is missing', async () => {
    const partyId = newPartyId();
    const handler = vi.fn().mockResolvedValue(undefined);
    registerHandler('close', handler);
    findFirst.mockResolvedValue(undefined);

    schedule(partyId, new Date(Date.now() + 1), 'close');
    await vi.advanceTimersByTimeAsync(1);
    expect(handler).not.toHaveBeenCalled();
  });

  it('a throwing handler does not crash the scheduler (error is caught)', async () => {
    const partyId = newPartyId();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    registerHandler('close', async () => {
      throw new Error('boom');
    });
    findFirst.mockResolvedValue({ id: partyId, status: 'voting' });

    schedule(partyId, new Date(Date.now() + 1), 'close');
    await expect(vi.advanceTimersByTimeAsync(1)).resolves.not.toThrow();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe('registerCloseRound (back-compat alias)', () => {
  it('registers the function as the "close" action handler', async () => {
    const partyId = newPartyId();
    const handler = vi.fn().mockResolvedValue(undefined);
    registerCloseRound(handler);
    findFirst.mockResolvedValue({ id: partyId, status: 'voting' });

    schedule(partyId, new Date(Date.now() + 1), 'close');
    await vi.advanceTimersByTimeAsync(1);
    expect(handler).toHaveBeenCalledWith(partyId);
  });
});
