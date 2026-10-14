/** Shared FG% heat ramp — cold blue to hot gold through a warm midpoint,
 * used by every shot-chart zone (dashboard and player). */

const COLD = { r: 23, g: 70, b: 162 }; // #1746a2
const MID = { r: 143, g: 124, b: 83 }; // #8f7c53
const HOT = { r: 242, g: 183, b: 5 }; // #f2b705

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

/** Normalized position (0..1) of `pct` between `min` and `max`, guarding a zero denominator. */
export function heatT(pct: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return Math.max(0, Math.min(1, (pct - min) / (max - min)));
}

export function heatColorForT(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const [a, b, u] = clamped <= 0.5 ? [COLD, MID, clamped / 0.5] : [MID, HOT, (clamped - 0.5) / 0.5];
  return `rgb(${lerp(a.r, b.r, u)},${lerp(a.g, b.g, u)},${lerp(a.b, b.b, u)})`;
}

/** Label ink for a fill at position `t` on the ramp. */
export function heatInk(t: number): string {
  return t > 0.62 ? "#111111" : "#ffffff";
}

export const HEAT_GRADIENT_CSS = "linear-gradient(90deg,#1746a2 0%,#8f7c53 50%,#f2b705 100%)";
