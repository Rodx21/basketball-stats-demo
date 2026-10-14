export type GameEventType =
  | "fg_made_2"
  | "fg_missed_2"
  | "fg_made_3"
  | "fg_missed_3"
  | "ft_made"
  | "ft_missed"
  | "reb_off"
  | "reb_def"
  | "assist"
  | "steal"
  | "block"
  | "turnover"
  | "foul_personal"
  | "foul_technical"
  | "foul_drawn"
  | "shot_rejected"
  | "sub_in"
  | "sub_out";

export interface StatLine {
  minutes_played: number;
  pts: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  fouls_drawn: number;
  shots_rejected: number;
}

export const EMPTY_STAT_LINE: StatLine = {
  minutes_played: 0,
  pts: 0,
  fgm: 0,
  fga: 0,
  fg3m: 0,
  fg3a: 0,
  ftm: 0,
  fta: 0,
  oreb: 0,
  dreb: 0,
  ast: 0,
  stl: 0,
  blk: 0,
  tov: 0,
  pf: 0,
  fouls_drawn: 0,
  shots_rejected: 0,
};

/** Local optimistic delta applied on tap, before the server's trigger-computed row lands via Realtime. */
export function deltaForEvent(eventType: GameEventType): Partial<StatLine> {
  switch (eventType) {
    case "fg_made_2":
      return { pts: 2, fgm: 1, fga: 1 };
    case "fg_missed_2":
      return { fga: 1 };
    case "fg_made_3":
      return { pts: 3, fgm: 1, fga: 1, fg3m: 1, fg3a: 1 };
    case "fg_missed_3":
      return { fga: 1, fg3a: 1 };
    case "ft_made":
      return { pts: 1, ftm: 1, fta: 1 };
    case "ft_missed":
      return { fta: 1 };
    case "reb_off":
      return { oreb: 1 };
    case "reb_def":
      return { dreb: 1 };
    case "assist":
      return { ast: 1 };
    case "steal":
      return { stl: 1 };
    case "block":
      return { blk: 1 };
    case "turnover":
      return { tov: 1 };
    case "foul_personal":
    case "foul_technical":
      return { pf: 1 };
    case "foul_drawn":
      return { fouls_drawn: 1 };
    case "shot_rejected":
      return { shots_rejected: 1 };
    default:
      return {};
  }
}

export function applyDelta(
  line: StatLine,
  delta: Partial<StatLine>,
  sign: 1 | -1 = 1
): StatLine {
  const result = { ...line };
  for (const key of Object.keys(delta) as (keyof StatLine)[]) {
    result[key] = result[key] + sign * (delta[key] ?? 0);
  }
  return result;
}

export function pointsForEvent(eventType: GameEventType) {
  if (eventType === "fg_made_2") return 2;
  if (eventType === "fg_made_3") return 3;
  if (eventType === "ft_made") return 1;
  return 0;
}

export function periodLabel(period: number, totalPeriods: number) {
  return period <= totalPeriods ? `Q${period}` : `OT${period - totalPeriods}`;
}

export function eventForZone(zonePoints: 2 | 3, made: boolean): GameEventType {
  if (zonePoints === 3) return made ? "fg_made_3" : "fg_missed_3";
  return made ? "fg_made_2" : "fg_missed_2";
}

/** Folds a raw list of game_events into a box-score-shaped total, reusing the same
 * per-event rules as live-entry's optimistic update — useful for team-level totals
 * (e.g. an opponent with no individual players on the roster) where there's no
 * player_game_stats row to read from. */
export function aggregateEvents(events: { event_type: string }[]): StatLine {
  let line: StatLine = { ...EMPTY_STAT_LINE };
  for (const e of events) {
    line = applyDelta(line, deltaForEvent(e.event_type as GameEventType));
  }
  return line;
}
