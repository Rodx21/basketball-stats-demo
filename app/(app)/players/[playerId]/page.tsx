import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShotChartSvg } from "@/components/ShotChartSvg";
import { formatGameDate } from "@/lib/format";
import { aggregateClutch, aggregateZones, type ZoneStat } from "@/lib/shotChart";
import { zoneLabel } from "@/lib/shotZones";
import { heatColorForT, heatT } from "@/lib/heat";
import { sumLines } from "@/lib/stats/aggregate";
import { astToTov, efgPct, fg3Pct, fgPct, ftPct, gameScore, tsPct } from "@/lib/stats/basic";
import { pir } from "@/lib/stats/pir";

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

const n = (v: number | null | undefined) => v ?? 0;

interface Line {
  pts: number; fgm: number; fga: number; fg3m: number; fg3a: number; ftm: number; fta: number;
  oreb: number; dreb: number; ast: number; stl: number; blk: number; tov: number; pf: number;
  foulsDrawn: number; shotsRejected: number;
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("id, full_name, jersey_number, position, team_id, teams(name)")
    .eq("id", playerId)
    .maybeSingle();

  if (!player) notFound();

  const { data: gameStatsRaw } = await supabase
    .from("player_game_stats")
    .select(
      "*, games!inner(id, game_date, status, periods, home_score, away_score, home_team:teams!games_home_team_id_fkey(id, name, is_own_team), away_team:teams!games_away_team_id_fkey(id, name, is_own_team))"
    )
    .eq("player_id", playerId)
    .eq("games.status", "final")
    .order("games(game_date)", { ascending: true });

  const { data: events } = await supabase
    .from("game_events")
    .select("game_id, event_type, shot_zone, period, half, games!inner(status)")
    .eq("player_id", playerId)
    .eq("games.status", "final");

  // Team season totals stand in as the "league" reference for uPER, and as the
  // squad baseline the efficiency tiles compare this player against.
  const { data: teamRows } = await supabase
    .from("player_game_stats")
    .select(
      "minutes_played, pts, fgm, fga, fg3m, fg3a, ftm, fta, oreb, dreb, ast, stl, blk, tov, pf, fouls_drawn, shots_rejected, players!inner(team_id), games!inner(status)"
    )
    .eq("players.team_id", player.team_id)
    .eq("games.status", "final");

  // Squad ranking, to tell whether this player leads the team in anything.
  const { data: squadRows } = await supabase
    .from("players")
    .select(
      "id, player_game_stats!inner(pts, minutes_played, games!inner(status))"
    )
    .eq("team_id", player.team_id)
    .eq("active", true)
    .eq("player_game_stats.games.status", "final");

  const rowsAsc = gameStatsRaw ?? [];
  const rows = [...rowsAsc].reverse(); // most recent first, for the game log
  const gamesPlayed = rowsAsc.length;

  const totals = sumLines(rowsAsc);
  const teamTotals = sumLines(teamRows ?? []);

  const perGame = (v: number) => (gamesPlayed > 0 ? v / gamesPlayed : 0);

  const zoneStats = aggregateZones(events ?? []);

  const regulationPeriods: Record<string, number> = {};
  for (const row of rowsAsc) {
    if (row.games) regulationPeriods[row.games.id] = row.games.periods ?? 4;
  }
  const clutch = aggregateClutch(events ?? [], regulationPeriods);

  // ── C1 · hero ──────────────────────────────────────────────────────
  const squadByPts = (squadRows ?? [])
    .map((p) => ({
      id: p.id,
      pts: (p.player_game_stats ?? []).reduce((s, r) => s + n(r.pts), 0),
    }))
    .sort((a, b) => b.pts - a.pts);
  const leadsScoring = squadByPts.length > 0 && squadByPts[0].id === player.id;

