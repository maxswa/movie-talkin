import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { brackets, watchParties } from '../db/schema.js';

type CloseRoundFn = (partyId: string) => Promise<void>;

const timers = new Map<string, NodeJS.Timeout>();
let closeRoundImpl: CloseRoundFn | null = null;

export function registerCloseRound(fn: CloseRoundFn) {
  closeRoundImpl = fn;
}

export function scheduleAutoClose(partyId: string, deadline: Date) {
  cancelAutoClose(partyId);
  const ms = Math.max(0, deadline.getTime() - Date.now());
  const timer = setTimeout(() => {
    timers.delete(partyId);
    runAutoClose(partyId).catch((err) => {
      console.error(`Auto-close failed for party ${partyId}:`, err);
    });
  }, ms);
  timers.set(partyId, timer);
}

export function cancelAutoClose(partyId: string) {
  const timer = timers.get(partyId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(partyId);
  }
}

async function runAutoClose(partyId: string) {
  if (!closeRoundImpl) {
    console.warn(`Auto-close fired for ${partyId} but no closeRound impl is registered`);
    return;
  }
  const party = await db.query.watchParties.findFirst({
    where: eq(watchParties.id, partyId),
  });
  if (!party || party.status !== 'voting') return;
  await closeRoundImpl(partyId);
}

export async function restoreSchedules() {
  const rows = await db
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

  const earliestPerParty = new Map<string, Date>();
  for (const row of rows) {
    if (!row.roundEndsAt) continue;
    const deadline = new Date(row.roundEndsAt);
    const existing = earliestPerParty.get(row.watchPartyId);
    if (!existing || deadline < existing) {
      earliestPerParty.set(row.watchPartyId, deadline);
    }
  }

  for (const [partyId, deadline] of earliestPerParty) {
    scheduleAutoClose(partyId, deadline);
  }

  if (earliestPerParty.size > 0) {
    console.log(`Restored ${earliestPerParty.size} round timer(s).`);
  }
}
