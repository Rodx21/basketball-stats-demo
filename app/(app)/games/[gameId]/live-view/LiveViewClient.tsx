"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { LiveBoxScoreTable } from "@/components/LiveBoxScoreTable";
import { type StatLine } from "@/lib/events";

interface Player {
  id: string;
  full_name: string;
  jersey_number: number | null;
}

interface TeamData {
  id: string;
  name: string;
  players: Player[];
}

export function LiveViewClient({
  gameId,
  status,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  initialStats,
}: {
  gameId: string;
  status: string;
  homeTeam: TeamData;
  awayTeam: TeamData;
  homeScore: number;
  awayScore: number;
  initialStats: Record<string, StatLine>;
}) {
  const supabase = createClient();
  const [gameStatus, setGameStatus] = useState(status);
  const [home, setHome] = useState(homeScore);
  const [away, setAway] = useState(awayScore);
  const [stats, setStats] = useState<Record<string, StatLine>>(initialStats);

  useEffect(() => {
    const channel = supabase
      .channel(`game-view-${gameId}`)
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

  return (
    <div className="space-y-6">
      <Card className="text-center">
        <StatusBadge status={gameStatus} />
        <p className="mt-2 text-3xl font-bold">
          {homeTeam.name} <span className="text-brand-gold">{home}</span>
          <span className="mx-3 text-white/30">–</span>
          <span className="text-brand-gold">{away}</span> {awayTeam.name}
        </p>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">{homeTeam.name}</h2>
        <LiveBoxScoreTable teamName={homeTeam.name} players={homeTeam.players} stats={stats} />
      </div>
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">{awayTeam.name}</h2>
        <LiveBoxScoreTable teamName={awayTeam.name} players={awayTeam.players} stats={stats} />
      </div>
    </div>
  );
}
