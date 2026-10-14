"use client";

import {
  FULL_COURT_GAP,
  FULL_COURT_HALF_DEPTH,
  FULL_COURT_HEIGHT,
  FULL_COURT_WIDTH,
  FULL_COURT_ZONES,
  zoneLabel,
  type CourtSide,
} from "@/lib/shotZones";

const MID_Y = FULL_COURT_HEIGHT / 2;
const CENTER_X = FULL_COURT_HALF_DEPTH + FULL_COURT_GAP / 2;
const RIGHT_BASELINE = FULL_COURT_WIDTH;

const LINE = "rgba(255,255,255,0.45)";

function BasketEnd({ side }: { side: CourtSide }) {
  const flip = side === "left" ? 1 : -1;
  const base = side === "left" ? 0 : RIGHT_BASELINE;
  const key = side === "left" ? FULL_COURT_HALF_DEPTH - 220 : RIGHT_BASELINE - FULL_COURT_HALF_DEPTH + 220;
  const ftLineX = base + flip * 220;
  const hoopX = base + flip * 20;
  const threeX = base + flip * 215;

  return (
    <g fill="none" stroke={LINE} strokeWidth={2} className="pointer-events-none">
      <rect x={Math.min(key, base)} y={MID_Y - 70} width={220} height={140} />
      <path
        d={`M${ftLineX},${MID_Y - 70} A70,70 0 0 ${side === "left" ? 0 : 1} ${ftLineX},${MID_Y + 70}`}
      />
      <path
        d={`M${ftLineX},${MID_Y - 70} A70,70 0 0 ${side === "left" ? 1 : 0} ${ftLineX},${MID_Y + 70}`}
        strokeDasharray="6 6"
      />
      <path d={`M${hoopX},${MID_Y - 38} A38,38 0 0 ${side === "left" ? 1 : 0} ${hoopX},${MID_Y + 38}`} />
      <line x1={base + flip * 24} y1={MID_Y - 30} x2={base + flip * 24} y2={MID_Y + 30} strokeWidth={3} />
      <circle cx={hoopX} cy={MID_Y} r={9} />
      <path
        d={`M${base},${MID_Y - 220} L${threeX},${MID_Y - 220} A220,220 0 0 ${side === "left" ? 1 : 0} ${threeX},${MID_Y + 220} L${base},${MID_Y + 220}`}
      />
    </g>
  );
}

export function CourtDiagram({
  selectedZone,
  onSelect,
}: {
  selectedZone: { zoneId: string; side: CourtSide } | null;
  onSelect: (zoneId: string, side: CourtSide) => void;
}) {
  return (
    <svg
      viewBox={`0 0 ${FULL_COURT_WIDTH} ${FULL_COURT_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Court — tap a zone to record the shot location and attacking team"
      className="mx-auto block w-full max-w-2xl select-none touch-manipulation rounded shadow-inner"
      style={{ aspectRatio: `${FULL_COURT_WIDTH} / ${FULL_COURT_HEIGHT}`, touchAction: "manipulation" }}
    >
      <rect x="0" y="0" width={FULL_COURT_WIDTH} height={FULL_COURT_HEIGHT} fill="#071227" rx="4" />

      {FULL_COURT_ZONES.map((zone) => {
        const selected = selectedZone?.zoneId === zone.id && selectedZone.side === zone.side;
        return (
          <g
            key={`${zone.side}-${zone.id}`}
            onClick={() => onSelect(zone.id, zone.side)}
            className="cursor-pointer"
          >
            <rect
              x={zone.x}
              y={zone.y}
              width={zone.width}
              height={zone.height}
              fill={selected ? "rgba(242,183,5,0.72)" : "rgba(255,255,255,0.02)"}
              stroke={selected ? "#f2b705" : "rgba(255,255,255,0.14)"}
              strokeWidth={selected ? 2.5 : 1}
            />
            <text
              x={zone.x + zone.width / 2}
              y={zone.y + zone.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fontWeight={700}
              letterSpacing="0.08em"
              fill={selected ? "#05070d" : "rgba(255,255,255,0.5)"}
              className="pointer-events-none"
            >
              {zoneLabel(zone.id)}
            </text>
          </g>
        );
      })}

      <g fill="none" stroke={LINE} strokeWidth={2} className="pointer-events-none">
        <rect x="3" y="3" width={FULL_COURT_WIDTH - 6} height={FULL_COURT_HEIGHT - 6} rx="4" />
        <line x1={CENTER_X} y1="3" x2={CENTER_X} y2={FULL_COURT_HEIGHT - 3} />
        <circle cx={CENTER_X} cy={MID_Y} r="50" />
      </g>
      <BasketEnd side="left" />
      <BasketEnd side="right" />
    </svg>
  );
}
