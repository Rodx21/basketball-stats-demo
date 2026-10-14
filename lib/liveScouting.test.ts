import { describe, expect, it } from "vitest";
import { OUR_DEFENSE_RULES, TURNOVER_CATEGORY, currentLineups, playerRanking, substitute, actionOf, defaultOptionRows, groupOptions, insights, playKey, playOf, pppBy, ruleStats, slugify, totals, turnoversBy, type Possession } from "./liveScouting";

const poss = (option: string, points: number | null, extra: Partial<Possession> = {}): Possession => ({
  option,
  category: "half_court",
  points,
  turnover: false,
  defense: null,
  player: null,
  coverage: null,
  period: 1,
  ...extra,
});

describe("pppBy", () => {
  it("computes points per possession per key, best first", () => {
    const rows = pppBy([poss("2 up", 2), poss("2 up", 0), poss("Motion up", 3), poss("2 up", 3)], (p) => p.option);
    expect(rows.map((r) => [r.key, r.poss, r.pts])).toEqual([
      ["Motion up", 1, 3],
      ["2 up", 3, 5],
    ]);
    expect(rows[1].ppp).toBeCloseTo(5 / 3);
    expect(rows[1].scored).toBe(2);
  });

  it("counts turnovers as zero-point possessions", () => {
    const [row] = pppBy([poss("0", null, { turnover: true }), poss("0", 2)], (p) => p.option);
    expect(row).toMatchObject({ poss: 2, pts: 2, ppp: 1, tov: 1 });
  });

  it("skips possessions whose key is null", () => {
    expect(pppBy([poss("0", 2)], (p) => p.defense)).toEqual([]);
  });
});

describe("totals", () => {
  it("returns zeros when empty", () => {
    expect(totals([])).toMatchObject({ poss: 0, pts: 0, ppp: 0 });
  });
});

describe("playKey", () => {
  it("prefixes set plays so BLOB/SLOB names don't collide with half court", () => {
    expect(playKey({ category: "slob", option: "2 up" })).toBe("SLOB 2 up");
    expect(playKey({ category: "half_court", option: "2 up" })).toBe("2 up");
  });
});

describe("insights", () => {
  const rows = pppBy(
    [
      poss("A", 3), poss("A", 2),
      poss("B", 0), poss("B", 0),
      poss("C", 2), poss("C", 0),
      poss("D", 3),
    ],
    (p) => p.option
  );

  it("ignores rows below the minimum sample", () => {
    const { best, worst } = insights(rows, "our_off");
    expect([...best, ...worst].map((r) => r.key)).not.toContain("D");
  });

  it("ranks highest PPP as best on offense", () => {
    const { best, worst } = insights(rows, "our_off", 1);
    expect(best[0].key).toBe("A");
    expect(worst[0].key).toBe("B");
  });

  it("ranks lowest PPP allowed as best on defense", () => {
    const { best, worst } = insights(rows, "our_def", 1);
    expect(best[0].key).toBe("B");
    expect(worst[0].key).toBe("A");
  });

  it("never lists a row as both best and worst", () => {
    const { best, worst } = insights(pppBy([poss("A", 2), poss("A", 2)], (p) => p.option), "our_off");
    expect(best.map((r) => r.key)).toEqual(["A"]);
    expect(worst).toEqual([]);
  });
});

describe("ruleStats", () => {
  it("splits PPP allowed by rule kept vs broken, ignoring untagged possessions", () => {
    const [screen, big] = ruleStats(
      [
        poss("PnR", 0, { rules: { screen: "Follow through", big: "Hedge" } }),
        poss("PnR", 2, { rules: { screen: "Bully through" } }),
        poss("PnR", 3, { rules: { screen: "Went under / other", big: "No hedge" } }),
        poss("ISO", 2),
      ],
      OUR_DEFENSE_RULES
    );
    expect(screen.kept).toMatchObject({ poss: 2, pts: 2, ppp: 1 });
    expect(screen.broken).toMatchObject({ poss: 1, pts: 3 });
    expect(big.kept).toMatchObject({ poss: 1, pts: 0 });
    expect(big.broken).toMatchObject({ poss: 1, pts: 3 });
  });

  it("returns nulls when a rule was never tagged", () => {
    const [screen] = ruleStats([poss("ISO", 2)], OUR_DEFENSE_RULES);
    expect(screen.kept).toBeNull();
    expect(screen.broken).toBeNull();
  });
});

