import { describe, expect, it } from "vitest";
import {
  computeLineupStints,
  summarizeLineups,
  summarizePlayerPlusMinus,
  topLineupsBy,
  type LineupEvent,
  type LineupSummary,
} from "./lineups";

const OWN = "own-team";
const OPP = "opp-team";
const [P1, P2, P3, P4, P5, P6] = ["p1", "p2", "p3", "p4", "p5", "p6"];

function subIn(playerId: string, t: string, team = OWN): LineupEvent {
  return { event_type: "sub_in", team_id: team, player_id: playerId, created_at: t };
}
function subOut(playerId: string, t: string, team = OWN): LineupEvent {
  return { event_type: "sub_out", team_id: team, player_id: playerId, created_at: t };
}
function made2(t: string, team = OWN): LineupEvent {
  return { event_type: "fg_made_2", team_id: team, player_id: null, created_at: t };
}

describe("computeLineupStints", () => {
  it("returns nothing for an empty game", () => {
    expect(computeLineupStints([], OWN)).toEqual([]);
  });

  it("drops points scored before 5 players have checked in", () => {
    const events: LineupEvent[] = [
      subIn(P1, "2024-01-01T00:00:01.000Z"),
      subIn(P2, "2024-01-01T00:00:02.000Z"),
      made2("2024-01-01T00:00:03.000Z"), // only 2 on court — nobody credited
    ];
    expect(computeLineupStints(events, OWN)).toEqual([]);
  });

  it("records one stint for a full game with no substitutions", () => {
    const events: LineupEvent[] = [
      subIn(P1, "2024-01-01T00:00:01.000Z"),
      subIn(P2, "2024-01-01T00:00:02.000Z"),
      subIn(P3, "2024-01-01T00:00:03.000Z"),
      subIn(P4, "2024-01-01T00:00:04.000Z"),
      subIn(P5, "2024-01-01T00:00:05.000Z"),
      made2("2024-01-01T00:00:06.000Z"), // us +2
      made2("2024-01-01T00:00:07.000Z", OPP), // them +2
    ];
    const stints = computeLineupStints(events, OWN);
    expect(stints).toHaveLength(1);
    expect(stints[0]).toEqual({ lineup: [P1, P2, P3, P4, P5].sort(), us: 2, them: 2 });
  });

  it("splits into a new stint on every substitution, crediting each lineup only for its own window", () => {
    const events: LineupEvent[] = [
      subIn(P1, "2024-01-01T00:00:01.000Z"),
      subIn(P2, "2024-01-01T00:00:02.000Z"),
      subIn(P3, "2024-01-01T00:00:03.000Z"),
      subIn(P4, "2024-01-01T00:00:04.000Z"),
      subIn(P5, "2024-01-01T00:00:05.000Z"),
      made2("2024-01-01T00:00:06.000Z"), // stint 1: us +2
      subOut(P5, "2024-01-01T00:00:07.000Z"),
      subIn(P6, "2024-01-01T00:00:08.000Z"),
      made2("2024-01-01T00:00:09.000Z", OPP), // stint 2: them +2
      made2("2024-01-01T00:00:10.000Z"), // stint 2: us +2
    ];
    const stints = computeLineupStints(events, OWN);
    expect(stints).toHaveLength(2);
    expect(stints[0]).toEqual({ lineup: [P1, P2, P3, P4, P5].sort(), us: 2, them: 0 });
    expect(stints[1]).toEqual({ lineup: [P1, P2, P3, P4, P6].sort(), us: 2, them: 2 });
  });

  it("ignores the opponent's own substitutions when tracking who is on court for us", () => {
    const events: LineupEvent[] = [
      subIn(P1, "2024-01-01T00:00:01.000Z"),
      subIn(P2, "2024-01-01T00:00:02.000Z"),
      subIn(P3, "2024-01-01T00:00:03.000Z"),
      subIn(P4, "2024-01-01T00:00:04.000Z"),
      subIn(P5, "2024-01-01T00:00:05.000Z"),
      subIn("opp-p1", "2024-01-01T00:00:06.000Z", OPP), // opponent substitution — must not affect our lineup tracking
      made2("2024-01-01T00:00:07.000Z"),
    ];
    const stints = computeLineupStints(events, OWN);
    expect(stints).toHaveLength(1);
    expect(stints[0].us).toBe(2);
  });

  it("sorts out-of-order input by created_at before processing", () => {
    const events: LineupEvent[] = [
      made2("2024-01-01T00:00:06.000Z"),
      subIn(P5, "2024-01-01T00:00:05.000Z"),
      subIn(P4, "2024-01-01T00:00:04.000Z"),
      subIn(P1, "2024-01-01T00:00:01.000Z"),
      subIn(P3, "2024-01-01T00:00:03.000Z"),
      subIn(P2, "2024-01-01T00:00:02.000Z"),
    ];
    const stints = computeLineupStints(events, OWN);
    // the basket at t6 comes after all 5 sub_ins once sorted, so it should count
    expect(stints).toHaveLength(1);
    expect(stints[0].us).toBe(2);
  });
});

