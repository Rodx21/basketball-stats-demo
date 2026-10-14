import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoutReport } from "@/components/scouting/ScoutReport";

export default async function ScoutingTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: team } = await supabase.from("teams").select("id, name").eq("id", teamId).maybeSingle();

  if (!team) notFound();

  return (
    <div className="mx-auto max-w-[1280px]">
      <section className="border-b border-white/[0.13] py-14">
        <p className="mb-5 font-[family-name:var(--font-serif)] text-[22px] italic text-white/60">
          Opponent scouting report
        </p>
        <h1 className="text-[64px] font-bold uppercase leading-[0.94] tracking-[0.03em] text-white">{team.name}</h1>
      </section>

      <ScoutReport teamId={team.id} />
    </div>
  );
}
