import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { createClient } from "@/lib/supabase/server";
import { formatGameDate } from "@/lib/format";
import { aggregateByPeriod, type ShotEventRow } from "@/lib/shotChart";
import { pointsForEvent, type GameEventType } from "@/lib/events";
import { pir } from "@/lib/stats/pir";
import { summarizeRecord } from "@/lib/stats/record";
import { markGameVerified } from "../actions";

interface StatsRow {
  id: string;
  player_id: string;
  minutes_played: number | null;
  pts: number | null;
  fgm: number | null;
  fga: number | null;
  fg3m: number | null;
  fg3a: number | null;
  ftm: number | null;
  fta: number | null;
  oreb: number | null;
  dreb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  tov: number | null;
  pf: number | null;
  fouls_drawn: number | null;
  shots_rejected: number | null;
  players: { id: string; full_name: string; jersey_number: number | null; team_id: string } | null;
}

const n = (v: number | null | undefined) => v ?? 0;

function rowPir(row: StatsRow) {
  return pir({
    pts: n(row.pts), oreb: n(row.oreb), dreb: n(row.dreb), ast: n(row.ast), stl: n(row.stl),
    blk: n(row.blk), foulsDrawn: n(row.fouls_drawn), fgm: n(row.fgm), fga: n(row.fga),
    ftm: n(row.ftm), fta: n(row.fta), tov: n(row.tov), shotsRejected: n(row.shots_rejected), pf: n(row.pf),
  });
}

async function teamRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string
): Promise<{ wins: number; losses: number }> {
  const { data } = await supabase
    .from("games")
    .select("home_score, away_score, home_team_id, away_team_id")
    .eq("status", "final")
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

  const { wins, losses } = summarizeRecord(
    (data ?? []).map((g) => ({
      isHome: g.home_team_id === teamId,
      homeScore: g.home_score,
      awayScore: g.away_score,
    }))
  );
  return { wins, losses };
}

