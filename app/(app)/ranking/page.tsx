import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RankingTable } from "@/components/live/RankingTable";
import { GRADE_ACTIONS, STAND_INS, gradesOf, playerRanking, type RankEvent } from "@/lib/liveScouting";

const PAGE = 1000;

type Row = RankEvent & { game_id: string };

// Internal accountability ranking: season total by default, one game with ?game=<id>.
export default async function RankingPage({ searchParams }: { searchParams: Promise<{ game?: string }> }) {
  const { game: gameFilter } = await searchParams;
  const supabase = await createClient();

  // PostgREST caps a response at 1000 rows, so read the season in pages.
  const events: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from("live_scout_events")
      .select("game_id, kind, category, option, actor, penalty, score, turnover, bad_shot, tov_by, tov_forced_by, on_court_ours")
      .in("kind", ["our_off", "our_def", "rule", "grade"])
      .order("created_at")
      .range(from, from + PAGE - 1);
    events.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE) break;
  }

  const gameIds = [...new Set(events.map((e) => e.game_id))];
  const { data: gamesRaw } = gameIds.length
    ? await supabase
        .from("games")
        .select("id, game_date, home_team:teams!games_home_team_id_fkey(name, is_own_team), away_team:teams!games_away_team_id_fkey(name, is_own_team)")
        .in("id", gameIds)
        .order("game_date")
    : { data: [] };
  const games = (gamesRaw ?? []).map((g) => ({
    id: g.id,
    label: `${new Date(g.game_date).toLocaleDateString("en-IE", { day: "numeric", month: "short" })} · ${
      g.home_team?.is_own_team ? `vs ${g.away_team?.name}` : `@ ${g.home_team?.name}`
    }`,
  }));

  const scoped = gameFilter ? events.filter((e) => e.game_id === gameFilter) : events;
  const rows = playerRanking(scoped);

  // Games a player took part in: on the floor for a possession, or scored for something.
  const played = new Map<string, Set<string>>();
  for (const e of scoped) {
    const names = [...(e.kind === "our_off" || e.kind === "our_def" ? (e.on_court_ours ?? []) : []), ...gradesOf(e).map(([p]) => p)];
    for (const p of names) {
      if (STAND_INS.includes(p)) continue;
      played.set(p, (played.get(p) ?? new Set()).add(e.game_id));
    }
  }
  const gamesPlayed = new Map([...played].map(([p, ids]) => [p, ids.size]));

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-[12px] font-semibold ${
      active ? "border-brand-gold bg-brand-gold text-black" : "border-white/20 text-white/70 hover:border-white/40"
    }`;

  return (
    <div className="mx-auto max-w-[1280px]">
      <section className="border-b border-white/[0.13] py-14">
        <p className="mb-5 font-[family-name:var(--font-serif)] text-[22px] italic text-white/60">Accountability</p>
        <h1 className="text-[80px] font-bold uppercase leading-[0.94] tracking-[0.03em] text-white">Ranking</h1>
      </section>

      <section className="space-y-8 py-10">
        <div className="flex flex-wrap gap-2">
          <Link href="/ranking" className={chip(!gameFilter)}>
            Season
          </Link>
          {games.map((g) => (
            <Link key={g.id} href={`/ranking?game=${g.id}`} className={chip(gameFilter === g.id)}>
              {g.label}
            </Link>
          ))}
        </div>

        <RankingTable rows={rows} games={gameFilter ? undefined : gamesPlayed} />

        <div className="max-w-3xl text-[13px] leading-relaxed text-white/50">
          <p className="mb-1 font-semibold uppercase tracking-[0.1em] text-white/60">How it scores</p>
          <p>Game rules broken: the rule&apos;s points (−3 by default) · Defensive errors −2 ({GRADE_ACTIONS.filter((a) => a.type === "def_error").map((a) => a.label).join(", ")}) · Bad shot −1 · Turnover −1 · Positives +1 (forced turnover / steal, {GRADE_ACTIONS.filter((a) => a.type === "positive").map((a) => a.label).join(", ")}). Following a rule earns nothing.</p>
          <p className="mt-1">Per 10 poss = total ÷ possessions on the floor × 10 (from starters and subs), so players with fewer minutes compare fairly.</p>
        </div>
      </section>
    </div>
  );
}
