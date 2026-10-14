"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTeam(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await supabase.from("teams").insert({
    user_id: user.id,
    name,
    is_own_team: formData.get("is_own_team") === "on",
  });

  revalidatePath("/roster");
}

export async function deleteTeam(formData: FormData) {
  const supabase = await createClient();
  const teamId = String(formData.get("team_id") ?? "");
  if (!teamId) return;

  await supabase.from("teams").delete().eq("id", teamId);
  revalidatePath("/roster");
}

export async function createPlayer(formData: FormData) {
  const supabase = await createClient();

  const teamId = String(formData.get("team_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!teamId || !fullName) return;

  const jerseyNumberRaw = String(formData.get("jersey_number") ?? "");
  const positionRaw = String(formData.get("position") ?? "");

  await supabase.from("players").insert({
    team_id: teamId,
    full_name: fullName,
    jersey_number: jerseyNumberRaw ? Number(jerseyNumberRaw) : null,
    position: positionRaw || null,
  });

  revalidatePath("/roster");
}

export async function updatePlayer(formData: FormData) {
  const supabase = await createClient();

  const playerId = String(formData.get("player_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!playerId || !fullName) return;

  const jerseyNumberRaw = String(formData.get("jersey_number") ?? "");
  const positionRaw = String(formData.get("position") ?? "");

  await supabase
    .from("players")
    .update({
      full_name: fullName,
      jersey_number: jerseyNumberRaw ? Number(jerseyNumberRaw) : null,
      position: positionRaw || null,
    })
    .eq("id", playerId);

  revalidatePath("/roster");
}

export async function deletePlayer(formData: FormData) {
  const supabase = await createClient();
  const playerId = String(formData.get("player_id") ?? "");
  if (!playerId) return;

  await supabase.from("players").delete().eq("id", playerId);
  revalidatePath("/roster");
}
