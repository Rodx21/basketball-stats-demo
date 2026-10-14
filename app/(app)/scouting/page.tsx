import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ALL_CATEGORIES } from "@/lib/scouting";

export default async function ScoutingListPage() {
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, is_own_team, scouting_clips(id)")
    .eq("is_own_team", false)
    .order("name");

  const opponents = teams ?? [];
  const totalClips = ALL_CATEGORIES.length;

  return (
    <div className="mx-auto max-w-[1280px]">
      <section className="border-b border-white/[0.13] py-14">
        <p className="mb-5 font-[family-name:var(--font-serif)] text-[22px] italic text-white/60">
          Opponent breakdowns
        </p>
        <h1 className="text-[80px] font-bold uppercase leading-[0.94] tracking-[0.03em] text-white">Scouting</h1>
      </section>

      <section className="py-12">
        {opponents.length === 0 && (
          <p className="text-sm text-white/40">
            No tracked opponents yet. Add one from{" "}
            <Link href="/roster" className="text-brand-gold hover:underline">
              Roster
            </Link>
            .
          </p>
        )}

        <div className="border-t border-white/[0.13]">
          {opponents.map((team) => {
            const clipCount = (team.scouting_clips ?? []).length;
            const coverage = Math.min(1, clipCount / (totalClips * 2));
            return (
              <Link
                key={team.id}
                href={`/scouting/${team.id}`}
                className="flex items-center justify-between gap-6 border-b border-white/[0.13] py-5 hover:bg-white/[0.02]"
              >
                <span className="text-[19px] font-semibold text-white">{team.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">
                    {clipCount} clip{clipCount === 1 ? "" : "s"}
                  </span>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-brand-gold" style={{ width: `${coverage * 100}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