describe("summarizeLineups", () => {
  it("merges repeated appearances of the same five, regardless of games/stints", () => {
    const lineup = [P1, P2, P3, P4, P5];
    const summary = summarizeLineups([
      { lineup, us: 6, them: 2 },
      { lineup, us: 0, them: 4 },
      { lineup: [P1, P2, P3, P4, P6], us: 10, them: 0 },
    ]);
    expect(summary).toHaveLength(2);
    const top = summary[0];
    expect(top.playerIds).toEqual(lineup);
    expect(top.stints).toBe(2);
    expect(top.us).toBe(6);
    expect(top.them).toBe(6);
    expect(top.plusMinus).toBe(0);
  });

  it("ranks the most-used lineup first", () => {
    const summary = summarizeLineups([
      { lineup: [P1, P2, P3, P4, P5], us: 2, them: 0 },
      { lineup: [P1, P2, P3, P4, P6], us: 2, them: 0 },
      { lineup: [P1, P2, P3, P4, P6], us: 2, them: 0 },
    ]);
    expect(summary[0].playerIds).toEqual([P1, P2, P3, P4, P6]);
    expect(summary[0].stints).toBe(2);
  });
});

describe("topLineupsBy", () => {
  const summaries: LineupSummary[] = [
    { playerIds: [P1, P2, P3, P4, P5], stints: 5, us: 20, them: 10, plusMinus: 10 },
    { playerIds: [P1, P2, P3, P4, P6], stints: 3, us: 30, them: 5, plusMinus: 25 },
    { playerIds: [P1, P2, P3, P5, P6], stints: 1, us: 100, them: 0, plusMinus: 100 }, // tiny sample
  ];

  it("drops lineups below the minimum sample size (default 2 stints)", () => {
    const top = topLineupsBy(summaries, "plusMinus");
    expect(top.map((s) => s.stints)).not.toContain(1);
  });

  it("ranks by plusMinus descending by default", () => {
    const top = topLineupsBy(summaries, "plusMinus");
    expect(top[0].playerIds).toEqual([P1, P2, P3, P4, P6]);
  });

  it("supports ascending order, e.g. fewest points allowed", () => {
    const top = topLineupsBy(summaries, "them", { ascending: true });
    expect(top[0].playerIds).toEqual([P1, P2, P3, P4, P6]); // them: 5, lowest of the qualifying two
  });

  it("respects a custom limit", () => {
    const top = topLineupsBy(summaries, "us", { limit: 1, minStints: 1 });
    expect(top).toHaveLength(1);
    expect(top[0].playerIds).toEqual([P1, P2, P3, P5, P6]); // us: 100, highest overall
  });
});

describe("summarizePlayerPlusMinus", () => {
  it("credits every player in a stint with that stint's differential", () => {
    const result = summarizePlayerPlusMinus([
      { lineup: [P1, P2, P3, P4, P5], us: 6, them: 2 },
      { lineup: [P1, P2, P3, P4, P6], us: 0, them: 4 },
    ]);
    const byId = new Map(result.map((r) => [r.playerId, r]));
    // P1-P4 played both stints: +4 then -4 nets to 0
    expect(byId.get(P1)?.plusMinus).toBe(0);
    expect(byId.get(P1)?.stints).toBe(2);
    // P5 only played the first stint
    expect(byId.get(P5)).toEqual({ playerId: P5, stints: 1, us: 6, them: 2, plusMinus: 4 });
    // P6 only played the second
    expect(byId.get(P6)).toEqual({ playerId: P6, stints: 1, us: 0, them: 4, plusMinus: -4 });
  });

  it("ranks players by plusMinus descending", () => {
    const result = summarizePlayerPlusMinus([
      { lineup: [P1, P2, P3, P4, P5], us: 10, them: 0 },
      { lineup: [P1, P2, P3, P4, P6], us: 0, them: 10 },
    ]);
    expect(result[0].playerId).toBe(P5);
    expect(result[result.length - 1].playerId).toBe(P6);
  });
});
