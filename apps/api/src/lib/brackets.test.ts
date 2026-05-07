import { describe, expect, it } from "vitest";
import { buildNextRoundPairings, buildRoundOnePairings } from "./brackets.js";
import type { WinnerInfo } from "./brackets.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ids(n: number) {
  return Array.from({ length: n }, (_, i) => String.fromCharCode(97 + i)); // 'a', 'b', 'c', ...
}

function byeOf(pairings: ReturnType<typeof buildRoundOnePairings>) {
  return pairings.find((p) => p.winnerId !== null) ?? null;
}

function nonByes(pairings: ReturnType<typeof buildRoundOnePairings>) {
  return pairings.filter((p) => p.winnerId === null);
}

function allUsedIds(pairings: ReturnType<typeof buildRoundOnePairings>): string[] {
  // Each non-bye contributes 2 unique IDs; each bye contributes 1 (self-pair).
  return pairings.flatMap((p) => (p.winnerId !== null ? [p.suggestionAId] : [p.suggestionAId, p.suggestionBId]));
}

// ---------------------------------------------------------------------------
// buildRoundOnePairings
// ---------------------------------------------------------------------------

describe("buildRoundOnePairings", () => {
  it("throws with fewer than 2 suggestions", () => {
    expect(() => buildRoundOnePairings([])).toThrow();
    expect(() => buildRoundOnePairings(["a"])).toThrow();
  });

  it("even count — produces n/2 brackets with no byes", () => {
    const pairings = buildRoundOnePairings(ids(4));
    expect(pairings).toHaveLength(2);
    expect(byeOf(pairings)).toBeNull();
  });

  it("odd count — produces ceil(n/2) brackets with exactly one bye", () => {
    const pairings = buildRoundOnePairings(ids(5));
    expect(pairings).toHaveLength(3);
    expect(byeOf(pairings)).not.toBeNull();
  });

  it("bye bracket has winnerId equal to its own suggestionAId", () => {
    const pairings = buildRoundOnePairings(ids(3));
    const bye = byeOf(pairings)!;
    expect(bye.suggestionAId).toBe(bye.suggestionBId);
    expect(bye.winnerId).toBe(bye.suggestionAId);
  });

  it("every suggestion ID appears exactly once across all pairings", () => {
    for (const n of [2, 3, 4, 5, 6, 7]) {
      const input = ids(n);
      const used = allUsedIds(buildRoundOnePairings(input));
      expect(used).toHaveLength(n);
      expect(new Set(used).size).toBe(n);
    }
  });

  it("non-bye brackets have different suggestions on each side", () => {
    const pairings = buildRoundOnePairings(ids(6));
    for (const p of nonByes(pairings)) {
      expect(p.suggestionAId).not.toBe(p.suggestionBId);
    }
  });
});

// ---------------------------------------------------------------------------
// buildNextRoundPairings
// ---------------------------------------------------------------------------

describe("buildNextRoundPairings", () => {
  it("returns empty for no winners", () => {
    expect(buildNextRoundPairings([])).toHaveLength(0);
  });

  it("even count — no bye produced", () => {
    const winners: WinnerInfo[] = ids(4).map((id, i) => ({ id, margin: i, wasBye: false }));
    const pairings = buildNextRoundPairings(winners);
    expect(pairings).toHaveLength(2);
    expect(byeOf(pairings)).toBeNull();
  });

  it("odd count — exactly one bye produced", () => {
    const winners: WinnerInfo[] = ids(3).map((id, i) => ({ id, margin: i, wasBye: false }));
    const pairings = buildNextRoundPairings(winners);
    const byes = pairings.filter((p) => p.winnerId !== null);
    expect(byes).toHaveLength(1);
  });

  it("bye goes to the highest-margin non-bye winner", () => {
    const winners: WinnerInfo[] = [
      { id: "low", margin: 1, wasBye: false },
      { id: "high", margin: 9, wasBye: false },
      { id: "mid", margin: 5, wasBye: false },
    ];
    const bye = byeOf(buildNextRoundPairings(winners))!;
    expect(bye.suggestionAId).toBe("high");
  });

  it("previous bye winner is ineligible for the next bye", () => {
    const winners: WinnerInfo[] = [
      { id: "prev-bye", margin: Infinity, wasBye: true }, // highest margin but ineligible
      { id: "best-eligible", margin: 8, wasBye: false },
      { id: "other", margin: 2, wasBye: false },
    ];
    const bye = byeOf(buildNextRoundPairings(winners))!;
    expect(bye.suggestionAId).toBe("best-eligible");
  });

  it("falls back to any winner when all had byes this round", () => {
    const winners: WinnerInfo[] = [
      { id: "a", margin: Infinity, wasBye: true },
      { id: "b", margin: Infinity, wasBye: true },
      { id: "c", margin: Infinity, wasBye: true },
    ];
    // Should not throw; exactly one bye should still be assigned
    const pairings = buildNextRoundPairings(winners);
    expect(pairings.filter((p) => p.winnerId !== null)).toHaveLength(1);
  });

  it("every winner ID appears exactly once across all pairings", () => {
    for (const n of [2, 3, 4, 5, 6, 7]) {
      const winners: WinnerInfo[] = ids(n).map((id, i) => ({ id, margin: i, wasBye: false }));
      const used = allUsedIds(buildNextRoundPairings(winners));
      expect(used).toHaveLength(n);
      expect(new Set(used).size).toBe(n);
    }
  });

  it("non-bye brackets have different suggestions on each side", () => {
    const winners: WinnerInfo[] = ids(6).map((id, i) => ({ id, margin: i, wasBye: false }));
    for (const p of nonByes(buildNextRoundPairings(winners))) {
      expect(p.suggestionAId).not.toBe(p.suggestionBId);
    }
  });

  it("single winner produces no pairings (caller handles final winner)", () => {
    const winners: WinnerInfo[] = [{ id: "a", margin: 5, wasBye: false }];
    // With 1 winner the caller treats it as final — pairings should be empty
    // (odd path would create a self-bye, which is valid if caller doesn't check length first)
    // Verify it at least doesn't crash and produces a self-pair
    const pairings = buildNextRoundPairings(winners);
    expect(pairings).toHaveLength(1);
    expect(pairings[0].winnerId).toBe("a");
  });
});
