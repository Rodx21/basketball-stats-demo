"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createGame(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const homeTeamId = String(formData.get("home_team_id") ?? "");
  const awayTeamId = String(formData.get("away_team_id") ?? "");
  const gameDate = String(formData.get("game_date") ?? "");
  if (!homeTeamId || !awayTeamId || !gameDate || homeTeamId === awayTeamId) return;

  const venue = String(formData.get("venue") ?? "").trim();
  const seasonId = String(formData.get("season_id") ?? "");

  await supabase.from("games").insert({
    user_id: user.id,
    season_id: seasonId || null,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    game_date: new Date(gameDate).toISOString(),
    venue: venue || null,
    status: "scheduled",
  });

  revalidatePath("/games");
}

export async function markGameVerified(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const gameId = String(formData.get("game_id") ?? "");
  if (!gameId) return;

  await supabase.from("games").update({ verified_at: new Date().toISOString() }).eq("id", gameId);

  revalidatePath(`/games/${gameId}`);
}
