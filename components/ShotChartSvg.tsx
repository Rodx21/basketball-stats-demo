import { SHOT_ZONES, zoneLabel } from "@/lib/shotZones";
import type { ZoneStat } from "@/lib/shotChart";
import { heatColorForT, heatInk, heatT } from "@/lib/heat";

/** Half-court heat map — identical geometry, heat ramp and zone labelling for
 * both the team dashboard and a player's personal shot chart (spec B3/C4). */
export function ShotChartSvg({ zoneStats }: { zoneStats: Record<string, ZoneStat> }) {
  const zones = SHOT_ZONES.map((zone) => {
    const stat = zoneStats[zone.id] ?? { makes: 0, attempts: 0 };
    return { zone, stat, pct: stat.attempts > 0 ? stat.makes / stat.attempts : 0 };
  });
  const sampled = zones.filter((z) => z.stat.attempts > 0);
  const min = sampled.length > 0 ? Math.min(...sampled.map((z) => z.pct)) : 0;
  const max = sampled.length > 0 ? Math.max(...sampled.map((z) => z.pct)) : 1;

  return (
    <svg viewBox="0 0 500 440" className="block w-full" role="img" aria-label="Shot chart heat map">
      <rect x="0" y="0" width="500" height="440" fill="#071227" rx="4" />

      {zones.map(({ zone, pct }) => {
        const t = heatT(pct, min, max);
        return (
          <rect
            key={zone.id}
            x={zone.x}
            y={zone.y + 20}
            width={zone.width}
            height={zone.height}
            fill={heatColorForT(t)}
            stroke="#05070d"
            strokeWidth={1.5}
          />
        );
      })}

      <g fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5}>
        <rect x="1" y="1" width="498" height="438" rx="4" />
        <rect x="180" y="220" width="140" height="220" />
        <path d="M180,220 A70,70 0 0 0 320,220" />
        <path d="M250,440 m-40,0 a40,40 0 0 0 80,0" />
        <line x1="216" y1="436" x2="284" y2="436" strokeWidth={3} />
        <circle cx="250" cy="418" r="9" />
        <path d="M20,440 L20,250 Q250,20 480,250 L480,440" />
      </g>

      {zones.map(({ zone, stat, pct }) => {
        const t = heatT(pct, min, max);
        const ink = heatInk(t);
        const cx = zone.x + zone.width / 2;
        const cy = zone.y + 20 + zone.height / 2;
        return (
          <g key={zone.id} className="pointer-events-none">
            <text x={cx} y={cy - 17} textAnchor="middle" fontSize={10} fontWeight={700} letterSpacing="0.08em" fill={ink} opacity={0.75}>
              {zoneLabel(zone.id)}
            </text>
            <text x={cx} y={cy + 3} textAnchor="middle" fontSize={15} fontWeight={700} fill={ink}>
              {stat.attempts > 0 ? `${Math.round(pct * 100)}%` : "—"}
            </text>
            <text x={cx} y={cy + 18} textAnchor="middle" fontSize={9} fontWeight={500} fill={ink} opacity={0.6}>
              {stat.makes}/{stat.attempts}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
