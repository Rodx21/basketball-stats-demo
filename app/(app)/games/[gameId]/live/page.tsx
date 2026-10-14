import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LiveScoutClient } from "./LiveScoutClient";
import type { LiveEvent } from "@/components/live/shared";
import { EVENT_SELECT, defaultOptionRows, type AccountabilityRule, type OptionRow } from "@/lib/liveScouting";

// Live game screen = opponent situation tracker, used on an iPad on the bench.
// The old box-score stats entry is suspended in ../_suspended-stats-entry (not routed).
export default async function LiveGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from("games")
    .select(
      "id, game_date, venue, home_team:teams!games_home_team_id_fkey(id, name, is_own_team), away_team:teams!games_away_team_id_fkey(id, name, is_own_team)"
    )
    .eq("id", gameId)
    .maybeSingle();

  if (!game || !game.home_team || !game.away_team) notFound();

  const ownIsHome = Boolean(game.home_team.is_own_team);
  const opponent = ownIsHome ? game.away_team : game.home_team;
  const ownTeam = ownIsHome ? game.home_team : game.away_team;

  const roster = (teamId: string) =>
    supabase
      .from("players")
      .select("full_name, jersey_number")
      .eq("team_id", teamId)
      .eq("active", true)
      .order("jersey_number", { ascending: true, nullsFirst: false });
  const label = (p: { full_name: string; jersey_number: number | null }) => (p.jersey_number != null ? `#${p.jersey_number} ${p.full_name}` : p.full_name);

  const [{ data: notes }, { data: players }, { data: ourPlayers }, { data: events }, { data: rules }] = await Promise.all([
    supabase.from("scouting_category_notes").select("category, body").eq("team_id", opponent.id),
    roster(opponent.id),
    roster(ownTeam.id),
    supabase
      .from("live_scout_events")
      .select(EVENT_SELECT)
      .eq("game_id", gameId)
      .order("created_at"),
    supabase.from("accountability_rules").select("id, label, points, sort_order").eq("game_id", gameId).order("sort_order"),
  ]);

  // Editable buttons; seeded from the app defaults the first time.
  const optionSelect = "id, list, group_key, group_label, label, sort_order";
  let { data: options } = await supabase.from("live_options").select(optionSelect).order("sort_order");
  if (!options || options.length === 0) {
    ({ data: options } = await supabase.from("live_options").insert(defaultOptionRows()).select(optionSelect));
  }

  const date = new Date(game.game_date);
  const subtitle = [
    ownIsHome ? "Home" : "Away",
    date.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" }),
    date.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" }),
    game.venue,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <LiveScoutClient
      gameId={gameId}
      opponent={{ id: opponent.id, name: opponent.name }}
      subtitle={subtitle}
      expected={Object.fromEntries((notes ?? []).map((n) => [n.category, n.body ?? ""]))}
      opponentPlayers={(players ?? []).map(label)}
      ourPlayers={(ourPlayers ?? []).map(label)}
      initialEvents={(events ?? []) as LiveEvent[]}
      initialOptions={(options ?? []) as OptionRow[]}
      initialRules={(rules ?? []) as AccountabilityRule[]}
    />
  );
}
