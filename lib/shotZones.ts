export interface ShotZone {
  id: string;
  label: string;
  points: 2 | 3;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Coordinates are in a 0..500 (x) by 0..420 (y) half-court viewBox, baseline at y=420.
 * The inner lane (paint/layup/dunk) is 140 wide and the elbow/wing column 110, so the
 * narrowest zones still have enough room for their label without crowding a neighbor.
 */
export const SHOT_ZONES: ShotZone[] = [
  { id: "top3", label: "TOP", points: 3, x: 180, y: 0, width: 140, height: 200 },
  { id: "wing3_left", label: "45", points: 3, x: 70, y: 40, width: 110, height: 160 },
  { id: "wing3_right", label: "45", points: 3, x: 320, y: 40, width: 110, height: 160 },
  { id: "corner3_left", label: "CORNER", points: 3, x: 0, y: 200, width: 70, height: 220 },
  { id: "corner3_right", label: "CORNER", points: 3, x: 430, y: 200, width: 70, height: 220 },
  { id: "elbow_left", label: "ELBOW", points: 2, x: 70, y: 200, width: 110, height: 140 },
  { id: "elbow_right", label: "ELBOW", points: 2, x: 320, y: 200, width: 110, height: 140 },
  { id: "box_left", label: "BOX", points: 2, x: 70, y: 340, width: 110, height: 80 },
  { id: "box_right", label: "BOX", points: 2, x: 320, y: 340, width: 110, height: 80 },
  { id: "paint_left", label: "PAINT", points: 2, x: 180, y: 200, width: 70, height: 120 },
  { id: "paint_right", label: "PAINT", points: 2, x: 250, y: 200, width: 70, height: 120 },
  { id: "layup_left", label: "LAYUP", points: 2, x: 180, y: 320, width: 70, height: 60 },
  { id: "layup_right", label: "LAYUP", points: 2, x: 250, y: 320, width: 70, height: 60 },
  { id: "dunk_left", label: "DUNK", points: 2, x: 180, y: 380, width: 70, height: 40 },
  { id: "dunk_right", label: "DUNK", points: 2, x: 250, y: 380, width: 70, height: 40 },
];

export function zonePoints(zoneId: string): 2 | 3 {
  return SHOT_ZONES.find((z) => z.id === zoneId)?.points ?? 2;
}

export function zoneLabel(zoneId: string): string {
  const zone = SHOT_ZONES.find((z) => z.id === zoneId);
  if (!zone) return zoneId;
  const side = zoneId.endsWith("_left") ? "L" : zoneId.endsWith("_right") ? "R" : "";
  return side ? `${zone.label} ${side}` : zone.label;
}

/**
 * Full-court layout: the same 15 canonical zones, mirrored onto both baskets.
 * Court side ("left"/"right" basket) is a pure UI/selection concept — the stored
 * `shot_zone` value is always one of the 15 canonical ids from SHOT_ZONES, so the
 * schema and aggregation code never need to know about court side.
 */
export const FULL_COURT_HALF_DEPTH = 420;
export const FULL_COURT_GAP = 80;
export const FULL_COURT_HEIGHT = 500;
export const FULL_COURT_WIDTH = FULL_COURT_HALF_DEPTH * 2 + FULL_COURT_GAP;

export type CourtSide = "left" | "right";

export interface FullCourtZone extends ShotZone {
  side: CourtSide;
}

export const FULL_COURT_ZONES: FullCourtZone[] = SHOT_ZONES.flatMap((zone) => [
  {
    ...zone,
    side: "left" as const,
    x: FULL_COURT_HALF_DEPTH - (zone.y + zone.height),
    y: zone.x,
    width: zone.height,
    height: zone.width,
  },
  {
    ...zone,
    side: "right" as const,
    x: FULL_COURT_HALF_DEPTH + FULL_COURT_GAP + zone.y,
    y: zone.x,
    width: zone.height,
    height: zone.width,
  },
]);
