import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_STAT_LINE, type StatLine } from "@/lib/events";
import { LiveViewClient } from "./LiveViewClient";

export default async function LiveViewPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from("games")
    .select(
      "id, status, home_score, away_score, home_team:teams!games_home_team_id_fkey(id, name), away_team:teams!games_away_team_id_fkey(id, name)"
    )
    .eq("id", gameId)
    .maybeSingle();

  if (!game || !game.home_team || !game.away_team) notFound();

  const [{ data: homePlayers }, { data: awayPlayers }] = await Promise.all([
    supabase
      .from("players")
      .select("id, full_name, jersey_number")
      .eq("team_id", game.home_team.id)
      .eq("active", true)
      .order("jersey_number", { ascending: true, nullsFirst: false }),
    supabase
      .from("players")
      .select("id, full_name, jersey_number")
      .eq("team_id", game.away_team.id)
      .eq("active", true)
      .order("jersey_number", { ascending: true, nullsFirst: false }),
  ]);

  const { data: statsRows } = await supabase
    .from("player_game_stats")
    .select("*")
    .eq("game_id", gameId);

  const initialStats: Record<string, StatLine> = {};
  for (const row of statsRows ?? []) {
    initialStats[row.player_id] = {
      minutes_played: Number(row.minutes_played ?? 0),
      pts: row.pts ?? 0,
      fgm: row.fgm ?? 0,
      fga: row.fga ?? 0,
      fg3m: row.fg3m ?? 0,
      fg3a: row.fg3a ?? 0,
      ftm: row.ftm ?? 0,
      fta: row.fta ?? 0,
      oreb: row.oreb ?? 0,
      dreb: row.dreb ?? 0,
      ast: row.ast ?? 0,
      stl: row.stl ?? 0,
      blk: row.blk ?? 0,
      tov: row.tov ?? 0,
      pf: row.pf ?? 0,
      fouls_drawn: row.fouls_drawn ?? 0,
      shots_rejected: row.shots_rejected ?? 0,
    };
  }
  for (const player of [...(homePlayers ?? []), ...(awayPlayers ?? [])]) {
    if (!initialStats[player.id]) initialStats[player.id] = { ...EMPTY_STAT_LINE };
  }

  return (
    <LiveViewClient
      gameId={gameId}
      status={game.status ?? "scheduled"}
      homeTeam={{ id: game.home_team.id, name: game.home_team.name, players: homePlayers ?? [] }}
      awayTeam={{ id: game.away_team.id, name: game.away_team.name, players: awayPlayers ?? [] }}
      homeScore={game.home_score ?? 0}
      awayScore={game.away_score ?? 0}
      initialStats={initialStats}
    />
  );
}
