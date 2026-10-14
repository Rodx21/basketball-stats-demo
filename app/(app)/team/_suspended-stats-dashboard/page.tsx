import { TeamDashboardClient } from "@/components/TeamDashboardClient";
import { createClient } from "@/lib/supabase/server";
import { aggregateByPeriod, aggregateZones } from "@/lib/shotChart";
import { aggregateEvents } from "@/lib/events";
import { sumLines } from "@/lib/stats/aggregate";
import { astToTov, efgPct, fg3Pct, fgPct, ftPct, gameScore, tsPct } from "@/lib/stats/basic";
import { computeLineupStints, summarizeLineups, summarizePlayerPlusMinus, topLineupsBy } from "@/lib/stats/lineups";
import { leagueFactors, uPer } from "@/lib/stats/per";
import { pir } from "@/lib/stats/pir";
import { summarizeRecord } from "@/lib/stats/record";
import { estimatePossessions, pacePerGame, rating, reboundRate } from "@/lib/stats/ratings";
import type { LeagueSeasonAverages } from "@/lib/stats/types";

export default async function TeamDashboardPage() {
  const supabase = await createClient();

  const { data: ownTeam } = await supabase
    .from("teams")
    .select("id, name")
    .eq("is_own_team", true)
    .maybeSingle();

  if (!ownTeam) {
    return (
      <div className="mx-auto max-w-[1280px] py-14">
        <h1 className="text-[56px] font-bold uppercase leading-[0.94] tracking-[0.03em] text-white">Dashboard</h1>
        <p className="mt-4 text-[15px] text-white/50">Set up your team in Roster first.</p>
      </div>
    );
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("name")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: finalGamesRaw } = await supabase
    .from("games")
    .select(
      "id, game_date, home_score, away_score, home_team:teams!games_home_team_id_fkey(id, name), away_team:teams!games_away_team_id_fkey(id, name)"
    )
    .eq("status", "final")
    .or(`home_team_id.eq.${ownTeam.id},away_team_id.eq.${ownTeam.id}`)
    .order("game_date", { ascending: true });

  const finalGames = (finalGamesRaw ?? []).filter((g) => g.home_team && g.away_team);
  const finalGameIds = finalGames.map((g) => g.id);

  const gameMargins: {
    gameId: string;
    opponentName: string;
    us: number;
    them: number;
    margin: number;
    win: boolean;
  }[] = [];

  for (const g of finalGames) {
    const ownIsHome = g.home_team!.id === ownTeam.id;
    const own = ownIsHome ? g.home_score ?? 0 : g.away_score ?? 0;
    const opp = ownIsHome ? g.away_score ?? 0 : g.home_score ?? 0;
    const opponent = ownIsHome ? g.away_team! : g.home_team!;
    gameMargins.push({
      gameId: g.id,
      opponentName: opponent.name,
      us: own,
      them: opp,
      margin: own - opp,
      win: own > opp,
    });
  }

  const { wins, losses, pointsFor, pointsAgainst } = summarizeRecord(
    finalGames.map((g) => ({
      isHome: g.home_team!.id === ownTeam.id,
      homeScore: g.home_score,
      awayScore: g.away_score,
    }))
  );

  const gamesPlayed = finalGames.length;
  const netRating = gamesPlayed > 0 ? (pointsFor - pointsAgainst) / gamesPlayed : 0;
  const bestMargin = gameMargins.length > 0 ? Math.max(...gameMargins.map((g) => g.margin)) : 0;
  const lastFive = gameMargins.slice(-5);

  const { data: ownEvents } = await supabase
    .from("game_events")
    .select("event_type, shot_zone, period, half")
    .eq("team_id", ownTeam.id)
    .in("game_id", finalGameIds.length > 0 ? finalGameIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: oppEvents } = await supabase
    .from("game_events")
    .select("event_type, shot_zone, period, half")
    .neq("team_id", ownTeam.id)
    .in("game_id", finalGameIds.length > 0 ? finalGameIds : ["00000000-0000-0000-0000-000000000000"]);

  const zoneStats = aggregateZones(ownEvents ?? []);
  const ourPeriodStats = aggregateByPeriod(ownEvents ?? []);
  const theirPeriodStats = aggregateByPeriod(oppEvents ?? []);

  const quarters = [1, 2, 3, 4].map((q) => ({
    quarter: q,
    us: ourPeriodStats.find((p) => p.key === q)?.pts ?? 0,
    them: theirPeriodStats.find((p) => p.key === q)?.pts ?? 0,
  }));

  // Team-level ratings — computed straight from game_events (not player_game_stats), since
  // an opponent with no individual players on the roster still has team_id-tagged events.
  const ownPlayTotals = aggregateEvents(ownEvents ?? []);
  const oppPlayTotals = aggregateEvents(oppEvents ?? []);
  const ownPoss = estimatePossessions(ownPlayTotals);
  const oppPoss = estimatePossessions(oppPlayTotals);
  const pace = pacePerGame(ownPoss, oppPoss, gamesPlayed);
  const offRating = rating(pointsFor, ownPoss);
  const defRating = rating(pointsAgainst, oppPoss);
  const reboundDiffPerGame =
    gamesPlayed > 0
      ? (ownPlayTotals.oreb + ownPlayTotals.dreb - oppPlayTotals.oreb - oppPlayTotals.dreb) / gamesPlayed
      : 0;
  const orebPct = reboundRate(ownPlayTotals.oreb, oppPlayTotals.dreb);
  const drebPct = reboundRate(ownPlayTotals.dreb, oppPlayTotals.oreb);

  // On-court lineups — the on-court set only ever resets at the start of a new game,
  // so each final game's events are grouped and walked separately before merging.
  const { data: lineupEventsRaw } = await supabase
    .from("game_events")
    .select("game_id, event_type, team_id, player_id, created_at")
    .in("game_id", finalGameIds.length > 0 ? finalGameIds : ["00000000-0000-0000-0000-000000000000"]);

  const lineupEventsByGame = new Map<string, typeof lineupEventsRaw>();
  for (const e of lineupEventsRaw ?? []) {
    const bucket = lineupEventsByGame.get(e.game_id) ?? [];
    bucket.push(e);
    lineupEventsByGame.set(e.game_id, bucket);
  }
  const allLineupStints = [...lineupEventsByGame.values()].flatMap((gameEvents) =>
    computeLineupStints(
      (gameEvents ?? []).filter((e): e is typeof e & { created_at: string } => e.created_at !== null),
      ownTeam.id
    )
  );
  const lineupSummaries = summarizeLineups(allLineupStints);
  const playerPlusMinus = new Map(
    summarizePlayerPlusMinus(allLineupStints).map((p) => [p.playerId, p.plusMinus])
  );

  const { data: players } = await supabase
    .from("players")
    .select(
      "id, full_name, jersey_number, position, player_game_stats!inner(minutes_played, pts, fgm, fga, fg3m, fg3a, ftm, fta, oreb, dreb, ast, stl, blk, tov, pf, fouls_drawn, shots_rejected, games!inner(status))"
    )
    .eq("team_id", ownTeam.id)
    .eq("active", true)
    .eq("player_game_stats.games.status", "final");

  const roster = players ?? [];

  const teamFgm = roster.reduce((sum, p) => sum + (p.player_game_stats ?? []).reduce((s, r) => s + (r.fgm ?? 0), 0), 0);
  const teamFga = roster.reduce((sum, p) => sum + (p.player_game_stats ?? []).reduce((s, r) => s + (r.fga ?? 0), 0), 0);
  const teamFgPct = teamFga > 0 ? teamFgm / teamFga : 0;

  // Team season totals double as the "league" reference for uPER (no multi-team league data yet).
  const teamTotals = sumLines(roster.flatMap((p) => p.player_game_stats ?? []));
  const lg: LeagueSeasonAverages = {
    lgPace: 0,
    lgFg: teamTotals.fgm,
    lgFga: teamTotals.fga,
    lgFt: teamTotals.ftm,
    lgFta: teamTotals.fta,
    lg3p: teamTotals.fg3m,
    lgAst: teamTotals.ast,
    lgTov: teamTotals.tov,
    lgOrb: teamTotals.oreb,
    lgTrb: teamTotals.oreb + teamTotals.dreb,
    lgPf: teamTotals.pf,
    lgPts: teamTotals.pts,
  };
  const factors = leagueFactors(lg);

  const seasonStats = roster
    .map((p) => {
      const rows = p.player_game_stats ?? [];
      const totals = sumLines(rows);
      const gp = rows.length;
      const per = (v: number) => (gp > 0 ? v / gp : 0);
      return {
        id: p.id,
        fullName: p.full_name,
        jersey: p.jersey_number,
        position: p.position,
        gp,
        min: per(totals.minutes),
        ppg: per(totals.pts),
        rpg: per(totals.oreb + totals.dreb),
        apg: per(totals.ast),
        spg: per(totals.stl),
        bpg: per(totals.blk),
        topg: per(totals.tov),
        fgPct: fgPct(totals),
        fg3Pct: fg3Pct(totals),
        ftPct: ftPct(totals),
        efgPct: efgPct(totals),
        tsPct: tsPct(totals),
        astToTov: astToTov(totals),
        gmScPerGame: gp > 0 ? gameScore(totals) / gp : 0,
        uper: uPer({ ...totals, minutesPlayed: totals.minutes }, teamTotals, lg, factors),
        pirPerGame: gp > 0 ? pir(totals) / gp : 0,
        plusMinusPerGame: gp > 0 ? (playerPlusMinus.get(p.id) ?? 0) / gp : 0,
      };
    })
    .filter((p) => p.gp > 0);

  const playerLabel = new Map(roster.map((p) => [p.id, `#${p.jersey_number ?? "-"} ${p.full_name}`]));
  const withLabels = (rows: typeof lineupSummaries) =>
    rows.map((l) => ({ ...l, labels: l.playerIds.map((id) => playerLabel.get(id) ?? "Unknown player") }));

  const lineups = {
    mostUsed: withLabels([...lineupSummaries].sort((a, b) => b.stints - a.stints).slice(0, 8)),
    bestPlusMinus: withLabels(topLineupsBy(lineupSummaries, "plusMinus", { limit: 5 })),
    mostPoints: withLabels(topLineupsBy(lineupSummaries, "us", { limit: 5 })),
    fewestAllowed: withLabels(topLineupsBy(lineupSummaries, "them", { limit: 5, ascending: true })),
  };

  return (
    <TeamDashboardClient
      seasonName={season?.name ?? "Current season"}
      record={{ wins, losses }}
      netRating={netRating}
      lastFive={lastFive}
      gamesPlayed={gamesPlayed}
      pointsForPerGame={gamesPlayed > 0 ? pointsFor / gamesPlayed : 0}
      pointsAgainstPerGame={gamesPlayed > 0 ? pointsAgainst / gamesPlayed : 0}
      teamFgPct={teamFgPct}
      bestMargin={bestMargin}
      gameMargins={gameMargins}
      quarters={quarters}
      teamRatings={{ pace, offRating, defRating, reboundDiffPerGame, orebPct, drebPct }}
      lineups={lineups}
      zoneStats={zoneStats}
      seasonStats={seasonStats}
    />
  );
}
