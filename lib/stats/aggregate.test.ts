import { describe, expect, it } from "vitest";
import { sumLines, EMPTY_TOTALS } from "./aggregate";

describe("sumLines", () => {
  it("returns all-zero totals for a player with no games", () => {
    expect(sumLines([])).toEqual(EMPTY_TOTALS);
  });

  it("treats null stat fields as 0 instead of propagating NaN", () => {
    const totals = sumLines([
      {
        minutes_played: null,
        pts: null,
        fgm: null,
        fga: null,
        fg3m: null,
        fg3a: null,
        ftm: null,
        fta: null,
        oreb: null,
        dreb: null,
        ast: null,
        stl: null,
        blk: null,
        tov: null,
        pf: null,
      },
    ]);
    expect(totals).toEqual(EMPTY_TOTALS);
  });

  it("sums across multiple games", () => {
    const row = {
      minutes_played: 20,
      pts: 10,
      fgm: 4,
      fga: 8,
      fg3m: 1,
      fg3a: 2,
      ftm: 1,
      fta: 2,
      oreb: 1,
      dreb: 3,
      ast: 2,
      stl: 1,
      blk: 0,
      tov: 2,
      pf: 1,
    };
    const totals = sumLines([row, row]);
    expect(totals.pts).toBe(20);
    expect(totals.minutes).toBe(40);
    expect(totals.tov).toBe(4);
  });
});