describe("live options", () => {
  it("seeds defaults for every list, with BLOB/SLOB kept as separate groups", () => {
    const rows = defaultOptionRows();
    expect(new Set(rows.map((r) => r.list))).toEqual(new Set(["our_plays", "their_actions", "their_defenses", "our_defenses"]));
    expect(rows.filter((r) => r.list === "our_plays" && r.group_key === "blob").map((r) => r.label)).toEqual(["Heads", "3"]);
  });

  it("groups rows by group in sort order", () => {
    const rows = defaultOptionRows().map((r, i) => ({ ...r, id: String(i) }));
    const groups = groupOptions(rows, "our_plays");
    expect(groups.map((g) => g.key)).toEqual(["half_court", "blob", "slob"]);
    expect(groups[2].plays).toEqual(["2 up", "2 side", "3 up", "3 side"]);
  });

  it("slugifies new group names", () => {
    expect(slugify("Late Clock / ATO")).toBe("late_clock_ato");
    expect(slugify("Ação rápida")).toBe("acao_rapida");
    expect(slugify("!!!")).toBe("group");
  });
});

describe("turnovers", () => {
  it("counts turnovers per player and ignores non-turnovers", () => {
    const rows = turnoversBy(
      [
        poss("Turnover", 0, { turnover: true, tov_by: "#3 A", tov_forced_by: "#14 X" }),
        poss("2 up", 0, { turnover: true, tov_by: "#3 A" }),
        poss("2 up", 2, { tov_by: "#9 B" }),
        poss("Fist", 0, { turnover: true, tov_by: "#9 B", tov_forced_by: "#14 X" }),
      ],
      (p) => p.tov_by
    );
    expect(rows).toEqual([
      ["#3 A", 2],
      ["#9 B", 1],
    ]);
  });

  it("leaves loose turnovers out of play stats", () => {
    expect(playOf({ category: TURNOVER_CATEGORY, option: "Turnover" })).toBeNull();
    expect(actionOf({ category: TURNOVER_CATEGORY, option: "Turnover" })).toBeNull();
    expect(playOf({ category: "blob", option: "Short" })).toBe("BLOB Short");
  });
});

describe("lineups", () => {
  const lineup = (category: string, five: string[]) => ({
    kind: "lineup",
    category,
    on_court_ours: category === "ours" ? five : null,
    on_court_theirs: category === "theirs" ? five : null,
  });

  it("takes each team's latest five", () => {
    const events = [lineup("ours", ["a", "b", "c", "d", "e"]), lineup("theirs", ["1", "2", "3", "4", "5"]), lineup("ours", ["a", "b", "c", "d", "f"])];
    expect(currentLineups(events)).toEqual({ ours: ["a", "b", "c", "d", "f"], theirs: ["1", "2", "3", "4", "5"] });
    expect(currentLineups([])).toEqual({ ours: [], theirs: [] });
  });

  it("swaps subs into the outgoing players' spots", () => {
    expect(substitute(["a", "b", "c", "d", "e"], ["b", "e"], ["x", "y"])).toEqual(["a", "x", "c", "d", "y"]);
  });
});

describe("playerRanking", () => {
  const five = ["#3 A", "#9 B", "#10 C", "#11 D", "#12 E"];
  const base = { category: "half_court", option: "Fist", on_court_ours: five };

  it("weighs rules, errors and positives, and skips stand-ins", () => {
    const rows = playerRanking([
      { kind: "rule", category: "rule", option: "PnR D: Under", actor: "#3 A", penalty: 3 },
      { kind: "grade", category: "def_error", option: "No transition D", actor: "#3 A", score: -2 },
      { kind: "grade", category: "positive", option: "Deflection", actor: "#9 B", score: 1 },
      { kind: "our_off", ...base, actor: "#9 B", bad_shot: true, turnover: false },
      { kind: "our_off", ...base, turnover: true, tov_by: "#10 C", bad_shot: true, actor: "#10 C" },
      { kind: "our_def", ...base, turnover: true, tov_forced_by: "#10 C" },
      { kind: "grade", category: "positive", option: "Charge taken", actor: "#999 Team", score: 1 },
    ]);
    const by = Object.fromEntries(rows.map((r) => [r.player, r]));
    expect(by["#3 A"].total).toBe(-5);
    expect(by["#3 A"].byType).toEqual({ rule: -3, def_error: -2, off_error: 0, positive: 0 });
    expect(by["#9 B"].total).toBe(0);
    // A turnover isn't also a bad shot.
    expect(by["#10 C"].total).toBe(0);
    expect(by["#10 C"].items.map((i) => i[0]).sort()).toEqual(["Forced turnover", "Turnover"]);
    expect(by["#999 Team"]).toBeUndefined();
    expect(rows[0].player).not.toBe("#3 A");
  });

  it("counts possessions on the floor and points per 10 possessions", () => {
    const rows = playerRanking([
      { kind: "our_off", ...base, turnover: true, tov_by: "#3 A" },
      { kind: "our_def", ...base, turnover: false },
    ]);
    const a = rows.find((r) => r.player === "#3 A")!;
    expect(a.poss).toBe(2);
    expect(a.per10).toBe(-5);
    expect(rows.find((r) => r.player === "#12 E")!.per10).toBe(0);
  });
});
