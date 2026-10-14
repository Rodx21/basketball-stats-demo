// Situation categories used both in the pre-game scouting notes and the live
// game tracker. Order and labels mirror the Word scouting doc template.

export type ScoutSide = "offense" | "defense";

export interface SituationCategory {
  key: string;
  label: string;
  // Which side of the ball the *opponent* is on in this situation.
  side: ScoutSide;
  // Tap options in the live tracker. Empty = options come from the opponent roster.
  options: readonly string[];
}

export const SITUATION_CATEGORIES: readonly SituationCategory[] = [
  { key: "transition", label: "Transition", side: "offense", options: ["Fast break", "Drag screen", "Early PnR", "Trailer", "Seal"] },
  { key: "m2m_defense", label: "M2M defense", side: "defense", options: ["M2M", "1-3-1", "3-2", "2-3", "Full press", "Zone press"] },
  { key: "def_rebounding", label: "Defensive rebounding", side: "defense", options: ["Our OREB", "Their DREB", "Box-out beat"] },
  {
    key: "pnr_coverage",
    label: "Pick & roll / pop coverage",
    side: "defense",
    options: ["Switch", "Hedge", "Step Out", "Double", "Flat", "Drop", "Ice / Side", "Push Under", "Push Between"],
  },
  { key: "weak_defenders", label: "Weak defenders", side: "defense", options: [] },
  { key: "low_post", label: "Low post", side: "offense", options: ["Post up", "Mismatch post", "Double in post"] },
  { key: "dho", label: "DHO / hand-off", side: "offense", options: ["DHO", "Zoom"] },
  { key: "off_screen", label: "Off screen / cross screen", side: "offense", options: ["Pistol", "Off screen", "Cross screen", "Flare"] },
  { key: "iso", label: "ISO", side: "offense", options: ["ISO after switch", "ISO top", "ISO wing", "ISO post"] },
  { key: "zone_specials", label: "Zone + specials", side: "defense", options: ["Nail", "Corner", "Overload", "Skip pass", "Short corner", "High post"] },
  { key: "last_seconds", label: "Last seconds / end of clock", side: "offense", options: ["Screen action", "ISO", "DHO", "Other"] },
  { key: "blob_slob", label: "BLOB / SLOB", side: "offense", options: ["BLOB", "SLOB"] },
];

export const PNR_TERMINOLOGY: readonly [string, string][] = [
  ["Switch", "passive/aggressive blitz"],
  ["Hedge", "blitz one step and back, parallel or diagonal"],
  ["Step Out", "blitz two steps to stop the guard"],
  ["Double", "double team the ball handler"],
  ["Flat Defense", "big stays attached to the screener"],
  ["Drop", "big contains near the free throw line"],
  ["Ice / Side", "guard closes one side, big plays flat, drop, or double"],
  ["Push Under", "big pushes his man, guard goes under"],
  ["Push Between", "big pushes his man, guard goes between"],
];

