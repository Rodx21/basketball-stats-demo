import { safeDiv } from "./basic";

export interface TeamPlayTotals {
  fga: number;
  oreb: number;
  tov: number;
  fta: number;
}

/** Standard estimated-possessions formula — same shape already used by uPER's league VOP factor. */
export function estimatePossessions(t: TeamPlayTotals) {
  return t.fga - t.oreb + t.tov + 0.44 * t.fta;
}

/** Averaging both sides' estimates (they should track each other) is the usual pace convention. */
export function pacePerGame(ownPossessions: number, oppPossessions: number, gamesPlayed: number) {
  return gamesPlayed > 0 ? (ownPossessions + oppPossessions) / 2 / gamesPlayed : 0;
}

/** Points scored per 100 estimated possessions — feed it (pointsAgainst, oppPossessions) for DRTG. */
export function rating(points: number, possessions: number) {
  return safeDiv(points, possessions) * 100;
}

/** OREB% = ownOreb / (ownOreb + opponent's DREB); DREB% = ownDreb / (ownDreb + opponent's OREB). */
export function reboundRate(ownRebounds: number, opponentOppositeRebounds: number) {
  return safeDiv(ownRebounds, ownRebounds + opponentOppositeRebounds);
}
