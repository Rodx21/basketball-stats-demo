import type { StatTotals } from "./aggregate";

/**
 * PIR (Performance Index Rating) — FIBA/EuroLeague's single-number box score summary.
 * PIR = (PTS + REB + AST + STL + BLK + Fouls Drawn) − (Missed FG + Missed FT + TOV + Shots Rejected + Fouls Committed)
 */
export function pir(
  l: Pick<
    StatTotals,
    "pts" | "oreb" | "dreb" | "ast" | "stl" | "blk" | "foulsDrawn" | "fgm" | "fga" | "ftm" | "fta" | "tov" | "shotsRejected" | "pf"
  >
) {
  const positives = l.pts + l.oreb + l.dreb + l.ast + l.stl + l.blk + l.foulsDrawn;
  const negatives = (l.fga - l.fgm) + (l.fta - l.ftm) + l.tov + l.shotsRejected + l.pf;
  return positives - negatives;
}