export function situationLabel(key: string): string {
  return SITUATION_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export function periodLabel(period: number): string {
  return period <= 4 ? `Q${period}` : `OT${period > 5 ? period - 4 : ""}`;
}

// ---- Possession tracking (points per possession) ----

export interface PlayGroup {
  key: string;
  label: string;
  plays: readonly string[];
}

// Our playbook, grouped the way the bench calls it.
export const OUR_PLAYS: readonly PlayGroup[] = [
  { key: "half_court", label: "Half court", plays: ["Motion up", "Motion side", "2 up", "2 side", "3 up", "3 side", "0", "Shoulder", "Shorts", "Transition", "No play", "PnR", "PnP"] },
  { key: "blob", label: "BLOB", plays: ["Heads", "3"] },
  { key: "slob", label: "SLOB", plays: ["2 up", "2 side", "3 up", "3 side"] },
];

// Opponent actions we defend, per possession.
export const THEIR_ACTIONS: readonly PlayGroup[] = [
  {
    key: "their_half_court",
    label: "Half court",
    plays: ["PnR", "Pick & pop", "DHO / Zoom", "Pistol", "Off screen", "ISO", "Post up", "Drive & kick", "Broken play"],
  },
  { key: "their_transition", label: "Transition", plays: ["Fast break", "Drag screen", "Early PnR"] },
  { key: "their_specials", label: "Specials", plays: ["2nd chance (OREB)", "BLOB", "SLOB", "End of clock"] },
];

export const THEIR_DEFENSES = ["M2M", "1-3-1", "3-2", "2-3", "Press"] as const;
export const OUR_DEFENSES = ["M2M", "Zone", "Press", "Switch all"] as const;

// Their pick-and-roll coverage, from the season terminology.
export const PNR_COVERAGES = PNR_TERMINOLOGY.map(([term]) => term.replace(" Defense", ""));

export interface Possession {
  option: string;
  category: string;
  points: number | null;
  turnover: boolean;
  defense: string | null;
  player: string | null;
  coverage: string | null;
  rules?: Record<string, string> | null;
  tov_by?: string | null;
  tov_forced_by?: string | null;
  // Our player who finished the possession (offense) — shooter or ball handler.
  actor?: string | null;
  // The play started and then stopped (execution problem), as opposed to completed.
  broken?: boolean;
  // Forced / outside-the-plan shot. Unflagged shots count as good shots.
  bad_shot?: boolean;
  period: number;
}

export interface PossessionStats {
  key: string;
  poss: number;
  pts: number;
  ppp: number;
  scored: number; // possessions with points > 0
  tov: number;
}

// Groups possessions by `keyOf` and returns points-per-possession, sorted by PPP desc.
export function pppBy(possessions: readonly Possession[], keyOf: (p: Possession) => string | null): PossessionStats[] {
  const groups = new Map<string, PossessionStats>();
  for (const p of possessions) {
    const key = keyOf(p);
    if (key == null) continue;
    const g = groups.get(key) ?? { key, poss: 0, pts: 0, ppp: 0, scored: 0, tov: 0 };
    g.poss += 1;
    g.pts += p.points ?? 0;
    if ((p.points ?? 0) > 0) g.scored += 1;
    if (p.turnover) g.tov += 1;
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, ppp: g.poss ? g.pts / g.poss : 0 }))
    .sort((a, b) => b.ppp - a.ppp || b.poss - a.poss);
}

export function totals(possessions: readonly Possession[]): PossessionStats {
  return pppBy(possessions, () => "all")[0] ?? { key: "all", poss: 0, pts: 0, ppp: 0, scored: 0, tov: 0 };
}

// Play label as stored/shown: set plays share names across groups ("2 up"), so prefix non-half-court groups.
export function playKey(p: Pick<Possession, "category" | "option">): string {
  if (p.category === "blob") return `BLOB ${p.option}`;
  if (p.category === "slob") return `SLOB ${p.option}`;
  return p.option;
}

// A turnover logged straight from the Turnover button, without a play/action.
export const TURNOVER_CATEGORY = "turnover";

// Key for per-play / per-action stats; loose turnovers aren't a play, so they're left out.
export function playOf(p: Pick<Possession, "category" | "option">): string | null {
  return p.category === TURNOVER_CATEGORY ? null : playKey(p);
}

export function actionOf(p: Pick<Possession, "category" | "option">): string | null {
  return p.category === TURNOVER_CATEGORY ? null : p.option;
}

