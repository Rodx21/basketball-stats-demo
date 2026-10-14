import { describe, expect, it } from "vitest";
import { aggregateEvents, applyDelta, deltaForEvent, EMPTY_STAT_LINE, pointsForEvent, type GameEventType } from "./events";

// This mirrors what recalc_game_stats() computes server-side (supabase/migrations/0007).
// If a new event type is added to the SQL trigger without a matching case here (or vice
// versa), the live-entry optimistic UI and the server-computed box score will diverge
// until the next Realtime correction — this test exists to catch that at build time.
const SERVER_SCORED_EVENTS: Partial<Record<GameEventType, number>> = {
  fg_made_2: 2,
  fg_made_3: 3,
  ft_made: 1,
};

describe("deltaForEvent — parity with the recalc_game_stats() trigger", () => {
  it("awards points only for the three scoring event types, matching the trigger's CASE", () => {
    const scoringTypes: GameEventType[] = [
      "fg_made_2",
      "fg_missed_2",
      "fg_made_3",
      "fg_missed_3",
      "ft_made",
      "ft_missed",
    ];
    for (const type of scoringTypes) {
      expect(pointsForEvent(type)).toBe(SERVER_SCORED_EVENTS[type] ?? 0);
    }
  });

  it("counts fgm/fga together for makes, fga alone for misses", () => {
    expect(deltaForEvent("fg_made_2")).toEqual({ pts: 2, fgm: 1, fga: 1 });
    expect(deltaForEvent("fg_missed_2")).toEqual({ fga: 1 });
    expect(deltaForEvent("fg_made_3")).toEqual({ pts: 3, fgm: 1, fga: 1, fg3m: 1, fg3a: 1 });
    expect(deltaForEvent("fg_missed_3")).toEqual({ fga: 1, fg3a: 1 });
  });

  it("both foul_personal and foul_technical increment pf, matching the trigger's IN (...) filter", () => {
    expect(deltaForEvent("foul_personal")).toEqual({ pf: 1 });
    expect(deltaForEvent("foul_technical")).toEqual({ pf: 1 });
  });

  it("sub_in/sub_out never touch the box score locally — minutes are server-derived only", () => {
    expect(deltaForEvent("sub_in")).toEqual({});
    expect(deltaForEvent("sub_out")).toEqual({});
  });
});

describe("applyDelta", () => {
  it("adds a delta onto a stat line", () => {
    const result = applyDelta(EMPTY_STAT_LINE, { pts: 2, fgm: 1, fga: 1 });
    expect(result.pts).toBe(2);
    expect(result.fgm).toBe(1);
  });

  it("subtracts the same delta when sign is -1, for reverting an optimistic update", () => {
    const applied = applyDelta(EMPTY_STAT_LINE, { pts: 3, fgm: 1, fga: 1, fg3m: 1, fg3a: 1 });
    const reverted = applyDelta(applied, { pts: 3, fgm: 1, fga: 1, fg3m: 1, fg3a: 1 }, -1);
    expect(reverted).toEqual(EMPTY_STAT_LINE);
  });
});

describe("aggregateEvents — team totals for a roster-less opponent", () => {
  it("is all-zero for an empty event list", () => {
    expect(aggregateEvents([])).toEqual(EMPTY_STAT_LINE);
  });

  it("folds a raw event list into the same shape as a player_game_stats row", () => {
    const line = aggregateEvents([
      { event_type: "fg_made_2" },
      { event_type: "fg_missed_3" },
      { event_type: "ft_made" },
      { event_type: "reb_def" },
      { event_type: "turnover" },
    ]);
    expect(line.pts).toBe(3); // 2 (fg_made_2) + 1 (ft_made)
    expect(line.fga).toBe(2); // one make, one miss
    expect(line.fg3a).toBe(1);
    expect(line.dreb).toBe(1);
    expect(line.tov).toBe(1);
  });
});
