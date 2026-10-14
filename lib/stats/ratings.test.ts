import { describe, expect, it } from "vitest";
import { estimatePossessions, pacePerGame, rating, reboundRate } from "./ratings";

describe("estimatePossessions", () => {
  it("uses the standard FGA - OREB + TOV + 0.44*FTA estimate", () => {
    expect(estimatePossessions({ fga: 70, oreb: 10, tov: 12, fta: 20 })).toBeCloseTo(70 - 10 + 12 + 0.44 * 20);
  });
});

describe("pacePerGame", () => {
  it("is 0 with no games played, not NaN", () => {
    expect(pacePerGame(100, 100, 0)).toBe(0);
  });

  it("averages both sides' possession estimates and divides by games played", () => {
    expect(pacePerGame(160, 140, 2)).toBe(75);
  });
});

describe("rating", () => {
  it("is 0 with zero possessions, not Infinity/NaN", () => {
    expect(rating(80, 0)).toBe(0);
  });

  it("computes points per 100 possessions", () => {
    expect(rating(110, 100)).toBeCloseTo(110);
  });
});

describe("reboundRate", () => {
  it("is 0 when neither side grabbed a rebound of that kind", () => {
    expect(reboundRate(0, 0)).toBe(0);
  });

  it("computes the share of available rebounds of that kind a team grabbed", () => {
    // 30 offensive boards for us, opponent grabbed 70 defensive boards off our misses
    expect(reboundRate(30, 70)).toBe(0.3);
  });
});
