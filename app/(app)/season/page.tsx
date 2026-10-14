import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatGameDate } from "@/lib/format";
import { computeStreak, summarizeRecord, type GameResult } from "@/lib/stats/record";

function formatDate(iso: string | null) {
  if (!iso) return "?";
  return new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}

export default async function SeasonPage() {
  const supabase = await createClient();

  const { data: ownTeam } = await supabase.from("teams").select("id").eq("is_own_team", true).maybeSingle();

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name, start_date, end_date")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: gamesRaw } = await supabase
    .from("games")
    .select(
      "id, game_date, venue, status, home_score, away_score, home_team:teams!games_home_team_id_fkey(id, name, is_own_team), away_team:teams!games_away_team_id_fkey(id, name, is_own_team)"
    )
    .eq("season_id", season?.id ?? "")
    .order("game_date", { ascending: true });

  const games = ownTeam
    ? (gamesRaw ?? []).filter((g) => g.home_team?.id === ownTeam.id || g.away_team?.id === ownTeam.id)
    : (gamesRaw ?? []);

  const rounds: {
    round: number;
    game: (typeof games)[number];
    isHome: boolean;
    us: number;
    them: number;
    opponent: (typeof games)[number]["home_team"];
  }[] = [];

  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    const isHome = g.home_team?.is_own_team ?? true;
    const us = isHome ? g.home_score ?? 0 : g.away_score ?? 0;
    const them = isHome ? g.away_score ?? 0 : g.home_score ?? 0;
    const opponent = isHome ? g.away_team : g.home_team;
    rounds.push({ round: i + 1, game: g, isHome, us, them, opponent });
  }

  const { wins, losses, pointsFor, pointsAgainst } = summarizeRecord(
    rounds
      .filter((r) => r.game.status === "final")
      .map((r) => ({ isHome: r.isHome, homeScore: r.game.home_score, awayScore: r.game.away_score }))
  );

  const played = rounds.filter((r) => r.game.status === "final").length;
  const netRating = played > 0 ? (pointsFor - pointsAgainst) / played : 0;
  const remaining = rounds.filter((r) => r.game.status !== "final");
  const next = remaining[0];

  const finalRounds = rounds.filter((r) => r.game.status === "final");

  const streak = computeStreak(
    finalRounds.map((r): GameResult => (r.us > r.them ? "W" : r.us < r.them ? "L" : "T"))
  );
  const streakLabel = streak.type === "none" ? "—" : streak.type === "T" ? "Tied last" : `${streak.type}${streak.count}`;

  const homeRecord = summarizeRecord(
    finalRounds.filter((r) => r.isHome).map((r) => ({ isHome: true, homeScore: r.game.home_score, awayScore: r.game.away_score }))
  );
  const awayRecord = summarizeRecord(
    finalRounds.filter((r) => !r.isHome).map((r) => ({ isHome: false, homeScore: r.game.home_score, awayScore: r.game.away_score }))
  );

  const gamesByOpponent = new Map<string, (typeof finalRounds)>();
  for (const r of finalRounds) {
    const oppId = r.opponent?.id;
    if (!oppId) continue;
    const bucket = gamesByOpponent.get(oppId) ?? [];
    bucket.push(r);
    gamesByOpponent.set(oppId, bucket);
  }
  const opponentHistory = [...gamesByOpponent.entries()]
    .map(([oppId, oppRounds]) => {
      const record = summarizeRecord(
        oppRounds.map((r) => ({ isHome: r.isHome, homeScore: r.game.home_score, awayScore: r.game.away_score }))
      );
      return {
        id: oppId,
        name: oppRounds[0].opponent?.name ?? "TBD",
        gamesPlayed: oppRounds.length,
        ...record,
      };
    })
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  return (
    <div className="mx-auto max-w-[1280px]">
      <section className="grid grid-cols-[minmax(0,1fr)_380px] items-end gap-16 border-b border-white/[0.13] pt-14 pb-11">
        <div>
          <p className="mb-5 font-[family-name:var(--font-serif)] text-[22px] italic text-white/60">
            {formatDate(season?.start_date ?? null)} — {formatDate(season?.end_date ?? null)}
          </p>
          <h1 className="text-[80px] font-bold uppercase leading-[0.94] tracking-[0.03em] text-white">
            Season
            <br />
            {season?.name ?? "—"}
          </h1>
        </div>
        <div>
          {[
            ["Record", `${wins}–${losses}`, true],
            ["Streak", streakLabel, streak.type === "W"],
            ["Games scheduled", String(games.length), false],
            ["Games played", String(played), false],
            ["Net rating", netRating > 0 ? `+${netRating.toFixed(1)}` : netRating.toFixed(1), true],
          ].map(([label, value, gold]) => (
            <div key={label as string} className="flex items-baseline justify-between border-b border-white/[0.13] py-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/45">{label}</span>
              <span className={`text-[22px] font-semibold tabular-nums ${gold ? "text-brand-gold" : "text-white"}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {rounds.length > 0 && (
        <section className="border-b border-white/[0.13] py-12">
          <h2 className="mb-7 text-[13px] font-bold uppercase tracking-[0.16em] text-white">Season progress</h2>
          <div className="flex h-[60px] items-end gap-1.5">
            {rounds.map((r) => {
              const played = r.game.status === "final";
              const won = played && r.us > r.them;
              return (
                <div
                  key={r.game.id}
                  title={played ? `Round ${r.round} — ${won ? "won" : "lost"}` : `Round ${r.round} — to play`}
                  className={`h-full flex-1 rounded-sm ${
                    played
                      ? won
                        ? "self-end h-full bg-brand-gold"
                        : "self-end bg-brand-blue"
                      : "self-end border border-white/15 bg-transparent"
                  }`}
                  style={{ height: played ? (won ? "100%" : "62%") : "40%" }}
                />
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.13em] text-white/35">
            <span>Round 1</span>
            <span>
              {played} played · {rounds.length - played} to go
            </span>
            <span>Round {rounds.length}</span>
          </div>
        </section>
      )}

      {finalRounds.length > 0 && (
        <section className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-14 border-b border-white/[0.13] py-12">
          <div>
            <h2 className="mb-6 text-[13px] font-bold uppercase tracking-[0.16em] text-white">Opponent history</h2>
            {opponentHistory.map((o) => (
              <div
                key={o.id}
                className="grid grid-cols-[minmax(0,1fr)_70px_90px] items-center gap-5 border-b border-white/[0.09] py-3.5"
              >
                <span className="truncate text-[14px] font-medium text-white">{o.name}</span>
                <span className="text-right text-[13px] font-semibold tabular-nums text-white/70">
                  {o.wins}–{o.losses}
                </span>
                <span
                  className={`text-right text-[13px] font-semibold tabular-nums ${
                    o.pointsFor - o.pointsAgainst > 0 ? "text-brand-gold" : "text-white/50"
                  }`}
                >
                  {o.pointsFor - o.pointsAgainst > 0 ? "+" : ""}
                  {o.pointsFor - o.pointsAgainst}
                </span>
              </div>
            ))}
          </div>

          <div>
            <h2 className="mb-6 text-[13px] font-bold uppercase tracking-[0.16em] text-white">Home vs. away</h2>
            {[
              { label: "Home", record: homeRecord },
              { label: "Away", record: awayRecord },
            ].map(({ label, record }) => {
              const gp = record.wins + record.losses;
              const net = gp > 0 ? (record.pointsFor - record.pointsAgainst) / gp : 0;
              return (
                <div key={label} className="border-b border-white/[0.13] py-3.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/45">{label}</span>
                    <span className="text-[18px] font-semibold tabular-nums text-white">
                      {record.wins}–{record.losses}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/40">
                    {net > 0 ? "+" : ""}
                    {net.toFixed(1)} net rating
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-14 py-12">
        <div>
          <h2 className="mb-6 text-[13px] font-bold uppercase tracking-[0.16em] text-white">Remaining fixtures</h2>
          {remaining.length === 0 && <p className="text-sm text-white/40">No fixtures remaining.</p>}
          {remaining.map((r) => (
            <div
              key={r.game.id}
              className="grid grid-cols-[110px_minmax(0,1fr)_90px] items-center gap-5 border-b border-white/[0.09] py-4"
            >
              <span className="text-[12px] font-semibold text-white/50">{formatGameDate(r.game.game_date).split(",")[0]}</span>
              <Link href={`/games/${r.game.id}`} className="truncate text-[16px] font-semibold text-white hover:text-brand-gold">
                {r.isHome ? "vs" : "at"} {r.opponent?.name ?? "TBD"}
              </Link>
              <span
                className={`text-right text-[10px] font-bold uppercase tracking-[0.13em] ${
                  r.isHome ? "text-brand-gold" : "text-white/50"
                }`}
              >
                {r.isHome ? "Home" : "Away"}
              </span>
            </div>
          ))}
        </div>

        <div>
          <h2 className="mb-6 text-[13px] font-bold uppercase tracking-[0.16em] text-white">Next up</h2>
          {next ? (
            <div className="rounded border border-brand-gold/35 px-6 py-[26px]">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-gold">
                Round {next.round} · {next.isHome ? "Home" : "Away"}
              </p>
              <p className="mt-2 text-[30px] font-bold uppercase tracking-[0.03em] text-white">
                {next.isHome ? "vs" : "at"} {next.opponent?.name ?? "TBD"}
              </p>
              <p className="mt-2 text-[13px] text-white/50">
                {formatGameDate(next.game.game_date)}
                {next.game.venue ? ` · ${next.game.venue}` : ""}
              </p>
              <Link
                href={`/games/${next.game.id}/live`}
                className="mt-6 block rounded-[14px] bg-brand-gold px-[22px] py-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#111] hover:bg-brand-gold-600"
              >
                Live scout report
              </Link>
            </div>
          ) : (
            <p className="text-sm text-white/40">Nothing scheduled.</p>
          )}
        </div>
      </section>
    </div>
  );
}
