export type WinnerInfo = { id: string; margin: number; wasBye: boolean };
export type BracketPairing = { suggestionAId: string; suggestionBId: string; winnerId: string | null };

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildRoundOnePairings(suggestionIds: string[]): BracketPairing[] {
  if (suggestionIds.length < 2) throw new Error("Need at least 2 movie suggestions to start voting");

  const shuffled = shuffle([...suggestionIds]);
  const pairings: BracketPairing[] = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    const a = shuffled[i];
    const b = shuffled[i + 1] ?? a; // bye: pair with self
    pairings.push({ suggestionAId: a, suggestionBId: b, winnerId: a === b ? a : null });
  }

  return pairings;
}

export function buildNextRoundPairings(winners: WinnerInfo[]): BracketPairing[] {
  if (winners.length === 0) return [];

  const pairings: BracketPairing[] = [];

  if (winners.length % 2 === 1) {
    // Odd — assign bye to highest-margin winner who didn't already have a bye.
    // Fall back to any winner if all had byes this round.
    const eligible = winners.filter((w) => !w.wasBye);
    const pool = eligible.length > 0 ? eligible : winners;
    const byeWinner = pool.reduce((best, w) => (w.margin > best.margin ? w : best));

    const rest = shuffle(winners.filter((w) => w.id !== byeWinner.id).map((w) => w.id));
    for (let i = 0; i < rest.length; i += 2) {
      pairings.push({ suggestionAId: rest[i], suggestionBId: rest[i + 1], winnerId: null });
    }
    pairings.push({ suggestionAId: byeWinner.id, suggestionBId: byeWinner.id, winnerId: byeWinner.id });
  } else {
    const shuffled = shuffle(winners.map((w) => w.id));
    for (let i = 0; i < shuffled.length; i += 2) {
      pairings.push({ suggestionAId: shuffled[i], suggestionBId: shuffled[i + 1], winnerId: null });
    }
  }

  return pairings;
}