  const zoneEntries = Object.entries(zoneStats).filter(([, s]) => s.attempts > 0);
  const leftAttempts = zoneEntries.filter(([id]) => id.endsWith("_left")).reduce((s, [, z]) => s + z.attempts, 0);
  const rightAttempts = zoneEntries.filter(([id]) => id.endsWith("_right")).reduce((s, [, z]) => s + z.attempts, 0);
  const sidedAttempts = leftAttempts + rightAttempts;
  const leftMakes = zoneEntries.filter(([id]) => id.endsWith("_left")).reduce((s, [, z]) => s + z.makes, 0);
  const rightMakes = zoneEntries.filter(([id]) => id.endsWith("_right")).reduce((s, [, z]) => s + z.makes, 0);

  function readLine(): string | null {
    const clauses: string[] = [];
    if (leadsScoring && gamesPlayed > 0) clauses.push("Leads the squad in points");
    if (sidedAttempts >= 6) {
      const dominant = leftAttempts >= rightAttempts ? "left" : "right";
      const dominantShare = Math.round(((dominant === "left" ? leftAttempts : rightAttempts) / sidedAttempts) * 100);
      const domPct = dominant === "left" ? leftMakes / Math.max(1, leftAttempts) : rightMakes / Math.max(1, rightAttempts);
      const otherPct = dominant === "left" ? rightMakes / Math.max(1, rightAttempts) : leftMakes / Math.max(1, leftAttempts);
      const betterThere = domPct >= otherPct;
      clauses.push(
        `Volume comes from the ${dominant} side of the floor — ${dominantShare}% of his attempts${
          betterThere ? ", and his best percentages sit there too" : ""
        }`
      );
    }
    if (clauses.length === 0) return null;
    return clauses.join(". ") + ".";
  }
  const generatedLine = readLine();

  // ── C2 · game by game ────────────────────────────────────────────
  const gameByGame = rowsAsc
    .filter((row) => row.games)
    .map((row) => {
      const g = row.games!;
      const ownIsHome = g.home_team?.is_own_team;
      const us = ownIsHome ? g.home_score ?? 0 : g.away_score ?? 0;
      const them = ownIsHome ? g.away_score ?? 0 : g.home_score ?? 0;
      const opponent = ownIsHome ? g.away_team : g.home_team;
      return {
        gameId: g.id,
        opponentName: opponent?.name ?? "TBD",
        us,
        them,
        win: us > them,
        pts: n(row.pts),
        pir: pir({
          pts: n(row.pts), oreb: n(row.oreb), dreb: n(row.dreb), ast: n(row.ast), stl: n(row.stl),
          blk: n(row.blk), foulsDrawn: n(row.fouls_drawn), fgm: n(row.fgm), fga: n(row.fga),
          ftm: n(row.ftm), fta: n(row.fta), tov: n(row.tov), shotsRejected: n(row.shots_rejected), pf: n(row.pf),
        }),
      };
    });
  const maxGamePts = Math.max(1, ...gameByGame.map((g) => g.pts));
  const avgPts = perGame(totals.pts);

  // ── C3 · efficiency & clutch ─────────────────────────────────────
  const teamFgPct = fgPct(teamTotals);
  const teamFg3Pct = fg3Pct(teamTotals);
  const teamFtPct = ftPct(teamTotals);
  const teamTsPct = tsPct(teamTotals);
  const teamEfgPct = efgPct(teamTotals);
  const teamAstToTov = astToTov(teamTotals);
  const clutchFgPct = clutch.fga > 0 ? clutch.fgm / clutch.fga : 0;
  const seasonFgPct = fgPct(totals);

