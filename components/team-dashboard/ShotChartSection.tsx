import { topZones } from "@/lib/shotChart";
import { SHOT_ZONES, zoneLabel } from "@/lib/shotZones";
import { HEAT_GRADIENT_CSS, heatColorForT, heatT } from "@/lib/heat";
import { ShotChartSvg } from "../ShotChartSvg";
import { pct } from "./format";
import type { TeamDashboardClientProps } from "./types";

export function ShotChartSection({ zoneStats }: Pick<TeamDashboardClientProps, "zoneStats">) {
  const zonesWithPct = SHOT_ZONES.map((zone) => {
    const stat = zoneStats[zone.id] ?? { makes: 0, attempts: 0 };
    const zonePct = stat.attempts > 0 ? stat.makes / stat.attempts : 0;
    return { zone, stat, pct: zonePct };
  });
  const sampled = zonesWithPct.filter((z) => z.stat.attempts > 0);
  const minPct = sampled.length > 0 ? Math.min(...sampled.map((z) => z.pct)) : 0;
  const maxPct = sampled.length > 0 ? Math.max(...sampled.map((z) => z.pct)) : 1;
  const { bestZoneId, bestZoneStat, worstZoneId, worstZoneStat } = topZones(zoneStats);

  const ranked = [...zonesWithPct].sort((a, b) => b.pct - a.pct);

  return (
    <section className="border-b border-white/[0.13] py-14">
      <div className="mb-9 flex items-baseline justify-between gap-8">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">Shot chart</h2>
        <div className="flex items-center gap-[18px]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">
            {sampled.length > 0 ? `${Math.round(minPct * 100)}% FG` : "—"}
          </span>
          <span className="h-2 w-[180px] rounded-sm" style={{ background: HEAT_GRADIENT_CSS }} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">
            {sampled.length > 0 ? `${Math.round(maxPct * 100)}% FG` : "—"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-14">
        <ShotChartSvg zoneStats={zoneStats} />

        <div>
          <div>
            {ranked.map(({ zone, stat, pct: zonePct }) => {
              const t = heatT(zonePct, minPct, maxPct);
              return (
                <div
                  key={zone.id}
                  className="grid grid-cols-[96px_minmax(0,1fr)_48px] items-center gap-3 border-b border-white/[0.09] py-[9px]"
                >
                  <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">
                    {zoneLabel(zone.id)}
                  </span>
                  <span className="h-1.5 rounded-sm bg-white/[0.07]">
                    <span
                      className="block h-1.5 rounded-sm"
                      style={{ width: `${zonePct * 100}%`, background: heatColorForT(t) }}
                    />
                  </span>
                  <span className="text-right text-[12px] font-semibold tabular-nums text-white">
                    {stat.attempts > 0 ? pct(zonePct) : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {bestZoneId && bestZoneStat && worstZoneId && worstZoneStat && (
            <p className="mt-5 font-[family-name:var(--font-serif)] text-[17px] italic leading-[1.5] text-white/60">
              Best value inside: {zoneLabel(bestZoneId)} at {pct(bestZoneStat.makes / bestZoneStat.attempts)}.{" "}
              {zoneLabel(worstZoneId)} is the leak — {pct(worstZoneStat.makes / worstZoneStat.attempts)} on volume
              worth cutting.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
