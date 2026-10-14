import { describe, expect, it } from "vitest";
import { pir } from "./pir";
import { EMPTY_TOTALS } from "./aggregate";

describe("pir", () => {
  it("is 0 for a player with no recorded stats in a game", () => {
    expect(pir(EMPTY_TOTALS)).toBe(0);
  });

  it("rewards positives and penalizes misses/turnovers/fouls", () => {
    const line = {
      ...EMPTY_TOTALS,
      pts: 10,
      fgm: 4,
      fga: 8, // 4 misses
      ftm: 2,
      fta: 2,
      ast: 3,
      tov: 1,
      pf: 2,
    };
    // positives: 10 (pts) + 3 (ast) = 13
    // negatives: (8-4) missed fg + (2-2) missed ft + 1 tov + 2 pf = 4 + 0 + 1 + 2 = 7
    expect(pir(line)).toBe(13 - 7);
  });
});
