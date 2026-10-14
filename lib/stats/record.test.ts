import { describe, expect, it } from "vitest";
import { computeStreak, summarizeRecord } from "./record";

describe("summarizeRecord", () => {
  it("has no wins/losses with no games", () => {
    expect(summarizeRecord([])).toEqual({ wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });
  });

  it("counts a win when the home team scores more at home", () => {
    const r = summarizeRecord([{ isHome: true, homeScore: 70, awayScore: 60 }]);
    expect(r).toEqual({ wins: 1, losses: 0, pointsFor: 70, pointsAgainst: 60 });
  });

  it("counts a loss when the away team scores less", () => {
    const r = summarizeRecord([{ isHome: false, homeScore: 70, awayScore: 60 }]);
    expect(r).toEqual({ wins: 0, losses: 1, pointsFor: 60, pointsAgainst: 70 });
  });

  it("counts a tied score as neither a win nor a loss", () => {
    const r = summarizeRecord([{ isHome: true, homeScore: 60, awayScore: 60 }]);
    expect(r.wins).toBe(0);
    expect(r.losses).toBe(0);
    expect(r.pointsFor).toBe(60);
    expect(r.pointsAgainst).toBe(60);
  });

  it("treats a missing score as 0, not a crash", () => {
    const r = summarizeRecord([{ isHome: true, homeScore: null, awayScore: null }]);
    expect(r).toEqual({ wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });
  });

  it("accumulates across several games", () => {
    const r = summarizeRecord([
      { isHome: true, homeScore: 80, awayScore: 70 },
      { isHome: false, homeScore: 90, awayScore: 75 },
      { isHome: true, homeScore: 60, awayScore: 65 },
    ]);
    expect(r).toEqual({ wins: 1, losses: 2, pointsFor: 215, pointsAgainst: 225 });
  });
});

describe("computeStreak", () => {
  it("is 'none' with no games played", () => {
    expect(computeStreak([])).toEqual({ type: "none", count: 0 });
  });

  it("counts consecutive wins back from the most recent game", () => {
    expect(computeStreak(["L", "W", "W", "W"])).toEqual({ type: "W", count: 3 });
  });

  it("counts consecutive losses back from the most recent game", () => {
    expect(computeStreak(["W", "L", "L"])).toEqual({ type: "L", count: 2 });
  });

  it("a tie breaks the streak — the tie itself is a streak of one", () => {
    expect(computeStreak(["W", "W", "W", "T"])).toEqual({ type: "T", count: 1 });
  });

  it("a single game is a streak of one", () => {
    expect(computeStreak(["W"])).toEqual({ type: "W", count: 1 });
  });
});
