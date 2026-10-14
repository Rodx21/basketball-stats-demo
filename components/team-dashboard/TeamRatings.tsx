import { pct, signed } from "./format";
import type { TeamDashboardClientProps } from "./types";

export function TeamRatings({ teamRatings }: Pick<TeamDashboardClientProps, "teamRatings">) {
  const { pace, offRating, defRating, reboundDiffPerGame, orebPct, drebPct } = teamRatings;
  const netRtg = offRating - defRating;

  const tiles: { label: string; value: string; hint: string; gold: boolean }[] = [
    { label: "Pace", value: pace.toFixed(1), hint: "Estimated possessions / gm", gold: false },
    { label: "ORTG", value: offRating.toFixed(1), hint: "Points scored / 100 poss.", gold: netRtg > 0 },
    { label: "DRTG", value: defRating.toFixed(1), hint: "Points allowed / 100 poss.", gold: netRtg > 0 },
    { label: "Net RTG", value: signed(netRtg), hint: "ORTG minus DRTG", gold: netRtg > 0 },
    {
      label: "Reb. diff",
      value: signed(reboundDiffPerGame),
      hint: "Total rebounds, us minus them, / gm",
      gold: reboundDiffPerGame > 0,
    },
    { label: "OREB%", value: pct(orebPct), hint: "Share of our missed shots we recover", gold: orebPct > 0.3 },
    { label: "DREB%", value: pct(drebPct), hint: "Share of their misses we recover", gold: drebPct > 0.7 },
  ];

  return (
    <section className="border-b border-white/[0.13] py-14">
      <div className="mb-9 flex items-baseline justify-between gap-8">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">Team ratings</h2>
        <p className="max-w-[520px] text-right text-[13px] leading-[1.6] text-white/45">
          Pace-adjusted — how many points we score and allow per 100 estimated possessions, not just per game.
        </p>
      </div>

      <div className="grid grid-cols-7 gap-x-8">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-1.5 border-t border-white/[0.13] pt-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{tile.label}</span>
            <span className={`text-[28px] font-bold leading-none tabular-nums ${tile.gold ? "text-brand-gold" : "text-white"}`}>
              {tile.value}
            </span>
            <span className="text-[11px] leading-tight text-white/40">{tile.hint}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
