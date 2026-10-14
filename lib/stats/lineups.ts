import { pointsForEvent, type GameEventType } from "../events";

export interface LineupEvent {
  event_type: string;
  team_id: string;
  player_id: string | null;
  created_at: string;
}

export interface LineupStint {
  lineup: string[];
  us: number;
  them: number;
}

/**
 * Reconstructs which 5 own-team players were on court, stint by stint, for a single
 * game — the on-court set only resets at the start of a new game, so events from
 * different games must be passed in separately (never mixed in one call). A stint is
 * only recorded while exactly 5 own-team players are on court; anything else (a data
 * gap, a missed substitution) is dropped rather than attributed to a wrong or
 * incomplete lineup.
 */
export function computeLineupStints(events: LineupEvent[], ownTeamId: string): LineupStint[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const onCourt = new Set<string>();
  let us = 0;
  let them = 0;
  const stints: LineupStint[] = [];

  function flush() {
    if (onCourt.size === 5) {
      stints.push({ lineup: [...onCourt].sort(), us, them });
    }
    us = 0;
    them = 0;
  }

  for (const e of sorted) {
    if (e.event_type === "sub_in" && e.player_id && e.team_id === ownTeamId) {
      flush();
      onCourt.add(e.player_id);
      continue;
    }
    if (e.event_type === "sub_out" && e.player_id && e.team_id === ownTeamId) {
      flush();
      onCourt.delete(e.player_id);
      continue;
    }
    const pts = pointsForEvent(e.event_type as GameEventType);
    if (pts > 0) {
      if (e.team_id === ownTeamId) us += pts;
      else them += pts;
    }
  }
  flush();

  return stints;
}

export interface LineupSummary {
  playerIds: string[];
  stints: number;
  us: number;
  them: number;
  plusMinus: number;
}

/** Merges stints (across as many games as you like) into one row per distinct 5-man lineup. */
export function summarizeLineups(allStints: LineupStint[]): LineupSummary[] {
  const map = new Map<string, LineupSummary>();

  for (const s of allStints) {
    const key = s.lineup.join(",");
    const existing = map.get(key);
    if (existing) {
      existing.stints += 1;
      existing.us += s.us;
      existing.them += s.them;
      existing.plusMinus = existing.us - existing.them;
    } else {
      map.set(key, { playerIds: s.lineup, stints: 1, us: s.us, them: s.them, plusMinus: s.us - s.them });
    }
  }

  return [...map.values()].sort((a, b) => b.stints - a.stints);
}

export type LineupMetric = "plusMinus" | "us" | "them";

/** Ranks lineups by a metric, dropping tiny samples (default: fewer than 2 stints)
 * that would otherwise dominate the extremes on noise alone. */
export function topLineupsBy(
  summaries: LineupSummary[],
  metric: LineupMetric,
  opts: { minStints?: number; limit?: number; ascending?: boolean } = {}
): LineupSummary[] {
  const minStints = opts.minStints ?? 2;
  const limit = opts.limit ?? 5;

  return summaries
    .filter((s) => s.stints >= minStints)
    .sort((a, b) => (opts.ascending ? a[metric] - b[metric] : b[metric] - a[metric]))
    .slice(0, limit);
}

export interface PlayerPlusMinus {
  playerId: string;
  stints: number;
  us: number;
  them: number;
  plusMinus: number;
}

/** Same stint data as summarizeLineups, credited to each individual player instead
 * of the five-man unit — every stint counts once for each of the 5 players in it. */
export function summarizePlayerPlusMinus(allStints: LineupStint[]): PlayerPlusMinus[] {
  const map = new Map<string, PlayerPlusMinus>();

  for (const s of allStints) {
    for (const playerId of s.lineup) {
      const existing = map.get(playerId);
      if (existing) {
        existing.stints += 1;
        existing.us += s.us;
        existing.them += s.them;
        existing.plusMinus = existing.us - existing.them;
      } else {
        map.set(playerId, { playerId, stints: 1, us: s.us, them: s.them, plusMinus: s.us - s.them });
      }
    }
  }

  return [...map.values()].sort((a, b) => b.plusMinus - a.plusMinus);
}