// Turnover counts per player label (committed or forced), most first.
export function turnoversBy(possessions: readonly Possession[], keyOf: (p: Possession) => string | null | undefined): [string, number][] {
  const counts = new Map<string, number>();
  for (const p of possessions) {
    const key = p.turnover ? keyOf(p) : null;
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

// Minimum possessions before a row is trusted enough to call it working / not working.
export const MIN_SAMPLE = 2;

export interface Insights {
  best: PossessionStats[];
  worst: PossessionStats[];
}

// Top/bottom rows by PPP among rows with enough sample. "best" is from our point of
// view: highest PPP on offense, lowest PPP allowed on defense.
export function insights(rows: readonly PossessionStats[], side: "our_off" | "our_def", limit = 3): Insights {
  const trusted = rows.filter((r) => r.poss >= MIN_SAMPLE);
  const desc = [...trusted].sort((a, b) => b.ppp - a.ppp || b.poss - a.poss);
  const asc = [...trusted].sort((a, b) => a.ppp - b.ppp || b.poss - a.poss);
  const good = side === "our_off" ? desc : asc;
  const bad = side === "our_off" ? asc : desc;
  const best = good.slice(0, limit);
  const worst = bad.filter((r) => !best.includes(r)).slice(0, limit);
  return { best, worst };
}

// ---- Team rules (tagged per possession, compared by PPP) ----

export interface RuleOption {
  label: string;
  kept: boolean;
}

export interface TeamRule {
  key: string;
  label: string;
  options: readonly RuleOption[];
}

export const OUR_DEFENSE_RULES: readonly TeamRule[] = [
  {
    key: "screen",
    label: "Screen: follow / bully through",
    options: [
      { label: "Follow through", kept: true },
      { label: "Bully through", kept: true },
      { label: "Went under / other", kept: false },
    ],
  },
  {
    key: "big",
    label: "Big: hedge on PnR",
    options: [
      { label: "Hedge", kept: true },
      { label: "No hedge", kept: false },
    ],
  },
];

export function ruleKept(rule: TeamRule, value: string | undefined): boolean | null {
  const option = rule.options.find((o) => o.label === value);
  return option ? option.kept : null;
}

export interface RuleStats {
  rule: TeamRule;
  kept: PossessionStats | null;
  broken: PossessionStats | null;
}

// For each rule, PPP on possessions where it was kept vs broken (untagged possessions are ignored).
export function ruleStats(possessions: readonly Possession[], rules: readonly TeamRule[]): RuleStats[] {
  return rules.map((rule) => {
    const rows = pppBy(possessions, (p) => {
      const kept = ruleKept(rule, p.rules?.[rule.key]);
      return kept == null ? null : kept ? "kept" : "broken";
    });
    return {
      rule,
      kept: rows.find((r) => r.key === "kept") ?? null,
      broken: rows.find((r) => r.key === "broken") ?? null,
    };
  });
}

// ---- Editable live buttons (stored in live_options) ----

export type OptionList = "our_plays" | "their_actions" | "their_defenses" | "our_defenses";

export interface OptionRow {
  id: string;
  list: OptionList;
  group_key: string;
  group_label: string;
  label: string;
  sort_order: number;
}

// Rows used to seed live_options the first time a user opens the live screen.
export function defaultOptionRows(): Omit<OptionRow, "id">[] {
  const rows: Omit<OptionRow, "id">[] = [];
  const addGroups = (list: OptionList, groups: readonly PlayGroup[]) =>
    groups.forEach((g) => g.plays.forEach((label) => rows.push({ list, group_key: g.key, group_label: g.label, label, sort_order: rows.length })));
  const addFlat = (list: OptionList, labels: readonly string[]) =>
    labels.forEach((label) => rows.push({ list, group_key: "", group_label: "", label, sort_order: rows.length }));
  addGroups("our_plays", OUR_PLAYS);
  addGroups("their_actions", THEIR_ACTIONS);
  addFlat("their_defenses", THEIR_DEFENSES);
  addFlat("our_defenses", OUR_DEFENSES);
  return rows;
}

// Groups one list's rows into button groups, keeping first-seen group order.
export function groupOptions(rows: readonly OptionRow[], list: OptionList): (PlayGroup & { items: OptionRow[] })[] {
  const groups = new Map<string, PlayGroup & { items: OptionRow[] }>();
  for (const row of [...rows].filter((r) => r.list === list).sort((a, b) => a.sort_order - b.sort_order)) {
    const g = groups.get(row.group_key) ?? { key: row.group_key, label: row.group_label, plays: [], items: [] };
    g.items.push(row);
    g.plays = g.items.map((i) => i.label);
    groups.set(row.group_key, g);
  }
  return [...groups.values()];
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "group"
  );
}

// ---- Players, lineups and accountability ----

// Columns read back for every live event.
export const EVENT_SELECT =
  "id, kind, category, option, outcome, points, turnover, defense, player, coverage, rules, tov_by, tov_forced_by, actor, broken, bad_shot, on_court_ours, on_court_theirs, penalty, score, period, note, created_at";

// Stand-ins for actions that aren't one real player's (bench call, team violation...).
export const COACH = "Coach";
export const TEAM_PLAYER = "#999 Team";
export const STAND_INS: readonly string[] = [COACH, TEAM_PLAYER];

export type TeamSide = "ours" | "theirs";

export interface Lineups {
  ours: string[];
  theirs: string[];
}

interface LineupSource {
  kind: string;
  category: string;
  on_court_ours?: string[] | null;
  on_court_theirs?: string[] | null;
}

// Who is on the floor now: each team's five from its latest starters / substitution event.
export function currentLineups(events: readonly LineupSource[]): Lineups {
  const out: Lineups = { ours: [], theirs: [] };
  for (const e of events) {
    if (e.kind !== "lineup") continue;
    if (e.category === "ours") out.ours = e.on_court_ours ?? [];
    if (e.category === "theirs") out.theirs = e.on_court_theirs ?? [];
  }
  return out;
}

// Applies a substitution: players in `outs` leave, `ins` take their places (order kept).
export function substitute(onCourt: readonly string[], outs: readonly string[], ins: readonly string[]): string[] {
  const queue = [...ins];
  return onCourt.map((p) => (outs.includes(p) ? (queue.shift() ?? p) : p)).concat(queue);
}

export interface AccountabilityRule {
  id: string;
  label: string;
  points: number;
  sort_order: number;
}

// ---- Internal player ranking ----
// Rules weigh most (their own points, -3 by default), then defensive errors (-2),
// offensive errors (-1); positive plays add +1. Following a rule earns nothing.

export type GradeType = "rule" | "def_error" | "off_error" | "positive";

export const GRADE_LABEL: Record<GradeType, string> = {
  rule: "Rules",
  def_error: "Def errors",
  off_error: "Off errors",
  positive: "Positives",
};

export interface GradeAction {
  label: string;
  type: "def_error" | "positive";
  score: number;
}

// Logged by hand from the live screen. Bad shots, turnovers and forced turnovers
// come from the possession log, so they have no button here.
export const GRADE_ACTIONS: readonly GradeAction[] = [
  { label: "No transition D", type: "def_error", score: -2 },
  { label: "OREB given (no box out)", type: "def_error", score: -2 },
  { label: "Closeout / help missed", type: "def_error", score: -2 },
  { label: "Charge taken", type: "positive", score: 1 },
  { label: "Deflection", type: "positive", score: 1 },
  { label: "OREB / box out", type: "positive", score: 1 },
];

export const BAD_SHOT_SCORE = -1;
export const TURNOVER_SCORE = -1;
export const FORCED_TURNOVER_SCORE = 1;

export interface RankEvent {
  kind: string;
  category: string;
  option: string;
  actor?: string | null;
  penalty?: number | null;
  score?: number | null;
  turnover?: boolean;
  bad_shot?: boolean;
  tov_by?: string | null;
  tov_forced_by?: string | null;
  on_court_ours?: string[] | null;
}

export interface RankRow {
  player: string;
  total: number;
  // Possessions (ours + theirs) he was on the floor for, from the lineup snapshots.
  poss: number;
  per10: number | null;
  byType: Record<GradeType, number>;
  // What happened, most frequent first: [label, times, points].
  items: [string, number, number][];
}

// Every scored action for one event: [player, type, label, points].
export function gradesOf(e: RankEvent): [string, GradeType, string, number][] {
  if (e.kind === "rule" && e.actor) return [[e.actor, "rule", e.option, -(e.penalty ?? 0)]];
  if (e.kind === "grade" && e.actor && (e.category === "def_error" || e.category === "positive")) return [[e.actor, e.category, e.option, e.score ?? 0]];
  if (e.kind === "our_off") {
    const out: [string, GradeType, string, number][] = [];
    if (e.bad_shot && !e.turnover && e.actor) out.push([e.actor, "off_error", "Bad shot", BAD_SHOT_SCORE]);
    if (e.turnover && e.tov_by) out.push([e.tov_by, "off_error", "Turnover", TURNOVER_SCORE]);
    return out;
  }
  if (e.kind === "our_def" && e.turnover && e.tov_forced_by) return [[e.tov_forced_by, "positive", "Forced turnover", FORCED_TURNOVER_SCORE]];
  return [];
}

// Ranking of our players, best first. Coach / #999 stand-ins are left out.
export function playerRanking(events: readonly RankEvent[]): RankRow[] {
  const rows = new Map<string, RankRow & { counts: Map<string, [number, number]> }>();
  const row = (player: string) => {
    let r = rows.get(player);
    if (!r) {
      r = { player, total: 0, poss: 0, per10: null, byType: { rule: 0, def_error: 0, off_error: 0, positive: 0 }, items: [], counts: new Map() };
      rows.set(player, r);
    }
    return r;
  };

  for (const e of events) {
    if (e.kind === "our_off" || e.kind === "our_def") {
      for (const p of e.on_court_ours ?? []) if (!STAND_INS.includes(p)) row(p).poss += 1;
    }
    for (const [player, type, label, points] of gradesOf(e)) {
      if (STAND_INS.includes(player)) continue;
      const r = row(player);
      r.total += points;
      r.byType[type] += points;
      const [n, pts] = r.counts.get(label) ?? [0, 0];
      r.counts.set(label, [n + 1, pts + points]);
    }
  }

  return [...rows.values()]
    .map(({ counts, ...r }) => ({
      ...r,
      per10: r.poss > 0 ? (r.total / r.poss) * 10 : null,
      items: [...counts.entries()].map(([label, [n, pts]]) => [label, n, pts] as [string, number, number]).sort((a, b) => b[1] - a[1]),
    }))
    .sort((a, b) => b.total - a.total || (b.per10 ?? 0) - (a.per10 ?? 0));
}
