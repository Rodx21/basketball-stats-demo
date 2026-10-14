"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CourtDiagram } from "@/components/CourtDiagram";
import { LiveBoxScoreTable, type EditableColumn } from "@/components/LiveBoxScoreTable";
import { zoneLabel, zonePoints, type CourtSide } from "@/lib/shotZones";
import {
  applyDelta,
  deltaForEvent,
  EMPTY_STAT_LINE,
  eventForZone,
  periodLabel,
  pointsForEvent,
  type GameEventType,
  type StatLine,
} from "@/lib/events";

interface Player {
  id: string;
  full_name: string;
  jersey_number: number | null;
  position: string | null;
}

interface TeamData {
  id: string;
  name: string;
  players: Player[];
}

interface RecentEvent {
  id: string;
  playerId: string | null;
  teamId: string;
  eventType: GameEventType;
}

export function LiveGameClient({
  gameId,
  status,
  totalPeriods,
  initialPeriod,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  initialStats,
  ownTeamId,
  hasOwnStarters,
}: {
  gameId: string;
  status: string;
  totalPeriods: number;
  initialPeriod: number;
  homeTeam: TeamData;
  awayTeam: TeamData;
  homeScore: number;
  awayScore: number;
  initialStats: Record<string, StatLine>;
  ownTeamId: string | null;
  hasOwnStarters: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const teams = [homeTeam, awayTeam];

  const [gameStatus, setGameStatus] = useState(status);
  const [period, setPeriod] = useState(initialPeriod);
  const [maxPeriod, setMaxPeriod] = useState(Math.max(initialPeriod, totalPeriods));
  const [half, setHalf] = useState<1 | 2>(1);
  const [home, setHome] = useState(homeScore);
  const [away, setAway] = useState(awayScore);
  const [stats, setStats] = useState<Record<string, StatLine>>(initialStats);
  const [error, setError] = useState<string | null>(null);
  const recentEvents = useRef<RecentEvent[]>([]);
  const [undoAvailable, setUndoAvailable] = useState(false);

  const [editTeamId, setEditTeamId] = useState(homeTeam.id);
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null);

  const [sideTeams, setSideTeams] = useState<{ left: string; right: string }>({
    left: homeTeam.id,
    right: awayTeam.id,
  });
  const [shotZone, setShotZone] = useState<string | null>(null);
  const [shotSide, setShotSide] = useState<CourtSide | null>(null);
  const [shotPlayerId, setShotPlayerId] = useState<string | null>(null);

  const [startersConfirmed, setStartersConfirmed] = useState(hasOwnStarters);
  const [selectedStarters, setSelectedStarters] = useState<string[]>([]);
  const showStarterGate = Boolean(ownTeamId) && !startersConfirmed;

  useEffect(() => {
    // Games with no identifiable own team (e.g. scouting two other clubs) skip the
    // starting-five gate entirely, so they keep the old go-live-immediately behavior.
    if (status === "scheduled" && !ownTeamId) {
      supabase.from("games").update({ status: "live" }).eq("id", gameId).then(() => {
        setGameStatus("live");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmStarters() {
    if (!ownTeamId || selectedStarters.length !== 5) return;
    setError(null);

    const { error: insertError } = await supabase.from("game_events").insert(
      selectedStarters.map((playerId) => ({
        game_id: gameId,
        player_id: playerId,
        team_id: ownTeamId,
        period,
        half,
        event_type: "sub_in" as const,
      }))
    );
    if (insertError) {
      setError("Couldn't save the starting five — check your connection and try again.");
      return;
    }

    setStartersConfirmed(true);
    if (gameStatus === "scheduled") {
      await supabase.from("games").update({ status: "live" }).eq("id", gameId);
      setGameStatus("live");
    }
  }

  useEffect(() => {
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "player_game_stats", filter: `game_id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (!row?.player_id) return;
          setStats((prev) => ({
            ...prev,
            [row.player_id as string]: {
              minutes_played: Number(row.minutes_played ?? 0),
              pts: Number(row.pts ?? 0),
              fgm: Number(row.fgm ?? 0),
              fga: Number(row.fga ?? 0),
              fg3m: Number(row.fg3m ?? 0),
              fg3a: Number(row.fg3a ?? 0),
              ftm: Number(row.ftm ?? 0),
              fta: Number(row.fta ?? 0),
              oreb: Number(row.oreb ?? 0),
              dreb: Number(row.dreb ?? 0),
              ast: Number(row.ast ?? 0),
              stl: Number(row.stl ?? 0),
              blk: Number(row.blk ?? 0),
              tov: Number(row.tov ?? 0),
              pf: Number(row.pf ?? 0),
              fouls_drawn: Number(row.fouls_drawn ?? 0),
              shots_rejected: Number(row.shots_rejected ?? 0),
            },
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as { home_score: number; away_score: number; status: string };
          setHome(row.home_score);
          setAway(row.away_score);
          setGameStatus(row.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  async function insertEvent(fields: {
    playerId: string | null;
    teamId: string;
    eventType: GameEventType;
    shotZone?: string;
  }) {
    return supabase
      .from("game_events")
      .insert({
        game_id: gameId,
        player_id: fields.playerId,
        team_id: fields.teamId,
        period,
        half,
        event_type: fields.eventType,
        shot_zone: fields.shotZone ?? null,
      })
      .select("id")
      .single();
  }

  function bumpScore(teamId: string, points: number) {
    if (points === 0) return;
    if (teamId === homeTeam.id) setHome((h) => h + points);
    else setAway((a) => a + points);
  }

  async function recordPlayerEvent(
    playerId: string,
    teamId: string,
    eventType: GameEventType,
    extra?: { shotZone?: string }
  ) {
    setError(null);
    const delta = deltaForEvent(eventType);
    setStats((prev) => ({
      ...prev,
      [playerId]: applyDelta(prev[playerId] ?? { ...EMPTY_STAT_LINE }, delta),
    }));

    const points = pointsForEvent(eventType);
    bumpScore(teamId, points);

    const { data, error: insertError } = await insertEvent({
      playerId,
      teamId,
      eventType,
      shotZone: extra?.shotZone,
    });

    if (insertError || !data) {
      setError("Couldn't save that tap — check your connection.");
      setStats((prev) => ({
        ...prev,
        [playerId]: applyDelta(prev[playerId] ?? { ...EMPTY_STAT_LINE }, delta, -1),
      }));
      bumpScore(teamId, -points);
      return;
    }

    recentEvents.current.push({ id: data.id, playerId, teamId, eventType });
    setUndoAvailable(true);
  }

  function selectShotZone(zoneId: string, side: CourtSide) {
    setShotZone(zoneId);
    setShotSide(side);
    setShotPlayerId(null);
    setEditTeamId(sideTeams[side]);
    setEditPlayerId(null);
  }

  function cancelShot() {
    setShotZone(null);
    setShotSide(null);
    setShotPlayerId(null);
  }

  function swapSides() {
    setSideTeams((prev) => ({ left: prev.right, right: prev.left }));
    cancelShot();
  }

  async function confirmShot(made: boolean) {
    if (!shotZone || !shotSide || !shotPlayerId) return;
    const teamId = sideTeams[shotSide];
    const eventType = eventForZone(zonePoints(shotZone), made);
    const { playerId, zone } = { playerId: shotPlayerId, zone: shotZone };
    cancelShot();
    await recordPlayerEvent(playerId, teamId, eventType, { shotZone: zone });
  }

  const COLUMN_EVENT: Record<EditableColumn, GameEventType> = {
    fgm: "fg_made_2",
    fga: "fg_missed_2",
    fg3m: "fg_made_3",
    fg3a: "fg_missed_3",
    ftm: "ft_made",
    fta: "ft_missed",
    oreb: "reb_off",
    dreb: "reb_def",
    ast: "assist",
    stl: "steal",
    blk: "block",
    tov: "turnover",
    pf: "foul_personal",
    fouls_drawn: "foul_drawn",
    shots_rejected: "shot_rejected",
  };

  async function incrementStat(playerId: string, column: EditableColumn) {
    await recordPlayerEvent(playerId, editTeamId, COLUMN_EVENT[column]);
  }

  async function decrementStat(playerId: string, column: EditableColumn) {
    const eventType = COLUMN_EVENT[column];
    const { data } = await supabase
      .from("game_events")
      .select("id")
      .eq("game_id", gameId)
      .eq("player_id", playerId)
      .eq("event_type", eventType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return;

    setError(null);
    const delta = deltaForEvent(eventType);
    setStats((prev) => ({
      ...prev,
      [playerId]: applyDelta(prev[playerId] ?? { ...EMPTY_STAT_LINE }, delta, -1),
    }));
    bumpScore(editTeamId, -pointsForEvent(eventType));

    const { error: deleteError } = await supabase.from("game_events").delete().eq("id", data.id);
    if (deleteError) {
      setError("Couldn't undo that stat — check your connection.");
      setStats((prev) => ({
        ...prev,
        [playerId]: applyDelta(prev[playerId] ?? { ...EMPTY_STAT_LINE }, delta, 1),
      }));
      bumpScore(editTeamId, pointsForEvent(eventType));
    }
  }

  async function undoLast() {
    const last = recentEvents.current.pop();
    if (!last) {
      setUndoAvailable(false);
      return;
    }
    setUndoAvailable(recentEvents.current.length > 0);
    setError(null);

    if (last.playerId) {
      const delta = deltaForEvent(last.eventType);
      setStats((prev) => ({
        ...prev,
        [last.playerId as string]: applyDelta(prev[last.playerId as string] ?? { ...EMPTY_STAT_LINE }, delta, -1),
      }));
    }
    bumpScore(last.teamId, -pointsForEvent(last.eventType));

    const { error: deleteError } = await supabase.from("game_events").delete().eq("id", last.id);
    if (deleteError) {
      setError("Couldn't undo that tap — check your connection.");
      if (last.playerId) {
        const delta = deltaForEvent(last.eventType);
        setStats((prev) => ({
          ...prev,
          [last.playerId as string]: applyDelta(prev[last.playerId as string] ?? { ...EMPTY_STAT_LINE }, delta, 1),
        }));
      }
      bumpScore(last.teamId, pointsForEvent(last.eventType));
      recentEvents.current.push(last);
      setUndoAvailable(true);
    }
  }

  async function endGame() {
    if (!window.confirm("Mark this game as final? You can still edit stats afterwards.")) return;
    await supabase.from("games").update({ status: "final" }).eq("id", gameId);
    setGameStatus("final");
    router.push(`/games/${gameId}`);
  }

  function addOvertime() {
    const next = maxPeriod + 1;
    setMaxPeriod(next);
    setPeriod(next);
    setHalf(1);
  }

  const shotTeamId = shotSide ? sideTeams[shotSide] : null;
  const shotTeam = shotTeamId ? teams.find((t) => t.id === shotTeamId) : null;
  const shotPlayer = shotPlayerId
    ? teams.flatMap((t) => t.players).find((p) => p.id === shotPlayerId)
    : null;

  const statusColor =
    gameStatus === "final" ? "text-brand-gold" : gameStatus === "live" ? "text-[#ff5a5a]" : "text-white/40";

  if (showStarterGate) {
    const ownRoster = teams.find((t) => t.id === ownTeamId)?.players ?? [];
    return (
      <div className="mx-auto max-w-[720px] py-20">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Before you start</p>
        <h1 className="mb-8 text-[40px] font-bold uppercase leading-[0.95] tracking-[0.03em] text-white">
          Who&apos;s starting?
        </h1>
        <p className="mb-8 text-[14px] leading-[1.6] text-white/50">
          Pick the five players on court right now. This is what makes on/off and lineup stats possible later —
          substitutions work the same as always once the game is under way.
        </p>

        <div className="mb-8 grid grid-cols-2 gap-2.5">
          {ownRoster.map((p) => {
            const selected = selectedStarters.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setSelectedStarters((prev) =>
                    selected ? prev.filter((id) => id !== p.id) : prev.length < 5 ? [...prev, p.id] : prev
                  )
                }
                className={`flex items-center gap-3 rounded-[14px] border px-4 py-3 text-left ${
                  selected ? "border-brand-gold bg-brand-gold/10" : "border-white/20 hover:border-white/40"
                }`}
              >
                <span className="w-7 text-[15px] font-bold tabular-nums text-brand-gold">
                  {String(p.jersey_number ?? "-").padStart(2, "0")}
                </span>
                <span className="text-[14px] font-medium text-white">{p.full_name}</span>
              </button>
            );
          })}
          {ownRoster.length === 0 && (
            <p className="col-span-2 text-sm text-white/40">No active players on the roster.</p>
          )}
        </div>

        {error && <p className="mb-4 text-[13px] text-[#ff5a5a]">{error}</p>}

        <button
          type="button"
          onClick={confirmStarters}
          disabled={selectedStarters.length !== 5}
          className="rounded-[14px] bg-brand-gold px-[22px] py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#111] hover:bg-brand-gold-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm starting five ({selectedStarters.length}/5)
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      {/* H1 · control bar */}
      <div className="flex flex-wrap items-end justify-between gap-8 border-b border-white/[0.13] pb-8">
        <div>
          <div className="flex flex-wrap items-center gap-7">
            <span className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] ${statusColor}`}>
              {gameStatus === "live" && <span className="h-[7px] w-[7px] rounded-full bg-[#ff5a5a]" />}
              {gameStatus}
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">Period</span>
              <div className="flex gap-1.5">
                {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`h-[30px] min-w-[38px] rounded text-[11px] font-bold tracking-[0.06em] ${
                      p === period
                        ? "border border-brand-gold bg-brand-gold text-[#111]"
                        : "border border-white/20 text-white/60"
                    }`}
                  >
                    {periodLabel(p, totalPeriods)}
                  </button>
                ))}
                <button
                  onClick={addOvertime}
                  className="h-[30px] min-w-[38px] rounded border border-dashed border-white/25 text-[11px] font-bold tracking-[0.06em] text-white/45"
                >
                  +OT
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">Half</span>
              <div className="flex gap-1.5">
                {[1, 2].map((h) => (
                  <button
                    key={h}
                    onClick={() => setHalf(h as 1 | 2)}
                    className={`h-[30px] w-[30px] rounded text-[11px] font-bold tracking-[0.06em] ${
                      half === h
                        ? "border border-brand-gold bg-brand-gold text-[#111]"
                        : "border border-white/20 text-white/60"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-[22px] flex items-baseline gap-5">
            <span className="text-[18px] font-semibold uppercase tracking-[0.06em] text-white">{homeTeam.name}</span>
            <span className="text-[54px] font-bold tabular-nums text-brand-gold">{home}</span>
            <span className="text-[24px] text-white/25">–</span>
            <span className="text-[54px] font-bold tabular-nums text-white">{away}</span>
            <span className="text-[18px] font-semibold uppercase tracking-[0.06em] text-white/70">{awayTeam.name}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={undoLast}
            disabled={!undoAvailable}
            className="rounded-[14px] border border-white/20 px-[22px] py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70 disabled:opacity-30"
          >
            Undo last
          </button>
          <button
            onClick={endGame}
            className="rounded-[14px] bg-brand-gold px-[22px] py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#111] hover:bg-brand-gold-600"
          >
            End game
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* H2 · court */}
      <div className="border-b border-white/[0.13] py-9">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">Shot chart entry</h2>
          <div className="flex items-center gap-5">
            <button onClick={swapSides} className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40 hover:text-white/70">
              ⇄ Switch sides
            </button>
            {(shotZone || shotPlayerId) && (
              <button onClick={cancelShot} className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40 hover:text-white/70">
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="mb-3.5 flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-white/55">
          <span>← {teams.find((t) => t.id === sideTeams.left)?.name}</span>
          <span>{teams.find((t) => t.id === sideTeams.right)?.name} →</span>
        </div>

        <CourtDiagram
          selectedZone={shotZone && shotSide ? { zoneId: shotZone, side: shotSide } : null}
          onSelect={selectShotZone}
        />

        <div className="mt-[18px]">
          {!shotZone && (
            <p className="text-center text-[12px] font-semibold uppercase tracking-[0.13em] text-white/35">
              Tap a zone on either basket to start
            </p>
          )}

          {shotZone && shotTeam && !shotPlayerId && (
            <p className="text-center text-[12px] font-semibold uppercase tracking-[0.13em] text-brand-gold">
              {zoneLabel(shotZone)} — tap the player in {shotTeam.name}&apos;s box score below
            </p>
          )}

          {shotZone && shotPlayer && (
            <div className="space-y-4">
              <p className="text-center text-[12px] font-semibold uppercase tracking-[0.13em] text-white">
                {zoneLabel(shotZone)} ({zonePoints(shotZone)}PT) — #{shotPlayer.jersey_number}{" "}
                {shotPlayer.full_name}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => confirmShot(true)}
                  className="flex-1 rounded-[14px] bg-brand-gold py-[18px] text-[13px] font-bold uppercase tracking-[0.13em] text-[#111] hover:bg-brand-gold-600"
                >
                  Made
                </button>
                <button
                  onClick={() => confirmShot(false)}
                  className="flex-1 rounded-[14px] border border-white/20 py-[18px] text-[13px] font-bold uppercase tracking-[0.13em] text-white/70 hover:bg-white/5"
                >
                  Miss
                </button>
              </div>
              <p className="text-center">
                <button
                  onClick={() => setShotPlayerId(null)}
                  className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40 hover:text-white/70"
                >
                  Change player
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* H3 · live box score */}
      <div className="py-9">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Editing</span>
            <div className="flex gap-2">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setEditTeamId(t.id);
                    setEditPlayerId(null);
                    cancelShot();
                  }}
                  className={`rounded-[14px] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${
                    editTeamId === t.id
                      ? "border border-brand-gold bg-brand-gold text-[#111]"
                      : "border border-white/20 text-white/60"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[12px] text-white/40">Tap a player to open the steppers on their row</p>
        </div>

        <LiveBoxScoreTable
          teamName={teams.find((t) => t.id === editTeamId)?.name ?? ""}
          players={teams.find((t) => t.id === editTeamId)?.players ?? []}
          stats={stats}
          editable
          selectedPlayerId={editPlayerId}
          onSelectPlayer={(id) => {
            if (shotZone) {
              setShotPlayerId(id);
            } else {
              setEditPlayerId(editPlayerId === id ? null : id);
            }
          }}
          onIncrement={incrementStat}
          onDecrement={decrementStat}
        />
      </div>
    </div>
  );
}
