import { pct, signed } from "./format";
import type { TeamDashboardClientProps } from "./types";

export function Hero({
  seasonName,
  record,
  netRating,
  lastFive,
  gamesPlayed,
  pointsForPerGame,
  pointsAgainstPerGame,
  teamFgPct,
  bestMargin,
}: Pick<
  TeamDashboardClientProps,
  | "seasonName"
  | "record"
  | "netRating"
  | "lastFive"
  | "gamesPlayed"
  | "pointsForPerGame"
  | "pointsAgainstPerGame"
  | "teamFgPct"
  | "bestMargin"
>) {
  const rightRows: [string, string][] = [
    ["Games played", String(gamesPlayed)],
    ["Points for / gm", pointsForPerGame.toFixed(1)],
    ["Points against / gm", pointsAgainstPerGame.toFixed(1)],
    ["Team FG%", pct(teamFgPct)],
    ["Best margin", bestMargin > 0 ? `+${bestMargin}` : String(bestMargin)],
  ];

  return (
    <section className="grid grid-cols-[minmax(0,1fr)_380px] items-end gap-16 border-b border-white/[0.13] pt-16 pb-12">
      <div>
        <p className="mb-5 font-[family-name:var(--font-serif)] text-[22px] italic text-white/60">
          National League — {seasonName}
        </p>
        <h1 className="text-[88px] font-bold uppercase leading-[0.92] tracking-[0.03em] text-white">
          Season
          <br />
          to date
        </h1>
        <div className="mt-9 flex flex-wrap items-baseline gap-10">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Record</div>
            <div className="text-[56px] font-bold tabular-nums text-brand-gold">
              {record.wins}–{record.losses}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Net rating</div>
            <div className="text-[56px] font-bold tabular-nums text-white">{signed(netRating)}</div>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
              Last five
            </div>
            <div className="flex gap-2">
              {lastFive.map((g) => (
                <div
                  key={g.gameId}
                  title={`${g.opponentName} — ${g.us}–${g.them}`}
                  className={`flex h-[34px] w-[34px] items-center justify-center rounded text-[11px] font-bold tracking-[0.06em] ${
                    g.win
                      ? "border border-brand-gold bg-brand-gold text-[#111]"
                      : "border border-white/24 text-white/55"
                  }`}
                >
                  {g.win ? "W" : "L"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        {rightRows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between border-b border-white/[0.13] py-3.5"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/45">
              {label}
            </span>
            <span className="text-[22px] font-semibold tabular-nums text-white">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
