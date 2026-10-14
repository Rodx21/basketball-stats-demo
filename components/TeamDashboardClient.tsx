import { Hero } from "./team-dashboard/Hero";
import { Momentum } from "./team-dashboard/Momentum";
import { TeamRatings } from "./team-dashboard/TeamRatings";
import { Lineups } from "./team-dashboard/Lineups";
import { ShotChartSection } from "./team-dashboard/ShotChartSection";
import { Leaderboard } from "./team-dashboard/Leaderboard";
import { HeadToHead } from "./team-dashboard/HeadToHead";
import { SeasonTable } from "./team-dashboard/SeasonTable";
import type { TeamDashboardClientProps } from "./team-dashboard/types";

export type { TeamDashboardClientProps };

export function TeamDashboardClient({
  seasonName,
  record,
  netRating,
  lastFive,
  gamesPlayed,
  pointsForPerGame,
  pointsAgainstPerGame,
  teamFgPct,
  bestMargin,
  gameMargins,
  quarters,
  teamRatings,
  lineups,
  zoneStats,
  seasonStats,
}: TeamDashboardClientProps) {
  return (
    <div className="mx-auto max-w-[1280px]">
      <Hero
        seasonName={seasonName}
        record={record}
        netRating={netRating}
        lastFive={lastFive}
        gamesPlayed={gamesPlayed}
        pointsForPerGame={pointsForPerGame}
        pointsAgainstPerGame={pointsAgainstPerGame}
        teamFgPct={teamFgPct}
        bestMargin={bestMargin}
      />
      <Momentum gameMargins={gameMargins} quarters={quarters} />
      <TeamRatings teamRatings={teamRatings} />
      <Lineups lineups={lineups} />
      <ShotChartSection zoneStats={zoneStats} />
      <Leaderboard seasonStats={seasonStats} />
      <HeadToHead seasonStats={seasonStats} />
      <SeasonTable seasonStats={seasonStats} />
    </div>
  );
}
