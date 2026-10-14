import { describe, expect, it } from "vitest";
import { astToTov, efgPct, fgPct, ftPct, tovPct, tsPct } from "./basic";

describe("shooting percentages — division by zero", () => {
  it("fgPct is 0 with no attempts, not NaN", () => {
    expect(fgPct({ fgm: 0, fga: 0 })).toBe(0);
  });

  it("ftPct is 0 with no attempts", () => {
    expect(ftPct({ ftm: 0, fta: 0 })).toBe(0);
  });

  it("efgPct is 0 with no attempts", () => {
    expect(efgPct({ fgm: 0, fg3m: 0, fga: 0 })).toBe(0);
  });

  it("tsPct is 0 with no attempts", () => {
    expect(tsPct({ pts: 0, fga: 0, fta: 0 })).toBe(0);
  });

  it("tovPct is 0 with no plays", () => {
    expect(tovPct({ fga: 0, fta: 0, tov: 0 })).toBe(0);
  });
});

describe("astToTov — a clean game (zero turnovers) must not read as a bad ratio", () => {
  it("falls back to the assist count when turnovers are zero", () => {
    expect(astToTov({ ast: 5, tov: 0 })).toBe(5);
  });

  it("is 0 when the player has neither assists nor turnovers", () => {
    expect(astToTov({ ast: 0, tov: 0 })).toBe(0);
  });

  it("divides normally once there is at least one turnover", () => {
    expect(astToTov({ ast: 6, tov: 2 })).toBe(3);
  });
});
