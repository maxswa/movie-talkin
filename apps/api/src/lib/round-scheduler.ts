import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { brackets, watchParties } from '../db/schema.js';

export type ScheduledAction = 'close' | 'advance';

type Handler = (partyId: string) => Promise<void>;

const timers = new Map<string, NodeJS.Timeout>();
const handlers = new Map<ScheduledAction, Handler>();

export function registerHandler(action: ScheduledAction, fn: Handler) {
  handlers.set(action, fn);
}

// Backward-compat alias kept for existing callers.
export function registerCloseRound(fn: Handler) {
  registerHandler('close', fn);
}

export function scheduleParty(partyId: string, deadline: Date, action: ScheduledAction) {
  cancelParty(partyId);
  const ms = Math.max(0, deadline.getTime() - Date.now());
  const timer = setTimeout(() => {
    timers.delete(partyId);
    runAction(partyId, action).catch((err) => {
      console.error(`Scheduled ${action} failed for party ${partyId}:`, err);
    });
  }, ms);
  timers.set(partyId, timer);
}

export function cancelParty(partyId: string) {
  const timer = timers.get(partyId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(partyId);
  }
}

// Backward-compat aliases.
export function scheduleAutoClose(partyId: string, deadline: Date) {
  scheduleParty(partyId, deadline, 'close');
}
export function cancelAutoClose(partyId: string) {
  cancelParty(partyId);
}

async function runAction(partyId: string, action: ScheduledAction) {
  const fn = handlers.get(action);
  if (!fn) {
    console.warn(`No handler registered for action "${action}"`);
    return;
  }
  const party = await db.query.watchParties.findFirst({
    where: eq(watchParties.id, partyId),
  });
  if (!party) return;
  // Action-specific status guards
  if (action === 'close' && party.status !== 'voting') return;
  if (action === 'advance' && party.status !== 'movie_suggestions_closed') return;
  await fn(partyId);
}

export async function restoreSchedules() {
  // Close-round timers: unresolved brackets in voting parties with future roundEndsAt.
  const closeRows = await db
    .select({ watchPartyId: brackets.watchPartyId, roundEndsAt: brackets.roundEndsAt })
    .from(brackets)
    .innerJoin(watchParties, eq(watchParties.id, brackets.watchPartyId))
    .where(
      and(
        isNotNull(brackets.roundEndsAt),
        isNull(brackets.winnerId),
        eq(watchParties.status, 'voting'),
      ),
    );

  const earliestClose = new Map<string, Date>();
  for (const row of closeRows) {
    if (!row.roundEndsAt) continue;
    const d = new Date(row.roundEndsAt);
    const existing = earliestClose.get(row.watchPartyId);
    if (!existing || d < existing) earliestClose.set(row.watchPartyId, d);
  }
  for (const [partyId, deadline] of earliestClose) {
    scheduleParty(partyId, deadline, 'close');
  }

  // Advance timers: parties stuck in movie_suggestions_closed with a future votingStartsAt.
  const advanceRows = await db
    .select({ id: watchParties.id, votingStartsAt: watchParties.votingStartsAt })
    .from(watchParties)
    .where(
      and(
        eq(watchParties.status, 'movie_suggestions_closed'),
        isNotNull(watchParties.votingStartsAt),
      ),
    );
  for (const row of advanceRows) {
    if (!row.votingStartsAt) continue;
    scheduleParty(row.id, new Date(row.votingStartsAt), 'advance');
  }

  const total = earliestClose.size + advanceRows.length;
  if (total > 0) console.log(`Restored ${total} party timer(s).`);
}