function BoxScoreTable({
  teamName,
  rows,
  isOwnSide,
  isLast = false,
}: {
  teamName: string;
  rows: StatsRow[];
  isOwnSide: boolean;
  isLast?: boolean;
}) {
  const withPir = rows.map((r) => ({ row: r, pir: rowPir(r) })).sort((a, b) => b.pir - a.pir);

  const teamTotals = rows.reduce(
    (acc, r) => ({
      min: acc.min + n(r.minutes_played),
      pts: acc.pts + n(r.pts),
      reb: acc.reb + n(r.oreb) + n(r.dreb),
      ast: acc.ast + n(r.ast),
      stl: acc.stl + n(r.stl),
      blk: acc.blk + n(r.blk),
      tov: acc.tov + n(r.tov),
      pf: acc.pf + n(r.pf),
    }),
    { min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 }
  );

  const teamFgm = rows.reduce((s, r) => s + n(r.fgm), 0);
  const teamFga = rows.reduce((s, r) => s + n(r.fga), 0);
  const teamPct = teamFga > 0 ? Math.round((teamFgm / teamFga) * 100) : 0;

  const bestPts = Math.max(0, ...rows.map((r) => n(r.pts)));
  const bestReb = Math.max(0, ...rows.map((r) => n(r.oreb) + n(r.dreb)));
  const bestAst = Math.max(0, ...rows.map((r) => n(r.ast)));
  const bestPir = Math.max(0, ...withPir.map((r) => r.pir));

  return (
    <section className={`py-12 ${isLast ? "" : "border-b border-white/[0.13]"}`}>
      <div className="mb-6 flex items-baseline justify-between gap-8">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">{teamName}</h2>
        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/40">
          {teamTotals.pts} pts · {teamFgm}-{teamFga} FG · {teamPct}%
        </p>
      </div>

      <div className="overflow-x-auto border-t border-white/[0.13] print:overflow-visible">
        <table className="w-full min-w-[940px] text-[13px]">
          <thead>
            <tr>
              <th className="border-b border-white/[0.13] px-2.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-white/55">
                Player
              </th>
              {["MIN", "PTS", "REB", "AST", "STL", "BLK", "TOV", "PF", "FG", "3PT", "FT", "PIR"].map((h) => (
                <th
                  key={h}
                  className="border-b border-white/[0.13] px-2.5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-white/55"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {withPir.map(({ row, pir: playerPir }) => (
              <tr key={row.id} className="hover:bg-white/[0.04]">
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3">
                  {isOwnSide ? (
                    <Link href={`/players/${row.player_id}`} className="text-white/80 hover:text-brand-gold">
                      #{row.players?.jersey_number} {row.players?.full_name}
                    </Link>
                  ) : (
                    <span className="text-white/72">
                      #{row.players?.jersey_number} {row.players?.full_name}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums text-white/72">
                  {Math.round(n(row.minutes_played))}
                </td>
                <td className={`whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums ${n(row.pts) === bestPts && bestPts > 0 ? "font-semibold text-brand-gold" : "text-white/72"}`}>
                  {n(row.pts)}
                </td>
                <td className={`whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums ${n(row.oreb) + n(row.dreb) === bestReb && bestReb > 0 ? "font-semibold text-brand-gold" : "text-white/72"}`}>
                  {n(row.oreb) + n(row.dreb)}
                </td>
                <td className={`whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums ${n(row.ast) === bestAst && bestAst > 0 ? "font-semibold text-brand-gold" : "text-white/72"}`}>
                  {n(row.ast)}
                </td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums text-white/72">{n(row.stl)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums text-white/72">{n(row.blk)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums text-white/72">{n(row.tov)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums text-white/72">{n(row.pf)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums text-white/72">
                  {n(row.fgm)}-{n(row.fga)}
                </td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums text-white/72">
                  {n(row.fg3m)}-{n(row.fg3a)}
                </td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums text-white/72">
                  {n(row.ftm)}-{n(row.fta)}
                </td>
                <td className={`whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums ${playerPir === bestPir && bestPir > 0 ? "font-semibold text-brand-gold" : "text-white/72"}`}>
                  {playerPir}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={13} className="py-6 text-center text-white/40">
                  No stats recorded for this game yet.
                </td>
              </tr>
            )}
            {rows.length > 0 && (
              <tr>
                <td className="whitespace-nowrap border-b-2 border-white/[0.13] px-2.5 py-3 text-[10px] font-bold uppercase tracking-[0.13em] text-white/50">
                  Team
                </td>
                <td className="whitespace-nowrap border-b-2 border-white/[0.13] px-2.5 py-3 text-right tabular-nums font-semibold text-white">
                  {Math.round(teamTotals.min)}
                </td>
                <td className="whitespace-nowrap border-b-2 border-white/[0.13] px-2.5 py-3 text-right tabular-nums font-semibold text-white">{teamTotals.pts}</td>
                <td className="whitespace-nowrap border-b-2 border-white/[0.13] px-2.5 py-3 text-right tabular-nums font-semibold text-white">{teamTotals.reb}</td>
                <td className="whitespace-nowrap border-b-2 border-white/[0.13] px-2.5 py-3 text-right tabular-nums font-semibold text-white">{teamTotals.ast}</td>
                <td className="whitespace-nowrap border-b-2 border-white/[0.13] px-2.5 py-3 text-right tabular-nums font-semibold text-white">{teamTotals.stl}</td>
                <td className="whitespace-nowrap border-b-2 border-white/[0.13] px-2.5 py-3 text-right tabular-nums font-semibold text-white">{teamTotals.blk}</td>
                <td className="whitespace-nowrap border-b-2 border-white/[0.13] px-2.5 py-3 text-right tabular-nums font-semibold text-white">{teamTotals.tov}</td>
                <td className="whitespace-nowrap border-b-2 border-white/[0.13] px-2.5 py-3 text-right tabular-nums font-semibold text-white">{teamTotals.pf}</td>
                <td className="whitespace-nowrap border-b-2 border-white/[0.13] px-2.5 py-3 text-right tabular-nums font-semibold text-white">—</td>
                <td className="whitespace-nowrap border-b-2 border-white/[0.13] px-2.5 py-3 text-right tabular-nums font-semibold text-white">—</td>
                <td className="whitespace-nowrap border-b-2 border-white/[0.13] px-2.5 py-3 text-right tabular-nums font-semibold text-white">—</td>
                <td className="whitespace-nowrap border-b-2 border-white/[0.13] px-2.5 py-3 text-right tabular-nums font-semibold text-white">
                  {withPir.reduce((s, r) => s + r.pir, 0)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function GameBoxScorePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from("games")
    .select(
      "id, game_date, venue, status, home_score, away_score, periods, verified_at, home_team:teams!games_home_team_id_fkey(id, name, is_own_team), away_team:teams!games_away_team_id_fkey(id, name, is_own_team)"
    )
    .eq("id", gameId)
    .maybeSingle();

  if (!game || !game.home_team || !game.away_team) notFound();

  const [{ data: statsRows }, { data: events }, homeRecord, awayRecord] = await Promise.all([
    supabase
      .from("player_game_stats")
      .select("*, players(id, full_name, jersey_number, team_id)")
      .eq("game_id", gameId),
    supabase
      .from("game_events")
      .select("event_type, shot_zone, period, half, team_id, player_id")
      .eq("game_id", gameId),
    teamRecord(supabase, game.home_team.id),
    teamRecord(supabase, game.away_team.id),
  ]);

  const rows = (statsRows ?? []) as StatsRow[];
  const homeRows = rows.filter((r) => r.players?.team_id === game.home_team!.id);
  const awayRows = rows.filter((r) => r.players?.team_id === game.away_team!.id);
  const homeEvents = (events ?? []).filter((e) => e.team_id === game.home_team!.id) as ShotEventRow[];
  const awayEvents = (events ?? []).filter((e) => e.team_id === game.away_team!.id) as ShotEventRow[];

  const ownIsHome = game.home_team.is_own_team || !game.away_team.is_own_team;

  const homePeriods = aggregateByPeriod(homeEvents);
  const awayPeriods = aggregateByPeriod(awayEvents);
  const totalPeriods = game.periods ?? 4;
  const periodKeys = Array.from(
    { length: Math.max(totalPeriods, ...homePeriods.map((p) => p.key), ...awayPeriods.map((p) => p.key), 0) },
    (_, i) => i + 1
  );
  const periodLabelFor = (p: number) => (p <= totalPeriods ? `Q${p}` : `OT${p - totalPeriods}`);

  const usPeriods = ownIsHome ? homePeriods : awayPeriods;
  const themPeriods = ownIsHome ? awayPeriods : homePeriods;
  let swingPeriod = { key: 1, diff: 0, us: 0, them: 0 };
  for (const key of periodKeys) {
    const us = usPeriods.find((p) => p.key === key)?.pts ?? 0;
    const them = themPeriods.find((p) => p.key === key)?.pts ?? 0;
    if (Math.abs(us - them) > Math.abs(swingPeriod.diff)) swingPeriod = { key, diff: us - them, us, them };
  }

  const allWithPir = rows.map((r) => ({ row: r, pir: rowPir(r) }));
  const topPir = allWithPir.length > 0 ? allWithPir.reduce((a, b) => (b.pir > a.pir ? b : a)) : null;
  const topScorerRow = rows.length > 0 ? rows.reduce((a, b) => (n(b.pts) > n(a.pts) ? b : a)) : null;

  // ── Data check: player totals, quarter totals and unattributed points must
  // reconcile against the official score. A live-entry tap can be recorded without
  // a player selected — that basket still counts on the board but never lands in
  // anyone's box score line, which is exactly the kind of silent gap worth surfacing.
  const rawEvents = events ?? [];
  const unattributedHomePts = rawEvents
    .filter((e) => e.team_id === game.home_team!.id && e.player_id === null)
    .reduce((s, e) => s + pointsForEvent(e.event_type as GameEventType), 0);
  const unattributedAwayPts = rawEvents
    .filter((e) => e.team_id === game.away_team!.id && e.player_id === null)
    .reduce((s, e) => s + pointsForEvent(e.event_type as GameEventType), 0);
  const homePlayerPts = homeRows.reduce((s, r) => s + n(r.pts), 0);
  const awayPlayerPts = awayRows.reduce((s, r) => s + n(r.pts), 0);
  const homeQuarterPts = homePeriods.reduce((s, p) => s + p.pts, 0);
  const awayQuarterPts = awayPeriods.reduce((s, p) => s + p.pts, 0);

  const dataCheck = {
    homeScoreReconciles: homePlayerPts + unattributedHomePts === (game.home_score ?? 0),
    awayScoreReconciles: awayPlayerPts + unattributedAwayPts === (game.away_score ?? 0),
    homeQuarterReconciles: homeQuarterPts === (game.home_score ?? 0),
    awayQuarterReconciles: awayQuarterPts === (game.away_score ?? 0),
    unattributedHomePts,
    unattributedAwayPts,
  };

  const statusColor =
    game.status === "final" ? "text-brand-gold" : game.status === "live" ? "text-[#ff5a5a]" : "text-white/40";

  return (
    <div className="mx-auto max-w-[1280px]">
      {/* D1 · scoreboard header */}
      <section className="border-b border-white/[0.13] py-14">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] ${statusColor}`}>
              {game.status === "live" && <span className="h-[7px] w-[7px] rounded-full bg-[#ff5a5a]" />}
              {game.status}
            </span>
            {game.status === "final" && (
              <span
                className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
                  game.verified_at ? "text-brand-gold" : "text-white/35"
                }`}
              >
                {game.verified_at ? `Reviewed ${formatGameDate(game.verified_at)}` : "Not yet reviewed"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/40">
              {formatGameDate(game.game_date)}
              {game.venue ? ` · ${game.venue}` : ""}
            </p>
            <PrintButton label="Print box score" />
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-10">
          <div className="text-right">
            <p className="text-[34px] font-bold uppercase tracking-[0.03em] text-white">{game.home_team.name}</p>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.13em] ${ownIsHome ? "text-brand-gold" : "text-white/50"}`}>
              Home · {homeRecord.wins}–{homeRecord.losses}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[84px] font-bold tabular-nums text-brand-gold">
              {ownIsHome ? game.home_score : game.away_score}
            </span>
            <span className="text-[34px] text-white/25">–</span>
            <span className="text-[84px] font-bold tabular-nums text-white">
              {ownIsHome ? game.away_score : game.home_score}
            </span>
          </div>
          <div>
            <p className="text-[34px] font-bold uppercase tracking-[0.03em] text-white">{game.away_team.name}</p>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.13em] ${!ownIsHome ? "text-brand-gold" : "text-white/50"}`}>
              Away · {awayRecord.wins}–{awayRecord.losses}
            </p>
          </div>
        </div>

        {game.status !== "final" && (
          <div className="mt-8 flex justify-center print:hidden">
            <Link
              href={`/games/${gameId}/live`}
              className="rounded-[14px] bg-brand-gold px-[22px] py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#111] hover:bg-brand-gold-600"
            >
              Live scout report
            </Link>
          </div>
        )}
      </section>

      {/* D2 · quarter by quarter, who decided it */}
      <section className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-14 border-b border-white/[0.13] py-12">
        <div>
          <div className="mb-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Quarter by quarter
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr>
                <th className="border-b border-white/[0.13] px-2.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">
                  Team
                </th>
                {periodKeys.map((p) => (
                  <th key={p} className="border-b border-white/[0.13] px-2.5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">
                    {periodLabelFor(p)}
                  </th>
                ))}
                <th className="border-b border-white/[0.13] px-2.5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">
                  Final
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { team: game.home_team, periods: homePeriods, score: game.home_score, us: ownIsHome },
                { team: game.away_team, periods: awayPeriods, score: game.away_score, us: !ownIsHome },
              ].map(({ team, periods, score, us }) => (
                <tr key={team.id}>
                  <td className={`whitespace-nowrap py-3.5 text-[14px] ${us ? "font-medium text-white" : "font-normal text-white/72"}`}>
                    {team.name}
                  </td>
                  {periodKeys.map((p) => (
                    <td key={p} className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3.5 text-right tabular-nums text-white/72">
                      {periods.find((s) => s.key === p)?.pts ?? 0}
                    </td>
                  ))}
                  <td
                    className={`whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3.5 text-right tabular-nums ${
                      us ? "font-bold text-brand-gold" : "font-bold text-white"
                    }`}
                  >
                    {score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="mb-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Who decided it
          </div>
          {[
            {
              label: "Top PIR",
              name: topPir ? `#${topPir.row.players?.jersey_number} ${topPir.row.players?.full_name}` : "—",
              value: topPir ? String(topPir.pir) : "—",
            },
            {
              label: "Top scorer",
              name: topScorerRow ? `#${topScorerRow.players?.jersey_number} ${topScorerRow.players?.full_name}` : "—",
              value: topScorerRow ? `${n(topScorerRow.pts)} pts` : "—",
            },
            {
              label: "Swing quarter",
              name: `${periodLabelFor(swingPeriod.key)} — ${swingPeriod.us} to ${swingPeriod.them}`,
              value: swingPeriod.diff > 0 ? `+${swingPeriod.diff}` : String(swingPeriod.diff),
            },
          ].map((r) => (
            <div key={r.label} className="flex items-baseline justify-between border-b border-white/[0.13] py-3.5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{r.label}</div>
                <div className="text-[15px] font-medium text-white">{r.name}</div>
              </div>
              <span className="text-[24px] font-bold tabular-nums text-brand-gold">{r.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* D2b · data check */}
      {game.status === "final" && (
        <section className="border-b border-white/[0.13] py-12 print:hidden">
          <div className="mb-6 flex items-baseline justify-between gap-8">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Data check</h2>
            {game.verified_at ? (
              <p className="text-[13px] text-white/45">
                Reviewed {formatGameDate(game.verified_at)} — any further edit to this game clears this.
              </p>
            ) : (
              <form action={markGameVerified}>
                <input type="hidden" name="game_id" value={gameId} />
                <button
                  type="submit"
                  className="rounded-[14px] border border-brand-gold/50 px-[18px] py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-gold hover:bg-brand-gold/10"
                >
                  Mark as reviewed
                </button>
              </form>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-14 gap-y-2 text-[13px]">
            {[
              {
                label: `${game.home_team.name} — players vs. scoreboard`,
                ok: dataCheck.homeScoreReconciles,
                detail: `${homePlayerPts} pts across the box score, ${game.home_score} on the board`,
              },
              {
                label: `${game.away_team.name} — players vs. scoreboard`,
                ok: dataCheck.awayScoreReconciles,
                detail: `${awayPlayerPts} pts across the box score, ${game.away_score} on the board`,
              },
              {
                label: `${game.home_team.name} — quarters vs. final`,
                ok: dataCheck.homeQuarterReconciles,
                detail: `${homeQuarterPts} pts across the quarter breakdown, ${game.home_score} final`,
              },
              {
                label: `${game.away_team.name} — quarters vs. final`,
                ok: dataCheck.awayQuarterReconciles,
                detail: `${awayQuarterPts} pts across the quarter breakdown, ${game.away_score} final`,
              },
            ].map((check) => (
              <div key={check.label} className="flex items-baseline justify-between gap-4 border-b border-white/[0.09] py-2.5">
                <span className="text-white/60">{check.label}</span>
                <span className={check.ok ? "text-white/40" : "font-semibold text-[#ff5a5a]"}>
                  {check.ok ? "Matches" : `Off — ${check.detail}`}
                </span>
              </div>
            ))}
            {(unattributedHomePts > 0 || unattributedAwayPts > 0) && (
              <div className="col-span-2 mt-1 rounded border border-[#ff5a5a]/40 px-4 py-3 text-[#ff5a5a]">
                {unattributedHomePts > 0 &&
                  `${unattributedHomePts} pt(s) for ${game.home_team.name} came from a tap with no player selected. `}
                {unattributedAwayPts > 0 &&
                  `${unattributedAwayPts} pt(s) for ${game.away_team.name} came from a tap with no player selected.`}
              </div>
            )}
          </div>
        </section>
      )}

      {/* D3 · two box scores */}
      <BoxScoreTable teamName={game.home_team.name} rows={homeRows} isOwnSide={ownIsHome} />
      <BoxScoreTable teamName={game.away_team.name} rows={awayRows} isOwnSide={!ownIsHome} isLast />
    </div>
  );
}