  const tiles: { label: string; value: string; hint: string; gold: boolean }[] = [
    { label: "FG%", value: pct(fgPct(totals)), hint: `${totals.fgm} of ${totals.fga}`, gold: fgPct(totals) > teamFgPct },
    { label: "3P%", value: pct(fg3Pct(totals)), hint: `${totals.fg3m} of ${totals.fg3a}`, gold: fg3Pct(totals) > teamFg3Pct },
    { label: "FT%", value: pct(ftPct(totals)), hint: `${totals.ftm} of ${totals.fta}`, gold: ftPct(totals) > teamFtPct },
    {
      label: "TS%",
      value: pct(tsPct(totals)),
      hint: tsPct(totals) > teamTsPct ? "Above squad average" : `Squad average ${pct(teamTsPct)}`,
      gold: tsPct(totals) > teamTsPct,
    },
    { label: "eFG%", value: pct(efgPct(totals)), hint: "Three-point weighted", gold: efgPct(totals) > teamEfgPct },
    {
      label: "AST/TOV",
      value: astToTov(totals).toFixed(2),
      hint: `${totals.ast} AST · ${totals.tov} TOV`,
      gold: astToTov(totals) > teamAstToTov,
    },
    { label: "Clutch PTS", value: String(clutch.pts), hint: "Last period, 2nd half", gold: clutch.pts > 0 },
    {
      label: "Clutch FG",
      value: clutch.fga > 0 ? pct(clutchFgPct) : "—",
      hint:
        clutch.fga > 0
          ? `${clutchFgPct >= seasonFgPct ? "Up" : "Down"} on his season ${pct(seasonFgPct)}`
          : "No clutch attempts yet",
      gold: clutch.fga > 0 && clutchFgPct > seasonFgPct,
    },
  ];

  // ── C4 · shot chart, ranked by volume ────────────────────────────
  const byVolume = Object.entries(zoneStats)
    .map(([id, stat]) => ({ id, stat: stat as ZoneStat }))
    .sort((a, b) => b.stat.attempts - a.stat.attempts);
  const maxAttempts = Math.max(1, ...byVolume.map((z) => z.stat.attempts));
  const sampledPcts = byVolume.filter((z) => z.stat.attempts > 0).map((z) => z.stat.makes / z.stat.attempts);
  const minZonePct = sampledPcts.length > 0 ? Math.min(...sampledPcts) : 0;
  const maxZonePct = sampledPcts.length > 0 ? Math.max(...sampledPcts) : 1;

  // ── C5 · game log, season bests per column ───────────────────────
  const bestPts = Math.max(0, ...rowsAsc.map((r) => n(r.pts)));
  const bestReb = Math.max(0, ...rowsAsc.map((r) => n(r.oreb) + n(r.dreb)));
  const bestAst = Math.max(0, ...rowsAsc.map((r) => n(r.ast)));
  const bestGmSc = Math.max(0, ...rowsAsc.map((r) => gameScore(rowToLine(r))));
  const bestPir = Math.max(0, ...gameByGame.map((g) => g.pir));
  const bestTs = Math.max(0, ...rowsAsc.map((r) => tsPct(rowToLine(r))));
  const bestMin = Math.max(0, ...rowsAsc.map((r) => Number(r.minutes_played ?? 0)));

