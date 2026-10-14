import { pointsForEvent, type GameEventType } from "./events";
import { SHOT_ZONES } from "./shotZones";

export interface ShotEventRow {
  event_type: string;
  shot_zone: string | null;
  period: number;
  half: number;
}

export interface ZoneStat {
  makes: number;
  attempts: number;
}

const SHOT_EVENT_TYPES = new Set(["fg_made_2", "fg_missed_2", "fg_made_3", "fg_missed_3"]);

function isMade(eventType: string) {
  return eventType === "fg_made_2" || eventType === "fg_made_3";
}

export function aggregateZones(events: ShotEventRow[]): Record<string, ZoneStat> {
  const result: Record<string, ZoneStat> = {};
  for (const zone of SHOT_ZONES) result[zone.id] = { makes: 0, attempts: 0 };

  for (const e of events) {
    if (!e.shot_zone || !SHOT_EVENT_TYPES.has(e.event_type)) continue;
    const bucket = result[e.shot_zone];
    if (!bucket) continue;
    bucket.attempts += 1;
    if (isMade(e.event_type)) bucket.makes += 1;
  }

  return result;
}

/** Zone tapped most often, and — among zones with a minimum sample — the most efficient one. */
export function topZones(zoneStats: Record<string, ZoneStat>) {
  const entries = Object.entries(zoneStats).filter(([, s]) => s.attempts > 0);

  const favorite = entries.reduce<[string, ZoneStat] | null>(
    (best, entry) => (!best || entry[1].attempts > best[1].attempts ? entry : best),
    null
  );

  const MIN_SAMPLE = 2;
  const withSample = entries.filter(([, s]) => s.attempts >= MIN_SAMPLE);

  const best = withSample.reduce<[string, ZoneStat] | null>((best, entry) => {
    const pct = entry[1].makes / entry[1].attempts;
    const bestPct = best ? best[1].makes / best[1].attempts : -1;
    return !best || pct > bestPct ? entry : best;
  }, null);

  const worst = withSample.reduce<[string, ZoneStat] | null>((worst, entry) => {
    const pct = entry[1].makes / entry[1].attempts;
    const worstPct = worst ? worst[1].makes / worst[1].attempts : 2;
    return !worst || pct < worstPct ? entry : worst;
  }, null);

  return {
    favoriteZoneId: favorite?.[0] ?? null,
    favoriteZoneStat: favorite?.[1] ?? null,
    bestZoneId: best?.[0] ?? null,
    bestZoneStat: best?.[1] ?? null,
    worstZoneId: worst?.[0] ?? null,
    worstZoneStat: worst?.[1] ?? null,
  };
}

export interface PeriodStat {
  key: number;
  pts: number;
  fgm: number;
  fga: number;
  tov: number;
}

export function aggregateByPeriod(events: ShotEventRow[]): PeriodStat[] {
  const map = new Map<number, PeriodStat>();

  for (const e of events) {
    if (!map.has(e.period)) map.set(e.period, { key: e.period, pts: 0, fgm: 0, fga: 0, tov: 0 });
    const bucket = map.get(e.period)!;

    if (SHOT_EVENT_TYPES.has(e.event_type)) {
      bucket.fga += 1;
      if (isMade(e.event_type)) bucket.fgm += 1;
    }
    bucket.pts += pointsForEvent(e.event_type as GameEventType);
    if (e.event_type === "turnover") bucket.tov += 1;
  }

  return [...map.values()].sort((a, b) => a.key - b.key);
}

export interface HalfStat {
  half: 1 | 2;
  pts: number;
  fgm: number;
  fga: number;
  tov: number;
}

export function aggregateByHalf(events: ShotEventRow[]): HalfStat[] {
  const buckets: Record<1 | 2, HalfStat> = {
    1: { half: 1, pts: 0, fgm: 0, fga: 0, tov: 0 },
    2: { half: 2, pts: 0, fgm: 0, fga: 0, tov: 0 },
  };

  for (const e of events) {
    const half = e.half === 2 ? 2 : 1;
    const bucket = buckets[half];
    if (SHOT_EVENT_TYPES.has(e.event_type)) {
      bucket.fga += 1;
      if (isMade(e.event_type)) bucket.fgm += 1;
    }
    bucket.pts += pointsForEvent(e.event_type as GameEventType);
    if (e.event_type === "turnover") bucket.tov += 1;
  }

  return [buckets[1], buckets[2]];
}

export interface ClutchEventRow extends ShotEventRow {
  game_id: string;
}

export interface ClutchStat {
  pts: number;
  fgm: number;
  fga: number;
}

/**
 * "Clutch" = the final period of regulation, second half only (e.g. Q4, last ~5 min).
 * `regulationPeriods` maps game_id -> that game's regulation period count (games.periods),
 * so a game that went to overtime doesn't shift what counts as "last period."
 */
export function aggregateClutch(
  events: ClutchEventRow[],
  regulationPeriods: Record<string, number>
): ClutchStat {
  const stat: ClutchStat = { pts: 0, fgm: 0, fga: 0 };

  for (const e of events) {
    const lastPeriod = regulationPeriods[e.game_id] ?? 4;
    if (e.period !== lastPeriod || e.half !== 2) continue;

    if (SHOT_EVENT_TYPES.has(e.event_type)) {
      stat.fga += 1;
      if (isMade(e.event_type)) stat.fgm += 1;
    }
    stat.pts += pointsForEvent(e.event_type as GameEventType);
  }

  return stat;
}
