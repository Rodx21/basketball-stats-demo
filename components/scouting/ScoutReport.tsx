import { createClient } from "@/lib/supabase/server";
import { DEFENSE_CATEGORIES, OFFENSE_CATEGORIES } from "@/lib/scouting";
import { CategoryBlock } from "@/components/scouting/CategoryBlock";
import { saveCategoryNotes, saveNotes } from "@/app/(app)/scouting/actions";
import { PNR_TERMINOLOGY, SITUATION_CATEGORIES } from "@/lib/liveScouting";

const NOTES_FIELDS = [
  { key: "game_plan_fastbreak", label: "Fastbreak" },
  { key: "game_plan_pnr", label: "PnR" },
  { key: "game_plan_targets", label: "Targets" },
] as const;

const PROFILE_FIELDS = [
  { key: "personnel", label: "Personnel" },
  { key: "offensive_tendencies", label: "Offensive tendencies" },
  { key: "defensive_tendencies", label: "Defensive tendencies" },
] as const;

// Offense/defense clip categories + game plan notes for one opponent.
// Shared by /scouting/[teamId] and the live game screen.
export async function ScoutReport({ teamId }: { teamId: string }) {
  const supabase = await createClient();

  const [{ data: clips }, { data: notes }, { data: categoryNotes }] = await Promise.all([
    supabase
      .from("scouting_clips")
      .select("id, section, category, video_url, note")
      .eq("team_id", teamId)
      .order("created_at"),
    supabase.from("scouting_notes").select("*").eq("team_id", teamId).maybeSingle(),
    supabase.from("scouting_category_notes").select("category, body").eq("team_id", teamId),
  ]);

  const noteByCategory = new Map((categoryNotes ?? []).map((n) => [n.category, n.body ?? ""]));

  const clipsByCategory = new Map<string, { id: string; video_url: string; note: string | null }[]>();
  for (const clip of clips ?? []) {
    const bucket = clipsByCategory.get(clip.category) ?? [];
    bucket.push({ id: clip.id, video_url: clip.video_url, note: clip.note });
    clipsByCategory.set(clip.category, bucket);
  }

  return (
    <>
      <section className="border-b border-white/[0.13] py-12">
        <h2 className="mb-1.5 text-[13px] font-bold uppercase tracking-[0.16em] text-brand-gold">Scouting notes</h2>
        <p className="mb-7 text-[13px] text-white/45">
          What we expect, per situation — shown on the live game screen next to what actually happens
        </p>

        <div className="mb-8 rounded border border-white/[0.13] p-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-white/45">
            Pick-and-roll terminology
          </h3>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-1 text-[13px] text-white/70 md:grid-cols-2">
            {PNR_TERMINOLOGY.map(([term, meaning]) => (
              <li key={term}>
                <span className="font-semibold text-white">{term}</span> — {meaning}
              </li>
            ))}
          </ul>
        </div>

        <form action={saveCategoryNotes} className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
          <input type="hidden" name="team_id" value={teamId} />
          {SITUATION_CATEGORIES.map((c) => (
            <label key={c.key} className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60">{c.label}</span>
              <textarea
                name={`note_${c.key}`}
                defaultValue={noteByCategory.get(c.key) ?? ""}
                rows={4}
                className="rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
              />
            </label>
          ))}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-[14px] bg-brand-gold px-[22px] py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#111] hover:bg-brand-gold-600"
            >
              Save scouting notes
            </button>
          </div>
        </form>
      </section>

      <section className="border-b border-white/[0.13] py-12">
        <h2 className="mb-6 text-[13px] font-bold uppercase tracking-[0.16em] text-brand-gold">Offense clips</h2>
        {OFFENSE_CATEGORIES.map((cat) => (
          <CategoryBlock
            key={cat.key}
            teamId={teamId}
            section="offense"
            categoryKey={cat.key}
            label={cat.label}
            hint={cat.hint}
            optional={cat.optional}
            clips={clipsByCategory.get(cat.key) ?? []}
          />
        ))}
      </section>

      <section className="border-b border-white/[0.13] py-12">
        <h2 className="mb-6 text-[13px] font-bold uppercase tracking-[0.16em] text-brand-gold">Defense clips</h2>
        {DEFENSE_CATEGORIES.map((cat) => (
          <CategoryBlock
            key={cat.key}
            teamId={teamId}
            section="defense"
            categoryKey={cat.key}
            label={cat.label}
            hint={cat.hint}
            optional={cat.optional}
            clips={clipsByCategory.get(cat.key) ?? []}
          />
        ))}
      </section>

      <section className="py-12">
        <h2 className="mb-1.5 text-[13px] font-bold uppercase tracking-[0.16em] text-white">Game plan & profile</h2>
        <p className="mb-7 text-[13px] text-white/45">Free-form notes — changes save on submit</p>

        <form action={saveNotes} className="grid grid-cols-2 gap-x-10 gap-y-7">
          <input type="hidden" name="team_id" value={teamId} />

          <div>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-white/45">Game plan</h3>
            <div className="flex flex-col gap-4">
              {NOTES_FIELDS.map((f) => (
                <label key={f.key} className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                    {f.label}
                  </span>
                  <textarea
                    name={f.key}
                    defaultValue={notes?.[f.key as keyof typeof notes] ?? ""}
                    rows={3}
                    className="rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-white/45">Profile</h3>
            <div className="flex flex-col gap-4">
              {PROFILE_FIELDS.map((f) => (
                <label key={f.key} className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                    {f.label}
                  </span>
                  <textarea
                    name={f.key}
                    defaultValue={notes?.[f.key as keyof typeof notes] ?? ""}
                    rows={3}
                    className="rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="col-span-2">
            <button
              type="submit"
              className="rounded-[14px] bg-brand-gold px-[22px] py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#111] hover:bg-brand-gold-600"
            >
              Save notes
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
