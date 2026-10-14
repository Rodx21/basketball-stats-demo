import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createGame } from "./actions";

export default async function GamesPage() {
  const supabase = await createClient();

  const [{ data: ownTeam }, { data: games }, { data: teams }, { data: seasons }, { data: season }] = await Promise.all([
    supabase.from("teams").select("id").eq("is_own_team", true).maybeSingle(),
    supabase
      .from("games")
      .select(
        "id, game_date, venue, status, home_score, away_score, home_team:teams!games_home_team_id_fkey(id, name, is_own_team), away_team:teams!games_away_team_id_fkey(id, name, is_own_team)"
      )
      .order("game_date", { ascending: true }),
    supabase.from("teams").select("id, name, is_own_team").order("is_own_team", { ascending: false }).order("name"),
    supabase.from("seasons").select("id, name").order("start_date", { ascending: false }),
    supabase.from("seasons").select("name").order("start_date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const ownGames = ownTeam
    ? (games ?? []).filter((g) => g.home_team?.id === ownTeam.id || g.away_team?.id === ownTeam.id)
    : [];
  const played = ownGames.filter((g) => g.status === "final");
  let wins = 0;
  let losses = 0;
  for (const g of played) {
    const isHome = g.home_team?.id === ownTeam?.id;
    const us = isHome ? g.home_score ?? 0 : g.away_score ?? 0;
    const them = isHome ? g.away_score ?? 0 : g.home_score ?? 0;
    if (us > them) wins += 1;
    else if (us < them) losses += 1;
  }
  const remaining = ownGames.filter((g) => g.status === "scheduled").length;

  return (
    <div className="mx-auto max-w-[1280px]">
      <section className="grid grid-cols-[minmax(0,1fr)_380px] items-end gap-16 border-b border-white/[0.13] py-14">
        <div>
          <p className="mb-5 font-[family-name:var(--font-serif)] text-[22px] italic text-white/60">
            National League — {season?.name ?? "current season"}
          </p>
          <h1 className="text-[80px] font-bold uppercase leading-[0.94] tracking-[0.03em] text-white">Games</h1>
        </div>
        <div>
          {[
            ["Played", String(played.length)],
            ["Record", `${wins}–${losses}`],
            ["Remaining", String(remaining)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between border-b border-white/[0.13] py-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/45">{label}</span>
              <span className="text-[22px] font-semibold tabular-nums text-white">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <details className="group border-b border-white/[0.13] py-9">
        <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-gold">
          + Schedule a game
        </summary>
        <form action={createGame} className="mt-6 flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="home_team_id" className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">
              Home
            </label>
            <select
              id="home_team_id"
              name="home_team_id"
              required
              className="min-w-[170px] rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
            >
              {teams?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="away_team_id" className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">
              Away
            </label>
            <select
              id="away_team_id"
              name="away_team_id"
              required
              className="min-w-[170px] rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
            >
              {teams?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="game_date" className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">
              Date &amp; time
            </label>
            <input
              id="game_date"
              name="game_date"
              type="datetime-local"
              required
              className="min-w-[170px] rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="venue" className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">
              Venue
            </label>
            <input
              id="venue"
              name="venue"
              placeholder="Optional"
              className="min-w-[170px] rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
            />
          </div>
          {seasons && seasons.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="season_id" className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">
                Season
              </label>
              <select
                id="season_id"
                name="season_id"
                className="min-w-[170px] rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="submit"
            className="rounded-[14px] bg-brand-gold px-[22px] py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#111] hover:bg-brand-gold-600"
          >
            Add game
          </button>
        </form>
        {(!teams || teams.length < 2) && (
          <p className="mt-3 text-[13px] text-white/40">Add at least two teams in Roster before scheduling a game.</p>
        )}
      </details>

      <div className="border-t border-white/[0.09] py-6">
        {games?.map((game) => {
          const ownSide = game.home_team?.is_own_team ? "home" : game.away_team?.is_own_team ? "away" : null;
          const title = ownSide
            ? `${ownSide === "home" ? "vs" : "at"} ${ownSide === "home" ? game.away_team?.name : game.home_team?.name}`
            : `${game.home_team?.name ?? "TBD"} vs ${game.away_team?.name ?? "TBD"}`;
          const showScore = game.status === "final";
          const won = showScore && (game.home_score ?? 0) !== (game.away_score ?? 0)
            ? (ownSide === "away" ? (game.away_score ?? 0) > (game.home_score ?? 0) : (game.home_score ?? 0) > (game.away_score ?? 0))
            : null;
          const statusColor =
            game.status === "final" ? "text-brand-gold" : game.status === "live" ? "text-[#ff5a5a]" : "text-white/40";

          return (
            <div
              key={game.id}
              className="grid grid-cols-[120px_minmax(0,1fr)_150px_110px_210px] items-center gap-6 border-b border-white/[0.09] py-[22px]"
            >
              <div>
                <div className="text-[13px] font-semibold text-white">
                  {new Date(game.game_date).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" })}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35">
                  {new Date(game.game_date).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              <div className="min-w-0">
                <Link href={`/games/${game.id}`} className="block truncate text-[19px] font-semibold tracking-[0.02em] text-white hover:text-brand-gold">
                  {title}
                </Link>
                <div className="truncate text-[11px] text-white/35">{game.venue ?? ""}</div>
              </div>

              <div className={`text-[26px] font-bold tabular-nums ${showScore ? (won ? "text-brand-gold" : "text-white/60") : "text-white/20"}`}>
                {showScore ? `${game.home_score}–${game.away_score}` : "—"}
              </div>

              <div className={`text-[10px] font-bold uppercase tracking-[0.16em] ${statusColor}`}>{game.status}</div>

              <div className="flex justify-end gap-2.5">
                <Link
                  href={`/games/${game.id}/live`}
                  className="whitespace-nowrap rounded-[14px] bg-brand-gold px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#111] hover:bg-brand-gold-600"
                >
                  Live scout report
                </Link>
              </div>
            </div>
          );
        })}

        {games?.length === 0 && <p className="py-6 text-sm text-white/40">No games scheduled yet.</p>}
      </div>
    </div>
  );
}
