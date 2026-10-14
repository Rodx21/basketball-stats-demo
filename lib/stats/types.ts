export interface BoxScoreLine {
  minutesPlayed: number;
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
}

export interface TeamTotals {
  minutes: number;
  fgm: number;
  fga: number;
  ftm: number;
  fta: number;
  ast: number;
  tov: number;
  pace: number;
}

export interface LeagueSeasonAverages {
  lgPace: number;
  lgFg: number;
  lgFga: number;
  lgFt: number;
  lgFta: number;
  lg3p: number;
  lgAst: number;
  lgTov: number;
  lgOrb: number;
  lgTrb: number;
  lgPf: number;
  lgPts: number;
}
