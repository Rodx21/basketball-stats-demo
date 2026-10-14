export interface StatTotals {
  minutes: number;
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
  foulsDrawn: number;
  shotsRejected: number;
}

export const EMPTY_TOTALS: StatTotals = {
  minutes: 0, pts: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0,
  oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0,
  foulsDrawn: 0, shotsRejected: 0,
};

export interface StatLikeRow {
  minutes_played: number | null; pts: number | null; fgm: number | null; fga: number | null;
  fg3m: number | null; fg3a: number | null; ftm: number | null; fta: number | null;
  oreb: number | null; dreb: number | null; ast: number | null; stl: number | null;
  blk: number | null; tov: number | null; pf: number | null;
  fouls_drawn?: number | null; shots_rejected?: number | null;
}

const n = (v: number | null | undefined) => v ?? 0;

export function sumLine(acc: StatTotals, r: StatLikeRow): StatTotals {
  return {
    minutes: acc.minutes + Number(r.minutes_played ?? 0),
    pts: acc.pts + n(r.pts),
    fgm: acc.fgm + n(r.fgm),
    fga: acc.fga + n(r.fga),
    fg3m: acc.fg3m + n(r.fg3m),
    fg3a: acc.fg3a + n(r.fg3a),
    ftm: acc.ftm + n(r.ftm),
    fta: acc.fta + n(r.fta),
    oreb: acc.oreb + n(r.oreb),
    dreb: acc.dreb + n(r.dreb),
    ast: acc.ast + n(r.ast),
    stl: acc.stl + n(r.stl),
    blk: acc.blk + n(r.blk),
    tov: acc.tov + n(r.tov),
    pf: acc.pf + n(r.pf),
    foulsDrawn: acc.foulsDrawn + n(r.fouls_drawn),
    shotsRejected: acc.shotsRejected + n(r.shots_rejected),
  };
}

export function sumLines(rows: StatLikeRow[]): StatTotals {
  return rows.reduce<StatTotals>((acc, r) => sumLine(acc, r), { ...EMPTY_TOTALS });
}