  function rowToLine(row: (typeof rowsAsc)[number]): Line {
    return {
      pts: n(row.pts), fgm: n(row.fgm), fga: n(row.fga), fg3m: n(row.fg3m), fg3a: n(row.fg3a),
      ftm: n(row.ftm), fta: n(row.fta), oreb: n(row.oreb), dreb: n(row.dreb), ast: n(row.ast),
      stl: n(row.stl), blk: n(row.blk), tov: n(row.tov), pf: n(row.pf),
      foulsDrawn: n(row.fouls_drawn), shotsRejected: n(row.shots_rejected),
    };
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      {/* C1 · hero */}
      <section className="grid grid-cols-[minmax(0,1fr)_380px] items-end gap-16 border-b border-white/[0.13] pt-14 pb-11">
        <div>
          <p className="mb-[18px] text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Roster — {player.position ?? "Player"} · {player.teams?.name}
          </p>
          <div className="flex items-start gap-7">
            <span className="text-[96px] font-bold leading-[0.82] tracking-[-0.02em] tabular-nums text-brand-blue">
              {String(player.jersey_number ?? "-").padStart(2, "0")}
            </span>
            <h1 className="pt-2 text-[64px] font-bold uppercase leading-[0.94] tracking-[0.03em] text-white">
              {player.full_name}
            </h1>
          </div>
          {generatedLine && (
            <p className="mt-6 max-w-[30em] font-[family-name:var(--font-serif)] text-[21px] italic leading-[1.45] text-white/60">
              {generatedLine}
            </p>
          )}
        </div>

        <div>
          {[
            ["Games played", String(gamesPlayed), false],
            ["Minutes / gm", perGame(totals.minutes).toFixed(1), false],
            ["PPG", avgPts.toFixed(1), true],
            ["RPG", perGame(totals.oreb + totals.dreb).toFixed(1), false],
            ["APG", perGame(totals.ast).toFixed(1), false],
            ["PIR / gm", (perGame(pir(totals))).toFixed(1), true],
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

      {/* C2 · game by game */}
      <section className="border-b border-white/[0.13] py-14">
        <div className="mb-9 flex items-baseline justify-between gap-8">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">Game by game</h2>
          <p className="text-[13px] text-white/45">Points per game · the dashed line is his season average.</p>
        </div>

        {gameByGame.length === 0 ? (
          <p className="text-sm text-white/40">No final games logged yet.</p>
        ) : (
          <>
            <div className="relative flex h-[230px] items-end gap-3">
              <div
                className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-white/35"
                style={{ bottom: `${(avgPts / maxGamePts) * 82}%` }}
              />
              {gameByGame.map((g) => (
                <div
                  key={g.gameId}
                  className="flex h-full flex-1 flex-col justify-end gap-2"
                  title={`${g.opponentName} — ${g.us}–${g.them} · ${g.pts} pts, ${g.pir} PIR`}
                >
                  <span
                    className={`text-center text-[13px] font-bold tabular-nums ${
                      g.pts >= avgPts ? "text-brand-gold" : "text-white/50"
                    }`}
                  >
                    {g.pts}
                  </span>
                  <div
                    className={`w-full rounded-t-sm ${g.win ? "bg-brand-gold" : "bg-brand-blue"}`}
                    style={{ height: `${(g.pts / maxGamePts) * 82}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-3 border-t border-white/[0.13] pt-3">
              {gameByGame.map((g) => (
                <div key={g.gameId} className="flex-1 text-center">
                  <div className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-white/35">
                    {g.opponentName}
                  </div>
                  <div className="text-[10px] font-semibold tabular-nums text-white/55">{g.pir} PIR</div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* C3 · efficiency & clutch */}
      <section className="border-b border-white/[0.13] py-14">
        <h2 className="mb-9 text-[13px] font-bold uppercase tracking-[0.16em] text-white">Efficiency &amp; clutch</h2>
        <div className="grid grid-cols-4 gap-x-12 gap-y-8">
          {tiles.map((tile) => (
            <div key={tile.label} className="flex flex-col gap-1.5 border-t border-white/[0.13] pt-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{tile.label}</span>
              <span className={`text-[34px] font-bold leading-none tabular-nums ${tile.gold ? "text-brand-gold" : "text-white"}`}>
                {tile.value}
              </span>
              <span className="text-[11px] text-white/40">{tile.hint}</span>
            </div>
          ))}
        </div>
      </section>

      {/* C4 · his shot chart */}
      <section className="border-b border-white/[0.13] py-14">
        <div className="mb-9 flex items-baseline justify-between gap-8">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">His shot chart</h2>
          <div className="flex items-center gap-[18px]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">Cold</span>
            <span
              className="h-2 w-[180px] rounded-sm"
              style={{ background: "linear-gradient(90deg,#1746a2 0%,#8f7c53 50%,#f2b705 100%)" }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">Hot</span>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-14">
          <ShotChartSvg zoneStats={zoneStats} />

          <div>
            <div className="mb-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
              Where the shots come from
            </div>
            {byVolume.map(({ id, stat }) => {
              const zonePct = stat.attempts > 0 ? stat.makes / stat.attempts : 0;
              return (
                <div
                  key={id}
                  className="grid grid-cols-[96px_minmax(0,1fr)_62px] items-center gap-3 border-b border-white/[0.09] py-[9px]"
                >
                  <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">
                    {zoneLabel(id)}
                  </span>
                  <span className="h-1.5 rounded-sm bg-white/[0.07]">
                    <span
                      className="block h-1.5 rounded-sm"
                      style={{
                        width: `${(stat.attempts / maxAttempts) * 100}%`,
                        background:
                          stat.attempts > 0 ? heatColorForT(heatT(zonePct, minZonePct, maxZonePct)) : "transparent",
                      }}
                    />
                  </span>
                  <span className="text-right text-[12px] font-semibold tabular-nums text-white">
                    {stat.attempts > 0 ? `${stat.makes}/${stat.attempts}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* C5 · game log */}
      <section className="py-14">
        <div className="mb-7 flex items-baseline justify-between gap-8">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">Game log</h2>
          <p className="text-[13px] text-white/45">Gold marks his season best in each column</p>
        </div>

        <div className="overflow-x-auto border-t border-white/[0.13]">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr>
                {["Date", "Opponent", "Result"].map((h) => (
                  <th key={h} className="border-b border-white/[0.13] px-2.5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-white/55">
                    {h}
                  </th>
                ))}
                {["MIN", "PTS", "REB", "AST", "FG", "3PT", "FT", "TS%", "GmSc", "PIR"].map((h) => (
                  <th key={h} className="border-b border-white/[0.13] px-2.5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-white/55">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const g = row.games;
                const ownIsHome = g?.home_team?.is_own_team;
                const opponent = ownIsHome ? g?.away_team : g?.home_team;
                const us = ownIsHome ? g?.home_score ?? 0 : g?.away_score ?? 0;
                const them = ownIsHome ? g?.away_score ?? 0 : g?.home_score ?? 0;
                const win = us > them;
                const line = rowToLine(row);
                const reb = line.oreb + line.dreb;
                const gmSc = gameScore(line);
                const ts = tsPct(line);
                const rowPir = pir(line);
                const minutes = Number(row.minutes_played ?? 0);
                return (
                  <tr key={row.id} className="hover:bg-white/[0.04]">
                    <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-white/50">
                      {g?.game_date ? formatGameDate(g.game_date) : "—"}
                    </td>
                    <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 font-medium text-white">
                      {opponent?.name ?? "—"}
                    </td>
                    <td className={`whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-[11px] font-bold tracking-[0.06em] ${win ? "text-brand-gold" : "text-white/40"}`}>
                      {win ? "W" : "L"} {us}–{them}
                    </td>
                    <td className={`whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums ${minutes >= bestMin && bestMin > 0 ? "font-semibold text-brand-gold" : "text-white/72"}`}>
                      {Math.round(minutes)}
                    </td>
                    <td className={`whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums ${line.pts >= bestPts && bestPts > 0 ? "font-semibold text-brand-gold" : "text-white/72"}`}>
                      {line.pts}
                    </td>
                    <td className={`whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums ${reb >= bestReb && bestReb > 0 ? "font-semibold text-brand-gold" : "text-white/72"}`}>
                      {reb}
                    </td>
                    <td className={`whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums ${line.ast >= bestAst && bestAst > 0 ? "font-semibold text-brand-gold" : "text-white/72"}`}>
                      {line.ast}
                    </td>
                    <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums text-white/72">
                      {line.fgm}-{line.fga}
                    </td>
                    <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums text-white/72">
                      {line.fg3m}-{line.fg3a}
                    </td>
                    <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums text-white/72">
                      {line.ftm}-{line.fta}
                    </td>
                    <td className={`whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums ${ts >= bestTs && bestTs > 0 ? "font-semibold text-brand-gold" : "text-white/72"}`}>
                      {pct(ts)}
                    </td>
                    <td className={`whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums ${gmSc >= bestGmSc && bestGmSc > 0 ? "font-semibold text-brand-gold" : "text-white/72"}`}>
                      {gmSc.toFixed(1)}
                    </td>
                    <td className={`whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums ${rowPir >= bestPir && bestPir > 0 ? "font-semibold text-brand-gold" : "text-white/72"}`}>
                      {rowPir}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={13} className="py-6 text-center text-white/40">
                    No games logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
