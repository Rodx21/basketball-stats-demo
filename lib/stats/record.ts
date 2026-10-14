export interface RecordInput {
  isHome: boolean;
  homeScore: number | null;
  awayScore: number | null;
}

export interface RecordTotals {
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

/** Single source of truth for "what counts as a win" — a tie (equal score) counts as neither. */
export function summarizeRecord(games: RecordInput[]): RecordTotals {
  let wins = 0;
  let losses = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;

  for (const g of games) {
    const us = g.isHome ? g.homeScore ?? 0 : g.awayScore ?? 0;
    const them = g.isHome ? g.awayScore ?? 0 : g.homeScore ?? 0;
    pointsFor += us;
    pointsAgainst += them;
    if (us > them) wins += 1;
    else if (us < them) losses += 1;
  }

  return { wins, losses, pointsFor, pointsAgainst };
}

export type GameResult = "W" | "L" | "T";

export interface Streak {
  type: GameResult | "none";
  count: number;
}

/** `results` must be in chronological order (oldest first) — the streak is measured
 * back from the most recent result. A tie breaks the streak, same as a form guide. */
export function computeStreak(results: GameResult[]): Streak {
  if (results.length === 0) return { type: "none", count: 0 };

  const last = results[results.length - 1];
  let count = 0;
  for (let i = results.length - 1; i >= 0 && results[i] === last; i--) count += 1;

  return { type: last, count };
}
