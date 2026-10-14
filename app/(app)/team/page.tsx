import { createClient } from "@/lib/supabase/server";
import type { LiveEvent } from "@/components/live/shared";
import { SeasonDashboardClient, type TrackedGame } from "./SeasonDashboardClient";

// Season dashboard built from the live tracker (possessions logged in each game's live screen).
// The old box-score dashboard is suspended in ./_suspended-stats-dashboard (not routed).
export default async function TeamDashboardPage() {
  const supabase = await createClient();

  const [{ data: ownTeam }, { data: season }] = await Promise.all([
    supabase.from("teams").select("id, name").eq("is_own_team", true).maybeSingle(),
    supabase.from("seasons").select("name").order("start_date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!ownTeam) {
    return (
      <div className="mx-auto max-w-[1280px] py-14">
        <h1 className="text-[56px] font-bold uppercase leading-[0.94] tracking-[0.03em] text-white">Dashboard</h1>
        <p className="mt-4 text-[15px] text-white/50">Set up your team in Roster first.</p>
      </div>
    );
  }

  const { data: gamesRaw } = await supabase
    .from("games")
    .select("id, game_date, home_team:teams!games_home_team_id_fkey(id, name), away_team:teams!games_away_team_id_fkey(id, name)")
    .or(`home_team_id.eq.${ownTeam.id},away_team_id.eq.${ownTeam.id}`)
    .order("game_date", { ascending: true });

  const games = gamesRaw ?? [];
  const { data: eventsRaw } = games.length
    ? await supabase
        .from("live_scout_events")
        .select("id, game_id, kind, category, option, outcome, points, turnover, defense, player, coverage, rules, period, note, created_at")
        .in(
          "game_id",
          games.map((g) => g.id)
        )
        .order("created_at")
    : { data: [] };

  const events = (eventsRaw ?? []) as (LiveEvent & { game_id: string })[];
  const trackedIds = new Set(events.map((e) => e.game_id));

  const trackedGames: TrackedGame[] = games
    .filter((g) => trackedIds.has(g.id) && g.home_team && g.away_team)
    .map((g) => {
      const home = g.home_team!.id === ownTeam.id;
      return {
        id: g.id,
        date: g.game_date,
        opponent: home ? g.away_team!.name : g.home_team!.name,
        home,
      };
    });

  return <SeasonDashboardClient seasonName={season?.name ?? "Current season"} games={trackedGames} events={events} />;
}
