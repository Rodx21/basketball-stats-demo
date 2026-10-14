"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SITUATION_CATEGORIES } from "@/lib/liveScouting";

export async function addClip(formData: FormData) {
  const supabase = await createClient();

  const teamId = String(formData.get("team_id") ?? "");
  const section = String(formData.get("section") ?? "");
  const category = String(formData.get("category") ?? "");
  const videoUrl = String(formData.get("video_url") ?? "").trim();
  if (!teamId || !section || !category || !videoUrl) return;

  const note = String(formData.get("note") ?? "").trim();

  await supabase.from("scouting_clips").insert({
    team_id: teamId,
    section,
    category,
    video_url: videoUrl,
    note: note || null,
  });

  revalidatePath(`/scouting/${teamId}`);
  revalidatePath("/(app)/games/[gameId]/live", "page");
}

export async function deleteClip(formData: FormData) {
  const supabase = await createClient();

  const clipId = String(formData.get("clip_id") ?? "");
  const teamId = String(formData.get("team_id") ?? "");
  if (!clipId) return;

  await supabase.from("scouting_clips").delete().eq("id", clipId);
  revalidatePath(`/scouting/${teamId}`);
  revalidatePath("/(app)/games/[gameId]/live", "page");
}

const NOTE_FIELDS = [
  "game_plan_fastbreak",
  "game_plan_pnr",
  "game_plan_targets",
  "personnel",
  "offensive_tendencies",
  "defensive_tendencies",
] as const;

export async function saveNotes(formData: FormData) {
  const supabase = await createClient();

  const teamId = String(formData.get("team_id") ?? "");
  if (!teamId) return;

  const fields = Object.fromEntries(
    NOTE_FIELDS.map((field) => [field, String(formData.get(field) ?? "").trim() || null])
  ) as Record<(typeof NOTE_FIELDS)[number], string | null>;

  await supabase
    .from("scouting_notes")
    .upsert({ team_id: teamId, ...fields, updated_at: new Date().toISOString() }, { onConflict: "team_id" });

  revalidatePath(`/scouting/${teamId}`);
  revalidatePath("/(app)/games/[gameId]/live", "page");
}

export async function saveCategoryNotes(formData: FormData) {
  const supabase = await createClient();

  const teamId = String(formData.get("team_id") ?? "");
  if (!teamId) return;

  const now = new Date().toISOString();
  const rows = SITUATION_CATEGORIES.map((c) => ({
    team_id: teamId,
    category: c.key,
    body: String(formData.get(`note_${c.key}`) ?? "").trim() || null,
    updated_at: now,
  }));

  await supabase.from("scouting_category_notes").upsert(rows, { onConflict: "team_id,category" });

  revalidatePath(`/scouting/${teamId}`);
  revalidatePath("/(app)/games/[gameId]/live", "page");
}
