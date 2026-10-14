import type { ZoneStat } from "@/lib/shotChart";

export interface GameMargin {
  gameId: string;
  opponentName: string;
  us: number;
  them: number;
  margin: number;
  win: boolean;
}

export interface SeasonPlayerRow {
  id: string;
  fullName: string;
  jersey: number | null;
  position: string | null;
  gp: number;
  min: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  topg: number;
  fgPct: number;
  fg3Pct: number;
  ftPct: number;
  efgPct: number;
  tsPct: number;
  astToTov: number;
  gmScPerGame: number;
  uper: number;
  pirPerGame: number;
  plusMinusPerGame: number;
}

export interface Quarter {
  quarter: number;
  us: number;
  them: number;
}

export interface TeamRatings {
  pace: number;
  offRating: number;
  defRating: number;
  reboundDiffPerGame: number;
  orebPct: number;
  drebPct: number;
}

export interface LineupRow {
  playerIds: string[];
  labels: string[];
  stints: number;
  us: number;
  them: number;
  plusMinus: number;
}

export interface LineupGroups {
  mostUsed: LineupRow[];
  bestPlusMinus: LineupRow[];
  mostPoints: LineupRow[];
  fewestAllowed: LineupRow[];
}

export interface TeamDashboardClientProps {
  seasonName: string;
  record: { wins: number; losses: number };
  netRating: number;
  lastFive: GameMargin[];
  gamesPlayed: number;
  pointsForPerGame: number;
  pointsAgainstPerGame: number;
  teamFgPct: number;
  bestMargin: number;
  gameMargins: GameMargin[];
  quarters: Quarter[];
  teamRatings: TeamRatings;
  lineups: LineupGroups;
  zoneStats: Record<string, ZoneStat>;
  seasonStats: SeasonPlayerRow[];
}
