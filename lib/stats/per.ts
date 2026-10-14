import { safeDiv } from "./basic";
import type { BoxScoreLine, LeagueSeasonAverages, TeamTotals } from "./types";

export interface LeagueFactors {
  factor: number;
  vop: number;
  drbPct: number;
}

/** Fatores de liga (por temporada) — pré-requisito pro uPER */
export const leagueFactors = (lg: LeagueSeasonAverages): LeagueFactors => {
  const factor = 2 / 3 - (0.5 * safeDiv(lg.lgAst, lg.lgFg)) / (2 * safeDiv(lg.lgFg, lg.lgFt));
  const vop = safeDiv(lg.lgPts, lg.lgFga - lg.lgOrb + lg.lgTov + 0.44 * lg.lgFta);
  const drbPct = safeDiv(lg.lgTrb - lg.lgOrb, lg.lgTrb);
  return { factor, vop, drbPct };
};

/**
 * uPER — PER não ajustado (sem normalização de pace/liga pra média 15.00).
 * Use quando você só acompanha o próprio elenco, sem médias da liga inteira.
 * Ainda assim precisa de `LeagueFactors` (derivados de `league_season_averages`)
 * e dos totais do time no jogo/temporada em questão.
 */
export const uPer = (
  l: Pick<
    BoxScoreLine,
    | "minutesPlayed"
    | "fg3m"
    | "ast"
    | "fgm"
    | "fga"
    | "ftm"
    | "fta"
    | "tov"
    | "oreb"
    | "dreb"
    | "stl"
    | "blk"
    | "pf"
  >,
  team: Pick<TeamTotals, "ast" | "fgm">,
  lg: LeagueSeasonAverages,
  { factor, vop, drbPct }: LeagueFactors
) => {
  const trb = l.oreb + l.dreb;
  const teamAstToFg = safeDiv(team.ast, team.fgm);

  const raw =
    l.fg3m +
    (2 / 3) * l.ast +
    (2 - factor * teamAstToFg) * l.fgm +
    l.ftm * 0.5 * (1 + (1 - teamAstToFg) + (2 / 3) * teamAstToFg) -
    vop * l.tov -
    vop * drbPct * (l.fga - l.fgm) -
    vop * 0.44 * (0.44 + 0.56 * drbPct) * (l.fta - l.ftm) +
    vop * (1 - drbPct) * (trb - l.oreb) +
    vop * drbPct * l.oreb +
    vop * l.stl +
    vop * drbPct * l.blk -
    l.pf * (safeDiv(lg.lgFt, lg.lgPf) - 0.44 * safeDiv(lg.lgFta, lg.lgPf) * vop);

  return safeDiv(raw, l.minutesPlayed);
};
