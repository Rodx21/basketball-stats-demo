import type { BoxScoreLine } from "./types";

const safeDiv = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : numerator / denominator;

export const fgPct = (l: Pick<BoxScoreLine, "fgm" | "fga">) => safeDiv(l.fgm, l.fga);

export const fg3Pct = (l: Pick<BoxScoreLine, "fg3m" | "fg3a">) => safeDiv(l.fg3m, l.fg3a);

export const ftPct = (l: Pick<BoxScoreLine, "ftm" | "fta">) => safeDiv(l.ftm, l.fta);

/** effective FG% — pesa a cesta de 3 corretamente */
export const efgPct = (l: Pick<BoxScoreLine, "fgm" | "fg3m" | "fga">) =>
  safeDiv(l.fgm + 0.5 * l.fg3m, l.fga);

/** true shooting % — melhor métrica única de eficiência ofensiva */
export const tsPct = (l: Pick<BoxScoreLine, "pts" | "fga" | "fta">) =>
  safeDiv(l.pts, 2 * (l.fga + 0.44 * l.fta));

/** Zero turnovers means the ratio is technically undefined (not a bad "0.00") —
 * fall back to the assist count itself so a clean game reads as a strong number. */
export const astToTov = (l: Pick<BoxScoreLine, "ast" | "tov">) =>
  l.tov === 0 ? l.ast : l.ast / l.tov;

export const tovPct = (l: Pick<BoxScoreLine, "fga" | "fta" | "tov">) =>
  safeDiv(l.tov, l.fga + 0.44 * l.fta + l.tov);

/** Game Score (Hollinger) — "nota do jogo" por jogador, sem precisar de médias de liga.
 * ~10 é média, 20+ é ótima, 40+ é histórica. */
export const gameScore = (
  l: Pick<
    BoxScoreLine,
    "pts" | "fgm" | "fga" | "fta" | "ftm" | "oreb" | "dreb" | "stl" | "ast" | "blk" | "pf" | "tov"
  >
) =>
  l.pts +
  0.4 * l.fgm -
  0.7 * l.fga -
  0.4 * (l.fta - l.ftm) +
  0.7 * l.oreb +
  0.3 * l.dreb +
  l.stl +
  0.7 * l.ast +
  0.7 * l.blk -
  0.4 * l.pf -
  l.tov;

export { safeDiv };
